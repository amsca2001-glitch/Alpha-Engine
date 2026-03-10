const SYSTEM_PROMPT = `You are an elite equity research analyst specializing in the hospitality sector. Search the web for real current data and produce a standardized investment brief.

Respond ONLY with a valid JSON object, no markdown, no backticks, no citation tags anywhere:

{
  "company": "Full Company Name",
  "ticker": "TICKER",
  "recommendation": "BUY",
  "targetPrice": "$XXX-$XXX",
  "sharePrice": "$XXX.XX",
  "sharePriceChange": "+X.X% today",
  "background": "2-3 sentence company background: founded, headquarters, business model, scale, what makes them unique in hospitality.",
  "sentimentScore": 7.5,
  "sentimentLabel": "Confident",
  "sentimentBullish": 6,
  "sentimentHedges": 3,
  "hook": [
    {"title": "Hook Title 1", "body": "2 sentence explanation of non-consensus insight"},
    {"title": "Hook Title 2", "body": "2 sentence explanation"},
    {"title": "Hook Title 3", "body": "2 sentence explanation"}
  ],
  "generalKPIs": [
    {"metric": "Revenue Growth (YoY)", "value": "$XXB (+X%)", "yoy": "+X%", "industryAvg": "Hospitality avg: +X%", "signal": "Strong"},
    {"metric": "EBITDA & Margin", "value": "$XXB (XX%)", "yoy": "+X%", "industryAvg": "Sector avg: 25-35%", "signal": "Strong"},
    {"metric": "Net Profit Margin", "value": "X%", "yoy": "+X%", "industryAvg": "Peers avg: X%", "signal": "Neutral"},
    {"metric": "Debt-to-Equity", "value": "X.X", "yoy": "stable", "industryAvg": "Flag if >2.0", "signal": "Neutral"}
  ],
  "hospitalityKPIs": [
    {"metric": "RevPAR Growth (FY)", "value": "+X%", "yoy": "vs prior year", "industryAvg": "Industry avg: +X%", "signal": "Strong"},
    {"metric": "Occupancy Rate", "value": "XX%", "yoy": "+X ppt", "industryAvg": "Healthy: 60-75%", "signal": "Strong"},
    {"metric": "ADR (Avg Daily Rate)", "value": "$XXX", "yoy": "+X%", "industryAvg": "Segment avg: $XXX", "signal": "Strong"},
    {"metric": "Net Unit Growth", "value": "+X%", "yoy": "rooms added", "industryAvg": "Peers avg: +X%", "signal": "Strong"}
  ],
  "sentimentPoints": ["bullish point 1", "bullish point 2", "bullish point 3", "bullish point 4"],
  "sentimentHedgePoints": ["hedge 1", "hedge 2"],
  "risks": {
    "red": {"count": 2, "items": "Risk A; Risk B"},
    "yellow": {"count": 4, "items": "Risk C, Risk D, Risk E, Risk F"},
    "green": {"count": 3, "items": "Risk G, Risk H, Risk I"}
  },
  "tradeKillers": [
    {"title": "Risk One", "prob": "20-25%", "impact": "HIGH", "desc": "2 sentence plain text description."},
    {"title": "Risk Two", "prob": "15-20%", "impact": "MEDIUM", "desc": "2 sentence plain text description."},
    {"title": "Risk Three", "prob": "10-15%", "impact": "SEVERE", "desc": "2 sentence plain text description."}
  ],
  "sources": "Yahoo Finance, SEC EDGAR, company earnings release, investor presentation"
}`;

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
          content: `Search the web and analyze hospitality company ticker: ${ticker}. Find the current share price, company background, and all KPI data. Return ONLY clean JSON with no cite tags anywhere.`
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
    return Response.json(parsed);

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
