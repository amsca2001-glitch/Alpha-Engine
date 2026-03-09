const SYSTEM_PROMPT = `You are an elite equity research analyst specializing in the hospitality sector. When given a company ticker, automatically search the web and collect data to produce a standardized investment brief.

UNIVERSAL KPIs: Search Yahoo Finance, SEC filings for: Revenue Growth YoY, EBITDA and margin, Net Profit Margin, Debt-to-Equity, Free Cash Flow.

HOSPITALITY KPIs: Search earnings releases for: RevPAR quarterly and full year YoY, Occupancy Rate, ADR Average Daily Rate, Net Unit Growth.

Respond ONLY with a valid JSON object, no markdown, no backticks:
{"company":"Full Name","ticker":"TICKER","recommendation":"BUY","targetPrice":"$XXX-$XXX","sentimentScore":7.5,"sentimentLabel":"Confident","sentimentBullish":6,"sentimentHedges":3,"hook":[{"title":"Title 1","body":"Explanation"},{"title":"Title 2","body":"Explanation"},{"title":"Title 3","body":"Explanation"}],"universalKPIs":[{"metric":"Revenue","value":"$XXB","yoy":"+X%","bench":"peers"}],"hospitalityKPIs":[{"metric":"RevPAR","value":"+X%","yoy":"vs prior","bench":"industry"}],"sentimentPoints":["point 1","point 2","point 3"],"sentimentHedgePoints":["hedge 1","hedge 2"],"risks":{"red":{"count":2,"items":"Risk A; Risk B"},"yellow":{"count":5,"items":"Risk C, D, E"},"green":{"count":3,"items":"Risk H, I, J"}},"tradeKillers":[{"title":"Risk","prob":"20-25%","impact":"HIGH","desc":"Description"}],"sources":"Source 1, Source 2"}`;

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: `Analyze hospitality company ticker: ${ticker}. Return full Alpha Brief as JSON only.` }]
      })
    });
    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });
    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1) return Response.json({ error: "No JSON found" }, { status: 500 });
    const parsed = JSON.parse(clean.slice(start, end + 1));
    return Response.json(parsed);
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
