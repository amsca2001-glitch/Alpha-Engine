const SYSTEM_PROMPT = `You are an elite equity research analyst for hospitality stocks. Search the web for real current data and return ONLY a JSON object with no markdown, no backticks, no cite tags.

JSON format:
{"company":"Full Name","ticker":"TICKER","recommendation":"BUY","targetPrice":"$XXX-$XXX","sharePrice":"$XXX.XX","sharePriceChange":"+X.X%","background":"2-3 sentence company description.","sentimentScore":7.5,"sentimentLabel":"Confident","sentimentBullish":6,"sentimentHedges":3,"hook":[{"title":"T1","body":"explanation"},{"title":"T2","body":"explanation"},{"title":"T3","body":"explanation"}],"generalKPIs":[{"metric":"Revenue Growth (YoY)","value":"$XXB (+X%)","yoy":"+X%","industryAvg":"Sector avg +X%","signal":"Strong"},{"metric":"EBITDA & Margin","value":"$XXB (XX%)","yoy":"+X%","industryAvg":"Avg 25-35%","signal":"Strong"},{"metric":"Net Profit Margin","value":"X%","yoy":"+X%","industryAvg":"Peers avg X%","signal":"Neutral"},{"metric":"Debt-to-Equity","value":"X.X","yoy":"stable","industryAvg":"Flag if >2.0","signal":"Neutral"}],"hospitalityKPIs":[{"metric":"RevPAR Growth (FY)","value":"+X%","yoy":"vs prior","industryAvg":"Industry +X%","signal":"Strong"},{"metric":"Occupancy Rate","value":"XX%","yoy":"+X ppt","industryAvg":"Healthy 60-75%","signal":"Strong"},{"metric":"ADR","value":"$XXX","yoy":"+X%","industryAvg":"Segment avg $XXX","signal":"Strong"},{"metric":"Net Unit Growth","value":"+X%","yoy":"rooms added","industryAvg":"Peers +X%","signal":"Strong"}],"sentimentPoints":["point 1","point 2","point 3"],"sentimentHedgePoints":["hedge 1","hedge 2"],"risks":{"red":{"count":2,"items":"Risk A; Risk B"},"yellow":{"count":4,"items":"Risk C, D, E, F"},"green":{"count":3,"items":"Risk G, H, I"}},"tradeKillers":[{"title":"Risk 1","prob":"20-25%","impact":"HIGH","desc":"2 sentence description."},{"title":"Risk 2","prob":"15-20%","impact":"MEDIUM","desc":"2 sentence description."},{"title":"Risk 3","prob":"10-15%","impact":"SEVERE","desc":"2 sentence description."}],"sources":"Yahoo Finance, SEC EDGAR, earnings release"}`;

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
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: `Analyze ${ticker}. Return ONLY clean JSON, no cite tags.` }]
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
    return Response.json(parsed);

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
