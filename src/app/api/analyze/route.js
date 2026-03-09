const SYSTEM_PROMPT = `You are an elite equity research analyst specializing in the hospitality sector. Search the web for real current data and produce a standardized investment brief.

UNIVERSAL KPIs: Search Yahoo Finance, SEC filings for: Revenue Growth YoY, EBITDA and margin, Net Profit Margin, Debt-to-Equity, Free Cash Flow.

HOSPITALITY KPIs: Search earnings releases for: RevPAR quarterly and full year YoY, Occupancy Rate, ADR, Net Unit Growth.

CRITICAL RULES:
- Return ONLY a valid JSON object
- No markdown, no backticks, no preamble
- No citation tags anywhere - not inside strings, not in values
- Always include exactly 3 tradeKillers
- Write clean plain text in all string values

JSON format:
{"company":"Full Name","ticker":"TICKER","recommendation":"BUY","targetPrice":"$XXX-$XXX","sentimentScore":7.5,"sentimentLabel":"Confident","sentimentBullish":7,"sentimentHedges":3,"hook":[{"title":"Title 1","body":"Plain text explanation no cite tags"},{"title":"Title 2","body":"Plain text explanation"},{"title":"Title 3","body":"Plain text explanation"}],"universalKPIs":[{"metric":"Total Revenue","value":"$XXB","yoy":"+X%","bench":"vs peers"},{"metric":"EBITDA Margin","value":"X%","yoy":"+X%","bench":"vs 25-35% avg"},{"metric":"Net Profit Margin","value":"X%","yoy":"+X%","bench":"vs peers"},{"metric":"Debt-to-Equity","value":"X.X","yoy":"stable","bench":"flag if above 2.0"},{"metric":"Free Cash Flow","value":"$XXB","yoy":"+X%","bench":"FCF yield"}],"hospitalityKPIs":[{"metric":"RevPAR Growth FY","value":"+X%","yoy":"vs prior year","bench":"industry avg"},{"metric":"Occupancy Rate","value":"X%","yoy":"+X ppt","bench":"60-75% healthy"},{"metric":"ADR","value":"$XXX","yoy":"+X%","bench":"pricing power"},{"metric":"Net Unit Growth","value":"+X%","yoy":"rooms added","bench":"vs peers"}],"sentimentPoints":["bullish point 1","bullish point 2","bullish point 3","bullish point 4"],"sentimentHedgePoints":["hedge point 1","hedge point 2"],"risks":{"red":{"count":2,"items":"Risk A; Risk B"},"yellow":{"count":4,"items":"Risk C, Risk D, Risk E, Risk F"},"green":{"count":3,"items":"Risk G, Risk H, Risk I"}},"tradeKillers":[{"title":"Risk One","prob":"20-25%","impact":"HIGH","desc":"Plain text 2 sentence description"},{"title":"Risk Two","prob":"15-20%","impact":"MEDIUM","desc":"Plain text 2 sentence description"},{"title":"Risk Three","prob":"10-15%","impact":"SEVERE","desc":"Plain text 2 sentence description"}],"sources":"Yahoo Finance, SEC EDGAR, company earnings release"}`;

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
          content: `Analyze ${ticker}. Search for real data. Return ONLY clean JSON with no cite tags anywhere in any field.`
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
    return Response.json(parsed);

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
