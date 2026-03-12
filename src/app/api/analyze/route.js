const SYSTEM_PROMPT = `You are an elite equity research analyst for hospitality stocks. You will be given real financial data already fetched from primary sources. Use this data as ground truth for all KPIs. Only use web search to find RevPAR, Occupancy Rate, ADR, Net Unit Growth, and management sentiment from the company's official earnings release or investor relations page. Return ONLY a JSON object, no markdown, no backticks, no cite tags.

{"company":"Full Name","ticker":"TICKER","recommendation":"BUY","targetPrice":"$XXX-$XXX","background":"2-3 sentence company description.","sentimentScore":7.5,"sentimentLabel":"Confident","sentimentBullish":6,"sentimentHedges":3,"hook":[{"title":"T1","body":"explanation"},{"title":"T2","body":"explanation"},{"title":"T3","body":"explanation"}],"generalKPIs":[{"metric":"Revenue Growth (YoY)","value":"USE_PROVIDED_DATA","yoy":"USE_PROVIDED_DATA","industryAvg":"Sector avg +X%","signal":"Strong"},{"metric":"EBITDA & Margin","value":"USE_PROVIDED_DATA","yoy":"USE_PROVIDED_DATA","industryAvg":"Avg 25-35%","signal":"Strong"},{"metric":"Net Profit Margin","value":"USE_PROVIDED_DATA","yoy":"USE_PROVIDED_DATA","industryAvg":"Peers avg X%","signal":"Neutral"},{"metric":"Debt-to-Equity","value":"USE_PROVIDED_DATA","yoy":"stable","industryAvg":"Flag if >2.0","signal":"Neutral"}],"hospitalityKPIs":[{"metric":"RevPAR Growth (FY)","value":"+X%","yoy":"vs prior","industryAvg":"Industry +X%","signal":"Strong"},{"metric":"Occupancy Rate","value":"XX%","yoy":"+X ppt","industryAvg":"Healthy 60-75%","signal":"Strong"},{"metric":"ADR","value":"$XXX","yoy":"+X%","industryAvg":"Segment avg $XXX","signal":"Strong"},{"metric":"Net Unit Growth","value":"+X%","yoy":"rooms added","industryAvg":"Peers +X%","signal":"Strong"}],"sentimentPoints":["point 1","point 2","point 3"],"sentimentHedgePoints":["hedge 1","hedge 2"],"risks":{"red":{"count":2,"items":"Risk A; Risk B"},"yellow":{"count":4,"items":"Risk C, D, E, F"},"green":{"count":3,"items":"Risk G, H, I"}},"tradeKillers":[{"title":"Risk 1","prob":"20-25%","impact":"HIGH","desc":"2 sentence description."},{"title":"Risk 2","prob":"15-20%","impact":"MEDIUM","desc":"2 sentence description."},{"title":"Risk 3","prob":"10-15%","impact":"SEVERE","desc":"2 sentence description."}],"sources":"SEC EDGAR 10-K, Yahoo Finance API, Company IR Earnings Release"}`;

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
      marketCap: meta.marketCap ? `$${(meta.marketCap / 1e9).toFixed(1)}B` : null,
    };
  } catch(e) { return null; }
}

async function getSecFinancials(ticker) {
  try {
    // Step 1: get CIK from ticker
    const searchRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&dateRange=custom&startdt=2024-01-01&enddt=2025-12-31&forms=10-K`,
      { headers: { "User-Agent": "hospitality-alpha-engine contact@example.com" } }
    );
    const searchData = await searchRes.json();
    const filing = searchData?.hits?.hits?.[0];
    if (!filing) return null;

    const cik = filing._source?.entity_id?.replace("cik", "").padStart(10, "0");
    if (!cik) return null;

    // Step 2: get company facts
    const factsRes = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: { "User-Agent": "hospitality-alpha-engine contact@example.com" } }
    );
    const facts = await factsRes.json();
    const us_gaap = facts?.facts?.["us-gaap"];
    if (!us_gaap) return null;

    // Extract Revenue
    const revenueKey = us_gaap.Revenues || us_gaap.RevenueFromContractWithCustomerExcludingAssessedTax || us_gaap.SalesRevenueNet;
    const revenues = revenueKey?.units?.USD?.filter(r => r.form === "10-K" && r.fp === "FY").sort((a,b) => b.end.localeCompare(a.end));
    const latestRev = revenues?.[0];
    const prevRev = revenues?.[1];

    // Extract Net Income
    const netIncomeData = us_gaap.NetIncomeLoss?.units?.USD?.filter(r => r.form === "10-K" && r.fp === "FY").sort((a,b) => b.end.localeCompare(a.end));
    const latestNI = netIncomeData?.[0];

    // Extract Long Term Debt and Equity
    const debtData = us_gaap.LongTermDebt?.units?.USD?.filter(r => r.form === "10-K").sort((a,b) => b.end.localeCompare(a.end));
    const equityData = us_gaap.StockholdersEquity?.units?.USD?.filter(r => r.form === "10-K").sort((a,b) => b.end.localeCompare(a.end));

    const result = {};

    if (latestRev && prevRev) {
      const revB = (latestRev.val / 1e9).toFixed(2);
      const revGrowth = (((latestRev.val - prevRev.val) / prevRev.val) * 100).toFixed(1);
      result.revenue = `$${revB}B`;
      result.revenueGrowth = `${revGrowth > 0 ? "+" : ""}${revGrowth}%`;
      result.revenueYear = latestRev.end?.slice(0, 4);
    }

    if (latestNI && latestRev) {
      const margin = ((latestNI.val / latestRev.val) * 100).toFixed(1);
      result.netProfitMargin = `${margin}%`;
      result.netIncome = `$${(latestNI.val / 1e9).toFixed(2)}B`;
    }

    if (debtData?.[0] && equityData?.[0]) {
      const de = (debtData[0].val / Math.abs(equityData[0].val)).toFixed(2);
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

    // Build data context for Claude
    const dataContext = secData ? `
VERIFIED PRIMARY SOURCE DATA (use these exact figures for General KPIs):
- Revenue (FY${secData.revenueYear || "2024"}): ${secData.revenue || "not available"} (YoY: ${secData.revenueGrowth || "not available"})
- Net Profit Margin: ${secData.netProfitMargin || "not available"}
- Net Income: ${secData.netIncome || "not available"}
- Debt-to-Equity: ${secData.debtToEquity || "not available"} (${secData.debtToEquityFlag || ""})
- Source: SEC EDGAR 10-K filing (primary source)

Note: EBITDA is not directly in SEC GAAP filings — search the company's official earnings release for adjusted EBITDA.
` : "SEC data unavailable — search SEC EDGAR and company IR for all financials.";

    // Run Claude with verified data
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
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{
          role: "user",
          content: `Analyze hospitality stock ${ticker}.

${dataContext}

Use the verified data above for General KPIs exactly as provided. Search the company's official IR page or earnings release for: EBITDA, RevPAR, Occupancy Rate, ADR, Net Unit Growth, and management sentiment.

Return ONLY clean JSON, no cite tags.`
        }]
      })
    });

    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });

    const rawText = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const cleaned = rawText.replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "").replace(/\[\d+\]/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1) return Response.json({ error: "No JSON: " + cleaned.slice(0, 200) }, { status: 500 });

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    // Always override with real Yahoo Finance price
    if (yahooData) {
      parsed.sharePrice = yahooData.sharePrice;
      parsed.sharePriceChange = yahooData.sharePriceChange;
    }

    return Response.json(parsed);

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
