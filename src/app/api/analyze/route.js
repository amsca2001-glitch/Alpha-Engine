const SYSTEM_PROMPT = `You are an elite equity research analyst specializing in the hospitality sector. When given a company ticker, search the web and collect data to produce a standardized investment brief.

Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation:
{"company":"Full Name","ticker":"TICKER","recommendation":"BUY","targetPrice":"$XXX-$XXX","sentimentScore":7.5,"sentimentLabel":"Confident","sentimentBullish":6,"sentimentHedges":3,"hook":[{"title":"Title 1","body":"Explanation"},{"title":"Title 2","body":"Explanation"},{"title":"Title 3","body":"Explanation"}],"universalKPIs":[{"metric":"Total Revenue","value":"$XXB","yoy":"+X%","bench":"vs peers"},{"metric":"EBITDA","value":"$XXB","yoy":"+X%","bench":"margin %"},{"metric":"Net Profit Margin","value":"X%","yoy":"+X%","bench":"vs peers"},{"metric":"Debt-to-Equity","value":"X.X","yoy":"stable","bench":"flag if >2.0"},{"metric":"Free Cash Flow","value":"$XXB","yoy":"+X%","bench":"FCF yield"}],"hospitalityKPIs":[{"metric":"RevPAR Growth (FY)","value":"+X%","yoy":"vs prior year","bench":"industry avg"},{"metric":"Occupancy Rate","value":"X%","yoy":"+X ppt","bench":"60-75% healthy"},{"metric":"ADR","value":"$XXX","yoy":"+X%","bench":"pricing power"},{"metric":"Net Unit Growth","value":"+X%","yoy":"rooms added","bench":"vs peers"}],"sentimentPoints":["point 1","point 2","point 3"],"sentimentHedgePoints":["hedge 1","hedge 2"],"risks":{"red":{"count":2,"items":"Risk A; Risk B"},"yellow":{"count":5,"items":"Risk C, D, E, F, G"},"green":{"count":3,"items":"Risk H, I, J"}},"tradeKillers":[{"title":"Risk 1","prob":"20-25%","impact":"HIGH","desc":"2 sentence description"},{"title":"Risk 2","prob":"15-20%","impact":"MEDIUM","desc":"2 sentence description"},{"title":"Risk 3","prob":"10-15%","impact":"SEVERE","desc":"2 sentence description"}],"sources":"Yahoo Finance, SEC EDGAR, Earnings Release"}`;

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
        messages: [{ 
          role: "user", 
          content: `Analyze ${ticker}. Use your knowledge of this hospitality company to fill in realistic KPI data. Return ONLY the JSON object.` 
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content?.[0]?.text || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    
    if (start === -1) {
      return Response.json({ error: "No JSON found: " + text.slice(0, 300) }, { status: 500 });
    }
    
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Response.json(parsed);

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
