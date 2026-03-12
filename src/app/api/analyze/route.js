const SYSTEM_PROMPT = `You are an elite equity research analyst for hospitality stocks. You will be given real financial data fetched from primary sources. Use this data as ground truth for General KPIs. Use web search ONLY to find FY2025 data from the company's official earnings release or investor relations page. Return ONLY a JSON object, no markdown, no backticks, no cite tags.

{"company":"Full Name","ticker":"TICKER","recommendation":"BUY","targetPrice":"$XXX-$XXX","background":"2-3 sentence company description.","sentimentScore":7.5,"sentimentLabel":"Confident","sentimentBullish":6,"sentimentHedges":3,"hook":[{"title":"T1","body":"explanation"},{"title":"T2","body":"explanation"},{"title":"T3","body":"explanation"}],"generalKPIs":[{"metric":"Revenue Growth (YoY)","value":"$XXB (+X%)","yoy":"+X%","industryAvg":"Sector avg +X%","signal":"Strong"},{"metric":"EBITDA & Margin","value":"$XXB (XX%)","yoy":"+X%","industryAvg":"Avg 25-35%","signal":"Strong"},{"metric":"Net Profit Margin","value":"X%","yoy":"+X%","industryAvg":"Peers avg X%","signal":"Neutral"},{"metric":"Debt-to-Equity","value":"X.X","yoy":"stable","industryAvg":"Flag if >2.0","signal":"Neutral"}],"hospitalityKPIs":[{"metric":"RevPAR Growth (FY)","value":"+X%","yoy":"vs prior","industryAvg":"Industry +X%","signal":"Strong"},{"metric":"Occupancy Rate","value":"XX%","yoy":"+X ppt","industryAvg":"Healthy 60-75%","signal":"Strong"},{"metric":"ADR","value":"$XXX","yoy":"+X%","industryAvg":"Segment avg $XXX","signal":"Strong"},{"metric":"Net Unit Growth","value":"+X%","yoy":"rooms added","industryAvg":"Peers +X%","signal":"Strong"}],"sentimentPoints":["point 1","point 2","point 3"],"sentimentHedgePoints":["hedge 1","hedge 2"],"risks":{"red":{"count":2,"items":"Risk A; Risk B"},"yellow":{"count":4,"items":"Risk C, D, E, F"},"green":{"count":3,"items":"Risk G, H, I"}},"tradeKillers":[{"title":"Risk 1","prob":"20-25%","impact":"HIGH","desc":"2 sentence description."},{"title":"Risk 2","prob":"15-20%","impact":"MEDIUM","desc":"2 sentence description."},{"title":"Risk 3","prob":"10-15%","impact":"SEVERE","desc":"2 sentence description."}],"sources":"SEC EDGAR 10-K, Yahoo Finance API, Company IR Q4 2025 Earnings Release"}`;

async function getYahooFinanceData(ticker) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose;
    const change = ((price - prev) / prev * 100).toFixed(2);
    return {
      sharePrice: `$${price.toFixed(2)}`,
      sharePriceChange: `${change > 0 ? "+" : ""}${change}%`,
    };
  } catch(e) { return null; }
}

async function getSecFinancials(ticker) {
  try {
    // Step 1: find CIK via SEC EDGAR company search
    const tickerRes = await fetch(
      `https://www.sec.gov/cgi-bin/browse-edgar?company=&CIK=${ticker}&type=10-K&dateb=&owner=include&count=5&search_text=&action=getcompany&output=atom`,
      { headers: { "User-Agent": "hospitality-alpha-engine admin@example.com" } }
    );
    const tickerText = await tickerRes.text();
    const cikMatch = tickerText.match(/CIK=(\d+)/);
    if (!cikMatch) return null;
    const cik = cikMatch[1].padStart(10, "0");

    // Step 2: get company facts from SEC XBRL API
    const factsRes = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: { "User-Agent": "hospitality-alpha-engine admin@example.com" } }
    );
    const facts = await factsRes.json();
    const us_gaap = facts?.facts?.["us-gaap"];
    if (!us_gaap) return null;

    // Extract Revenue — try multiple GAAP keys
    const revenueKey =
      us_gaap.Revenues ||
      us_gaap.RevenueFromContractWithCustomerExcludingAssessedTax ||
      us_gaap.SalesRevenueNet ||
      us_gaap.RevenueFromContractWithCustomerIncludingAssessedTax;

    const revenues = revenueKey?.units?.USD
      ?.filter(r => r.form === "10-K" && r.fp === "FY")
      .sort((a, b) => b.end.localeCompare(a.end));

    const latestRev = revenues?.[0];
    const prevRev = revenues?.[1];

    // Extract Net Income
    const netIncomeData = us_gaap.NetIncomeLoss?.units?.USD
      ?.filter(r => r.form === "10-K" && r.fp === "FY")
      .sort((a, b) => b.end.localeCompare(a.end));
    const latestNI = netIncomeData?.[0];

    // Extract Debt and Equity
    const debtData = us_gaap.LongTermDebt?.units?.USD
      ?.filter(r => r.form === "10-K")
      .sort((a, b) => b.end.localeCompare(a.end));
    const equityData = (us_gaap.StockholdersEquity || us_gaap.StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest)?.units?.USD
      ?.filter(r => r.form === "10-K")
      .sort((a, b) => b.end.localeCompare(a.end));

    const result = {};

    if (latestRev) {
      result.revenueYear = latestRev.end?.slice(0, 4);
      result.revenue = `$${(latestRev.val / 1e9).toFixed(2)}B`;
      if (prevRev) {
        const growth = (((latestRev.val - prevRev.val) / prevRev.val) * 100).toFixed(1);
        result.revenueGrowth = `${parseFloat(growth) > 0 ? "+" : ""}${growth}%`;
        result.prevRevenue = `$${(prevRev.val / 1e9).toFixed(2)}B`;
        result.prevRevenueYear = prevRev.end?.slice(0, 4);
      }
    }

    if (latestNI && latestRev) {
      const margin = ((latestNI.val / latestRev.val) * 100).toFixed(1);
      result.netProfitMargin = `${margin}%`;
      result.netIncome = `$${(latestNI.val / 1e9).toFixed(2)}B`;
    }

    if (debtData?.[0] && equityData?.[0] && equityData[0].val !== 0) {
      const de = Math.abs(debtData[0].val / equityData[0].val).toFixed(2);
      result.debtToEquity = de;
      result.debtToEquityFlag = parseFloat(de) > 2.0 ? "Above 2.0 — flagged" : "Below 2.0";
    }

    return result;
  } catch(e) { return null; }
}

export async function POST(req) {
  try {
    const { ticker } = await req.json();

    // Fetch from primary sources in parallel
    const [yahooData, secData] = await Promise.all([
      getYahooFinanceData(ticker),
      getSecFinancials(ticker)
    ]);

    // Build verified data context for Claude
    const dataContext = secData
      ? `VERIFIED PRIMARY SOURCE DATA from SEC EDGAR 10-K (use these exact figures):
- Revenue FY${secData.revenueYear}: ${secData.revenue} (YoY vs FY${secData.prevRevenueYear}: ${secData.revenueGrowth})
- Net Profit Margin: ${secData.netProfitMargin} (Net Income: ${secData.netIncome})
- Debt-to-Equity: ${secData.debtToEquity} (${secData.debtToEquityFlag})
- Note: EBITDA is not in GAAP filings — search the Q4 2025 earnings release for adjusted EBITDA.`
      : `SEC EDGAR data unavailable — search SEC EDGAR and company IR for all financials.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{
          role: "user",
          content: `Analyze hospitality stock: ${ticker}

${dataContext}

CRITICAL INSTRUCTIONS:
1. Use the verified SEC data above exactly as provided for Revenue, Net Profit Margin, and Debt-to-Equity
2. Today is March 2026. Search specifically for FY2025 full year results — ALL major hospitality companies (Marriott, Hilton, Hyatt, IHG, Airbnb, Wyndham) have reported Q4 2025 earnings by now
3. Search: "${ticker} Q4 2025 earnings results full year 2025"
4. Search: "${ticker} investor relations FY2025 annual results"
5. Get FY2025 adjusted EBITDA, RevPAR growth, Occupancy Rate, ADR, and Net Unit Growth from the official Q4 2025 earnings release
6. Get management sentiment from the Q4 2025 earnings call transcript

Return ONLY clean JSON with no cite tags anywhere.`
        }]
      })
    });

    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });

    const rawText = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const cleaned = rawText
      .replace(/<cite[^>]*>/g, "")
      .replace(/<\/cite>/g, "")
      .replace(/\[\d+\]/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1) return Response.json({ error: "No JSON: " + cleaned.slice(0, 200) }, { status: 500 });

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    // Always override with real-time Yahoo Finance price
    if (yahooData) {
      parsed.sharePrice = yahooData.sharePrice;
      parsed.sharePriceChange = yahooData.sharePriceChange;
    }

    return Response.json(parsed);

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
