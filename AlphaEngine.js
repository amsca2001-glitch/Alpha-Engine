"use client";
import { useState, useEffect, useRef } from "react";

function ScoreRing({ score }) {
  const r = 28, cx = 36, cy = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 10) * circ;
  const color = score >= 7.5 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="800">{score}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize="8">/10</text>
    </svg>
  );
}

function YoY({ val }) {
  if (!val) return <span className="text-slate-500 text-xs">—</span>;
  const pos = val.startsWith("+") || /accel|record|beat|strong/i.test(val);
  const neg = val.startsWith("-") || /miss|weak|decline/i.test(val);
  return <span className={`text-xs font-bold font-mono ${pos ? "text-emerald-400" : neg ? "text-red-400" : "text-slate-400"}`}>{val}</span>;
}

function RecBadge({ rec }) {
  const cfg = { BUY: "bg-emerald-500 text-white", HOLD: "bg-amber-500 text-white", SELL: "bg-red-500 text-white" };
  return <span className={`px-3 py-1 rounded font-black text-sm tracking-widest ${cfg[rec] || cfg.HOLD}`}>{rec}</span>;
}

function Loader() {
  const steps = [
    "Searching SEC filings...", "Pulling Yahoo Finance data...",
    "Reading earnings call transcript...", "Extracting RevPAR & ADR metrics...",
    "Scoring management sentiment...", "Analyzing 10-K risk factors...",
    "Building investment thesis...", "Generating Alpha Brief..."
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 animate-spin" />
        <div className="absolute inset-2 rounded-full border border-slate-600 animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-emerald-400 text-sm font-mono animate-pulse">{steps[step]}</p>
        <p className="text-slate-600 text-xs mt-1">AI engine running — this takes 30–60 seconds</p>
      </div>
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-emerald-500" : "bg-slate-700"}`} />
        ))}
      </div>
    </div>
  );
}

export default function AlphaEngine() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const suggestions = ["MAR", "HLT", "ABNB", "H", "IHG", "WH"];

  async function analyze(t) {
    const sym = (t || ticker).toUpperCase().trim();
    if (!sym) return;
    setLoading(true); setData(null); setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: sym })
      });
      const parsed = await res.json();
      setData(parsed);
    } catch (e) {
      setError("Could not generate brief. Try again or check the ticker.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen text-slate-100" style={{
      background: "linear-gradient(135deg, #020817 0%, #0a1628 50%, #020817 100%)",
      fontFamily: "'DM Mono', 'Courier New', monospace"
    }}>
      {/* Header */}
      <div className="grid-bg border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="syne text-2xl font-black text-white tracking-tight">
                HOSPITALITY <span className="text-emerald-400">ALPHA ENGINE</span>
              </h1>
              <p className="text-slate-500 text-xs mt-1 font-mono">Scalable Investment Intelligence · Hospitality Sector</p>
            </div>
            <div className="text-right text-xs text-slate-600 font-mono">
              <div>AI-POWERED</div>
              <div className="text-emerald-500">● LIVE</div>
            </div>
          </div>
          <div className="flex gap-3 items-stretch">
            <div className="flex-1 card glow flex items-center gap-3 px-4 py-3">
              <span className="text-emerald-400 text-lg font-black syne">$</span>
              <input
                className="ticker-input flex-1 text-white text-xl font-black syne uppercase placeholder-slate-700"
                placeholder="ENTER TICKER"
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && analyze()}
                maxLength={6}
              />
            </div>
            <button
              onClick={() => analyze()}
              disabled={loading || !ticker}
              className="px-6 rounded-lg font-black text-sm syne tracking-widest transition-all duration-200 disabled:opacity-30"
              style={{ background: loading ? "#1e293b" : "linear-gradient(135deg, #16a34a, #15803d)", color: "white" }}
            >
              {loading ? "RUNNING..." : "ANALYZE →"}
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="text-slate-600 text-xs self-center">Quick:</span>
            {suggestions.map(s => (
              <button key={s} onClick={() => { setTicker(s); analyze(s); }}
                className="px-3 py-1 rounded text-xs font-bold border border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-400 transition-all duration-150">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {!loading && !data && !error && (
          <div className="text-center py-24 text-slate-700">
            <div className="text-6xl mb-4 syne font-black text-slate-800">α</div>
            <p className="text-slate-500 text-sm">Enter any hospitality ticker to generate a full Alpha Brief</p>
            <p className="text-slate-700 text-xs mt-2">MAR · HLT · ABNB · H · IHG · WH</p>
          </div>
        )}
        {loading && <Loader />}
        {error && <div className="card p-6 text-center text-red-400 text-sm">{error}</div>}
        {data && !loading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="syne font-black text-emerald-400 text-sm">{data.ticker}</span>
                </div>
                <div>
                  <h2 className="syne font-black text-white text-xl">{data.company}</h2>
                  <p className="text-slate-500 text-xs">{data.ticker} · Hotels & Lodging · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-slate-500 text-xs mb-1">TARGET PRICE</div>
                  <div className="syne font-black text-white text-lg">{data.targetPrice}</div>
                </div>
                <RecBadge rec={data.recommendation} />
              </div>
            </div>

            {/* Hook */}
            <div className="card">
              <div className="card-header">
                <span className="text-emerald-400 text-xs font-bold tracking-widest">THE HOOK — 3 REASONS THE MARKET MAY BE WRONG</span>
              </div>
              <div className="p-4 space-y-3">
                {(data.hook || []).map((h, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-600 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <span className="text-emerald-400 text-xs font-black">{i + 1}</span>
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm">{h.title} </span>
                      <span className="text-slate-400 text-sm">{h.body}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Table */}
            <div className="card">
              <div className="card-header">
                <span className="text-emerald-400 text-xs font-bold tracking-widest">KPI DASHBOARD — UNIVERSAL & HOSPITALITY METRICS</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-2 text-slate-500 font-mono font-normal">METRIC</th>
                      <th className="text-left px-4 py-2 text-slate-500 font-mono font-normal">VALUE</th>
                      <th className="text-left px-4 py-2 text-slate-500 font-mono font-normal">YOY</th>
                      <th className="text-left px-4 py-2 text-slate-500 font-mono font-normal">PEER / BENCHMARK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "UNIVERSAL", color: "text-slate-400", items: data.universalKPIs || [] },
                      { label: "HOSPITALITY", color: "text-emerald-400", items: data.hospitalityKPIs || [] }
                    ].map(section => [
                      <tr key={section.label} className="border-t border-slate-800">
                        <td colSpan={4} className="px-4 py-1.5">
                          <span className={`text-xs font-bold tracking-widest ${section.color}`}>▸ {section.label}</span>
                        </td>
                      </tr>,
                      ...section.items.map((row, i) => (
                        <tr key={`${section.label}-${i}`} className="border-b border-slate-900 transition-colors">
                          <td className="px-4 py-2 text-slate-300 font-mono">{row.metric}</td>
                          <td className="px-4 py-2 text-white font-bold">{row.value}</td>
                          <td className="px-4 py-2"><YoY val={row.yoy} /></td>
                          <td className="px-4 py-2 text-slate-500">{row.bench}</td>
                        </tr>
                      ))
                    ])}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Insight + Risk */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 card">
                <div className="card-header">
                  <span className="text-emerald-400 text-xs font-bold tracking-widest">AI INSIGHT — MANAGEMENT SENTIMENT ANALYSIS</span>
                </div>
                <div className="p-4 flex gap-5">
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <ScoreRing score={data.sentimentScore} />
                    <span className="text-xs text-slate-400">{data.sentimentLabel}</span>
                    <div className="flex gap-2 text-xs">
                      <span className="text-emerald-400">{data.sentimentBullish} bullish</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-red-400">{data.sentimentHedges} hedges</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {(data.sentimentPoints || []).map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-emerald-500 flex-shrink-0">●</span>
                        <span className="text-slate-300">{p}</span>
                      </div>
                    ))}
                    {(data.sentimentHedgePoints || []).map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-600 flex-shrink-0">○</span>
                        <span className="text-slate-500">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <span className="text-emerald-400 text-xs font-bold tracking-widest">RISK TRAFFIC LIGHT</span>
                </div>
                <div className="p-4 space-y-3 text-xs">
                  {[
                    { key: "red", color: "bg-red-500", label: "HIGH", textColor: "text-red-400" },
                    { key: "yellow", color: "bg-yellow-400", label: "MEDIUM", textColor: "text-yellow-400" },
                    { key: "green", color: "bg-emerald-500", label: "LOW", textColor: "text-emerald-400" }
                  ].map(r => (
                    <div key={r.key}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                        <span className={`font-bold ${r.textColor}`}>{data.risks?.[r.key]?.count} {r.label}</span>
                      </div>
                      <p className="text-slate-500 pl-4 leading-relaxed">{data.risks?.[r.key]?.items}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trade Killers */}
            <div className="card">
              <div className="card-header" style={{ background: "rgba(120,53,15,0.4)" }}>
                <span className="text-orange-400 text-xs font-bold tracking-widest">WHAT KILLS THIS TRADE — TOP 3 RISKS</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-4">
                {(data.tradeKillers || []).map((r, i) => (
                  <div key={i} className="border border-slate-800 rounded-lg p-3">
                    <p className="font-bold text-orange-300 text-xs mb-1">{i + 1}. {r.title}</p>
                    <div className="flex gap-2 mb-2">
                      <span className="text-red-400 text-xs font-bold">{r.prob}</span>
                      <span className="text-slate-600 text-xs">|</span>
                      <span className="text-orange-400 text-xs font-bold">{r.impact}</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-slate-700 text-xs font-mono border-t border-slate-900 pt-3">
              <p><span className="text-slate-600">SOURCES:</span> {data.sources}</p>
              <p className="mt-1">For informational purposes only. Not investment advice. AI-generated — verify critical figures before use.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
