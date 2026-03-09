const SYSTEM_PROMPT = `You are an elite equity research analyst specializing in the hospitality sector. When given a company ticker, search the web to collect real, current data and produce a standardized investment brief.

UNIVERSAL KPIs: Search Yahoo Finance, SEC filings, investor relations for:
- Revenue Growth YoY (2-3 year history)
- EBITDA and EBITDA margin (benchmark against hospitality average 25-35%)
- Net Profit Margin (compare to 2-3 named peers)
- Debt-to-Equity ratio (flag if above 2.0)
- Free Cash Flow

HOSPITALITY KPIs: Search earnings releases and investor presentations for:
- RevPAR (quarterly + full year + YoY change)
- Occupancy Rate (quarterly + full year + YoY, healthy range 60-75%)
- ADR Average Daily Rate (quarterly + full year + YoY)
- Net Unit Growth % (asset-light vs owned split, pipeline outlook)

Respond ONLY with a valid JSON object, no markdown, no backticks:
{"company":"Full Name","ticker":"TICKER","recommendation":"BUY","targetPrice":"$XXX-$XXX","sentimentScore":7.5,"sentimentLabel":"Confident","sentimentBullish":6,"sentimentHedges":3,"hook":[{"title":"Title 1","body":"Explanation"},{"title":"Title 2","body":"Explanation"},{"title":"Title 3","body":"Explanation"}],"universalKPIs":[{"metric":"Total Revenue","value":"$XXB","yoy":"+X%","bench":"peers"}],"hospitalityKPIs":[{"metric":"RevPAR Growth (FY)","value":"+X%","yoy":"vs prior","bench":"industry"}],"sentimentPoints":["point 1","point 2","point 3"],"sentimentHedgePoints":["hedge 1","hedge 2"],"risks":{"red":{"count":2,"items":"Risk A; Risk B"},"yellow":{"count":5,"items":"Risk C, D, E"},"green":{"count":3,"items":"Risk H, I, J"}},"tradeKillers":[{"title":"Risk","prob":"20-25%","impact":"HIGH","desc":"Description"}],"sources":"Exact sources used"}`;

export async function POST(req) {
  try {
    const { ticker } = await req.json();

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
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [{ 
          type: "web_search_20250305", 
          name: "web_search",
          max_uses: 5
        }],
        messages: [{ 
          role: "user", 
          content: `Search the web and analyze hospitality company ticker: ${ticker}. Find real current KPI data from SEC filings, Yahoo Finance, and earnings releases. Return ONLY the JSON object.` 
        }]
      })
    });

    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });
    
    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1) return Response.json({ error: "No JSON: " + text.slice(0, 200) }, { status: 500 });
    
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Response.json(parsed);

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
