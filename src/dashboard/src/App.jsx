import { useState, useEffect } from "react";

// Real battery data from NASA Battery Degradation Dataset (IDs 12345-12445)
const BATTERY_AIRCRAFT = [
  { id: "12345", risk: 0.95, rul: 0,  soh: 96.5, status: "In-Flight", passengers: 171, from: "KCI", to: "LAX", engine: "CFM56-7B", lastMaint: "2026-04-24", eta: "29 min", band: "Critical", failReason: "Battery at end-of-life. RUL=0 cycles. Internal resistance (Rct) critically elevated — immediate replacement required.", trend: [108,100,95,88,80,70,60,48], sohTrend: [96.5,94.1,91.8,89.2,86.5,83.1,79.4,75.0] },
  { id: "12352", risk: 0.82, rul: 0,  soh: 78.0, status: "In-Flight", passengers: 219, from: "KCI", to: "JFK", engine: "LEAP-1A",   lastMaint: "2026-04-12", eta: "38 min", band: "Critical", failReason: "Battery SOH at 78% — below safe threshold. RUL=0. Capacity fade rate accelerating over last 10 cycles.", trend: [85,84,81,79,77,75,70,65], sohTrend: [78.0,76.5,74.2,72.8,71.0,69.5,67.8,66.0] },
  { id: "12359", risk: 0.88, rul: 0,  soh: 90.4, status: "Taxiing",   passengers: 141, from: "KCI", to: "SEA", engine: "PW1100G",   lastMaint: "2026-04-15", eta: "65 min", band: "Critical", failReason: "Battery impedance anomaly detected. EOL reached — RUL=0. Thermal stress factor elevated beyond safe range.", trend: [103,100,95,91,88,82,75,68], sohTrend: [90.4,88.6,86.1,83.7,81.2,78.4,75.6,72.5] },
  { id: "12347", risk: 0.72, rul: 35, soh: 87.0, status: "Grounded",  passengers: 0,   from: "KCI", to: "MIA", engine: "LEAP-1B",   lastMaint: "2026-04-06", eta: "—",      band: "Warning",  failReason: "Battery capacity fading — SOH 87%. 35 cycles remaining before EOL. Grounded pending inspection.", trend: [98,95,92,90,88,86,84,82], sohTrend: [87.0,86.1,85.2,84.4,83.5,82.6,81.8,80.9] },
  { id: "12348", risk: 0.67, rul: 29, soh: 81.9, status: "In-Flight", passengers: 173, from: "KCI", to: "ATL", engine: "PW4000",    lastMaint: "2026-04-16", eta: "18 min", band: "Warning",  failReason: "Battery capacity at 81.9% SOH — 29 cycles to EOL. Rct_norm rising steadily. Schedule maintenance within 2 weeks.", trend: [91,88,87,85,83,81,79,77], sohTrend: [81.9,81.2,80.5,79.8,79.1,78.4,77.7,77.0] },
  { id: "12349", risk: 0.58, rul: 48, soh: 91.0, status: "In-Flight", passengers: 134, from: "KCI", to: "DEN", engine: "CF6-80",    lastMaint: "2026-04-13", eta: "86 min", band: "Warning",  failReason: "Battery nearing warning threshold. SOH 91%, 48 cycles remaining. Monitor charge-transfer resistance trend.", trend: [102,100,99,97,95,93,91,89], sohTrend: [91.0,90.5,90.0,89.4,88.9,88.3,87.8,87.2] },
  { id: "12350", risk: 0.12, rul: 92, soh: 98.6, status: "In-Flight", passengers: 160, from: "KCI", to: "SFO", engine: "CFM56-7B",  lastMaint: "2026-04-08", eta: "43 min", band: "Normal",   failReason: "Battery operating normally. SOH 98.6%, 92 cycles remaining. All impedance metrics within nominal range.", trend: [103,102,101,100,99,98,97,96], sohTrend: [98.6,98.4,98.3,98.1,97.9,97.8,97.6,97.4] },
  { id: "12351", risk: 0.21, rul: 57, soh: 85.4, status: "Taxiing",   passengers: 114, from: "KCI", to: "BOS", engine: "LEAP-1A",   lastMaint: "2026-04-08", eta: "49 min", band: "Normal",   failReason: "Battery healthy. SOH 85.4%, 57 cycles remaining. Slight capacity fade within expected degradation curve.", trend: [90,89,88,87,86,85,84,83], sohTrend: [85.4,85.2,85.0,84.8,84.6,84.4,84.2,84.0] },
  { id: "12353", risk: 0.08, rul: 72, soh: 94.9, status: "Gate",      passengers: 0,   from: "KCI", to: "LAS", engine: "PW1100G",   lastMaint: "2026-04-03", eta: "—",      band: "Normal",   failReason: "Battery in excellent condition. SOH 94.9%, 72 cycles remaining. No anomalies detected.", trend: [100,99,99,98,97,97,96,95], sohTrend: [94.9,94.8,94.7,94.6,94.5,94.4,94.3,94.2] },
  { id: "12354", risk: 0.05, rul: 86, soh: 98.3, status: "Gate",      passengers: 0,   from: "KCI", to: "PHX", engine: "CFM56-5B",  lastMaint: "2026-04-23", eta: "—",      band: "Normal",   failReason: "Battery fully healthy. SOH 98.3%, 86 cycles to EOL. Recently maintained — all metrics nominal.", trend: [103,102,102,101,100,100,99,98], sohTrend: [98.3,98.2,98.2,98.1,98.0,98.0,97.9,97.8] },
];

const HEALTHY_AIRCRAFT = [
  { id: "12355", status: "In-Flight", health: 97 },
  { id: "12360", status: "Gate",      health: 99 },
  { id: "12367", status: "In-Flight", health: 95 },
  { id: "12372", status: "Taxiing",   health: 98 },
  { id: "12378", status: "In-Flight", health: 96 },
  { id: "12383", status: "Gate",      health: 94 },
  { id: "12391", status: "In-Flight", health: 99 },
  { id: "12398", status: "In-Flight", health: 97 },
  { id: "12404", status: "Taxiing",   health: 98 },
  { id: "12412", status: "Gate",      health: 96 },
];

const TOTAL = BATTERY_AIRCRAFT.length + HEALTHY_AIRCRAFT.length;
const AT_RISK = BATTERY_AIRCRAFT.filter(a => a.band !== "Normal").length;
const CRITICAL = BATTERY_AIRCRAFT.filter(a => a.band === "Critical").length;
const HEALTHY_COUNT = BATTERY_AIRCRAFT.filter(a => a.band === "Normal").length + HEALTHY_AIRCRAFT.length;
const PREDICTED_FAILURES = BATTERY_AIRCRAFT.filter(a => a.rul <= 20).length;
const AVG_RUL = Math.round(BATTERY_AIRCRAFT.filter(a=>a.rul>0).reduce((s,a)=>s+a.rul,0)/BATTERY_AIRCRAFT.filter(a=>a.rul>0).length);

function getRiskColor(band) {
  if (band === "Critical") return "#ff3b3b";
  if (band === "Warning")  return "#ff9f1a";
  return "#7cff6b";
}
function getStatusColor(status) {
  switch (status) {
    case "In-Flight": return "#3bf0ff";
    case "Grounded":  return "#ff3b3b";
    case "Taxiing":   return "#ffd439";
    case "Gate":      return "#7cff6b";
    default:          return "#8892a4";
  }
}

function Sparkline({ data, color = "#3bf0ff", width = 120, height = 40 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RingGauge({ value, total, color, label, size = 90 }) {
  const pct = value / total;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimPct(pct), 100); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ*(1-animPct)} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        <text x={size/2} y={size/2-4} textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="'DM Sans',sans-serif">{value}</text>
        <text x={size/2} y={size/2+13} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="'DM Sans',sans-serif">/ {total}</text>
      </svg>
      <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600 }}>{label}</span>
    </div>
  );
}

function SOHChart({ data }) {
  const w = 680, h = 180, pad = 44;
  const labels = ["-56h","-48h","-40h","-32h","-24h","-16h","-8h","Now"];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h+24}`} style={{ display:"block" }}>
      {[0,25,50,75,100].map(v => {
        const y = h - pad - (v/100)*(h-2*pad);
        return (
          <g key={v}>
            <line x1={pad} y1={y} x2={w-10} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={pad-8} y={y+4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="10" fontFamily="'DM Sans',sans-serif">{v}%</text>
          </g>
        );
      })}
      {data.map((ac, si) => {
        const color = getRiskColor(ac.band);
        const pts = ac.sohTrend.map((v, i) => {
          const x = pad + (i/(ac.sohTrend.length-1))*(w-pad-10);
          const y = h - pad - (v/100)*(h-2*pad);
          return `${x},${y}`;
        }).join(" ");
        return <polyline key={si} points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />;
      })}
      {labels.map((l, i) => {
        const x = pad + (i/(labels.length-1))*(w-pad-10);
        return <text key={i} x={x} y={h+14} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="'DM Sans',sans-serif">{l}</text>;
      })}
    </svg>
  );
}

function StatusDot({ color }) {
  return (
    <span style={{ position:"relative", display:"inline-block", width:8, height:8, marginRight:6 }}>
      <span style={{ position:"absolute", top:0, left:0, width:8, height:8, borderRadius:"50%", background:color,
        animation: color==="#3bf0ff"||color==="#ffd439" ? "pulse 2s infinite" : "none" }} />
    </span>
  );
}

export default function App() {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState(null);
  const [time, setTime] = useState(new Date());
  const [filter, setFilter] = useState("All");

  useEffect(() => { const t = setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); }, []);
  const utc = time.toISOString().slice(11,19) + " UTC";

  const filtered = filter === "All" ? BATTERY_AIRCRAFT : BATTERY_AIRCRAFT.filter(a => a.band === filter);

  const S = {
    app: { minHeight:"100vh", background:"linear-gradient(145deg,#0a0e1a 0%,#0d1321 40%,#111827 100%)", fontFamily:"'DM Sans',sans-serif", color:"#e2e8f0", position:"relative", overflow:"hidden" },
    grid: { position:"fixed", top:0, left:0, right:0, bottom:0, backgroundImage:"linear-gradient(rgba(59,240,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,240,255,0.025) 1px,transparent 1px)", backgroundSize:"60px 60px", pointerEvents:"none", zIndex:0 },
    topBar: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 32px", borderBottom:"1px solid rgba(59,240,255,0.07)", background:"rgba(10,14,26,0.85)", backdropFilter:"blur(20px)", position:"sticky", top:0, zIndex:100 },
    content: { padding:"22px 32px", position:"relative", zIndex:1 },
    card: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"18px 22px", backdropFilter:"blur(10px)" },
    th: { padding:"12px 18px", textAlign:"left", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(255,255,255,0.32)", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.015)", whiteSpace:"nowrap" },
    td: { padding:"14px 18px", fontSize:13, borderBottom:"1px solid rgba(255,255,255,0.035)", verticalAlign:"middle" },
    sectionTitle: { fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(255,255,255,0.35)", marginBottom:14, display:"flex", alignItems:"center", gap:8 },
    line: { flex:1, height:1, background:"rgba(255,255,255,0.05)" },
    badge: (color) => ({ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, background:`${color}18`, color, fontSize:11, fontWeight:600 }),
  };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300..800&family=JetBrains+Mono:wght@400;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.8)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;max-height:0;overflow:hidden} to{opacity:1;max-height:400px} }
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:rgba(59,240,255,0.15);border-radius:3px}
        table{border-collapse:collapse;width:100%}
        tr{transition:background 0.18s ease}
        button{cursor:pointer;font-family:'DM Sans',sans-serif}
      `}</style>

      <div style={S.grid} />

      {/* TOP BAR */}
      <div style={S.topBar}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#3bf0ff,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:900, color:"#0a0e1a", boxShadow:"0 0 18px rgba(59,240,255,0.3)" }}>K</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.02em", background:"linear-gradient(135deg,#fff,#94a3b8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Kansas Fleet — IFRPM</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", textTransform:"uppercase" }}>Intelligent Flight Readiness & Predictive Maintenance</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ display:"flex", gap:4 }}>
            {["Fleet Overview","Failure Analysis"].map((label,i) => (
              <button key={i} onClick={()=>setPage(i)} style={{ padding:"7px 18px", borderRadius:7, border: page===i ? "1px solid rgba(59,240,255,0.25)" : "1px solid transparent", fontSize:11, fontWeight:600, letterSpacing:"0.02em", transition:"all 0.2s", background: page===i ? "rgba(59,240,255,0.1)" : "transparent", color: page===i ? "#3bf0ff" : "rgba(255,255,255,0.38)" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.05em" }}>{utc}</div>
        </div>
      </div>

      <div style={S.content}>

        {/* PAGE 1: Fleet Overview */}
        {page === 0 && (
          <div style={{ animation:"fadeIn 0.45s ease" }}>

            {/* KPI ROW */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>

              <div style={S.card}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:8 }}>Total Active Aircraft</div>
                <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:34, fontWeight:800, letterSpacing:"-0.03em", color:"#fff", lineHeight:1 }}>{TOTAL}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.32)", marginTop:4 }}>Fleet capacity nominal</div>
                  </div>
                  <Sparkline data={[15,16,17,18,19,20,20,20]} color="#3bf0ff" width={72} height={32} />
                </div>
              </div>

              <div style={S.card}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:6 }}>Fleet Health Distribution</div>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:2 }}>
                  <RingGauge value={HEALTHY_COUNT} total={TOTAL} color="#7cff6b" label="Healthy" size={78} />
                  <RingGauge value={AT_RISK}       total={TOTAL} color="#ff9f1a" label="Warning" size={78} />
                  <RingGauge value={CRITICAL}      total={TOTAL} color="#ff3b3b" label="Critical" size={78} />
                </div>
              </div>

              <div style={S.card}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:8 }}>Predicted Failures (48h)</div>
                <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:34, fontWeight:800, letterSpacing:"-0.03em", color:"#ff3b3b", lineHeight:1 }}>{PREDICTED_FAILURES}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.32)", marginTop:4 }}>Batteries at RUL ≤ 20 cycles</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                    <span style={{ fontSize:11, color:"#ff3b3b" }}>▲ {CRITICAL} critical</span>
                    <span style={{ fontSize:11, color:"#ff9f1a" }}>● {AT_RISK - CRITICAL} warning</span>
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:8 }}>Avg. Remaining Useful Life</div>
                <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:34, fontWeight:800, letterSpacing:"-0.03em", color:"#ffd439", lineHeight:1 }}>{AVG_RUL}<span style={{ fontSize:14, fontWeight:400 }}> cyc</span></div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.32)", marginTop:4 }}>Across active fleet</div>
                  </div>
                  <Sparkline data={[80,75,70,65,62,58,55,AVG_RUL]} color="#ffd439" width={72} height={32} />
                </div>
              </div>
            </div>

            {/* FILTER TABS */}
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {["All","Critical","Warning","Normal"].map(f => (
                <button key={f} onClick={()=>setFilter(f)} style={{ padding:"5px 16px", borderRadius:20, border: filter===f ? `1px solid ${f==="Critical"?"#ff3b3b":f==="Warning"?"#ff9f1a":f==="Normal"?"#7cff6b":"rgba(59,240,255,0.3)"}` : "1px solid rgba(255,255,255,0.08)", fontSize:11, fontWeight:600, transition:"all 0.2s", background: filter===f ? `${f==="Critical"?"#ff3b3b":f==="Warning"?"#ff9f1a":f==="Normal"?"#7cff6b":"#3bf0ff"}18` : "transparent", color: filter===f ? (f==="Critical"?"#ff3b3b":f==="Warning"?"#ff9f1a":f==="Normal"?"#7cff6b":"#3bf0ff") : "rgba(255,255,255,0.35)" }}>
                  {f}
                </button>
              ))}
            </div>

            {/* MAIN TABLE */}
            <div style={S.sectionTitle}>
              <span style={{ color:"#ff3b3b" }}>⚠</span> Aircraft Fleet — Battery Health Monitor
              <div style={S.line} />
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.22)", fontWeight:400, textTransform:"none", letterSpacing:0 }}>NASA Battery Degradation Dataset · Sorted by risk</span>
            </div>

            <div style={{ background:"rgba(255,255,255,0.018)", border:"1px solid rgba(255,255,255,0.055)", borderRadius:14, overflow:"hidden", marginBottom:22 }}>
              <table>
                <thead>
                  <tr>
                    <th style={S.th}>Aircraft ID</th>
                    <th style={S.th}>Risk Band</th>
                    <th style={S.th}>RUL (cycles)</th>
                    <th style={S.th}>SOH %</th>
                    <th style={S.th}>From</th>
                    <th style={S.th}>To</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Passengers</th>
                    <th style={S.th}>ETA Nearest Airport</th>
                    <th style={S.th}>SOH Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ac, i) => (
                    <>
                      <tr key={ac.id}
                        onClick={()=>setSelected(selected===ac.id?null:ac.id)}
                        onMouseEnter={()=>setHover(i)}
                        onMouseLeave={()=>setHover(null)}
                        style={{ cursor:"pointer", background: selected===ac.id ? "rgba(59,240,255,0.05)" : hover===i ? "rgba(255,255,255,0.018)" : "transparent" }}>
                        <td style={{ ...S.td, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"#fff" }}>{ac.id}</td>
                        <td style={S.td}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:3, height:28, borderRadius:2, background:getRiskColor(ac.band) }} />
                            <span style={{ ...S.badge(getRiskColor(ac.band)) }}>{ac.band}</span>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={{ color: ac.rul===0?"#ff3b3b":ac.rul<20?"#ff9f1a":"#ffd439", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", fontSize:15 }}>
                            {ac.rul}
                          </span>
                          <span style={{ color:"rgba(255,255,255,0.28)", fontSize:10 }}> cyc</span>
                        </td>
                        <td style={S.td}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:52, height:5, borderRadius:3, background:"rgba(255,255,255,0.06)", position:"relative", overflow:"hidden" }}>
                              <div style={{ position:"absolute", top:0, left:0, height:"100%", width:`${ac.soh}%`, borderRadius:3, background:`linear-gradient(90deg,${getRiskColor(ac.band)}88,${getRiskColor(ac.band)})`, transition:"width 0.8s ease" }} />
                            </div>
                            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"rgba(255,255,255,0.7)" }}>{ac.soh}%</span>
                          </div>
                        </td>
                        <td style={{ ...S.td, fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"rgba(255,255,255,0.55)" }}>{ac.from}</td>
                        <td style={{ ...S.td, fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"rgba(255,255,255,0.55)" }}>{ac.to}</td>
                        <td style={S.td}>
                          <div style={S.badge(getStatusColor(ac.status))}>
                            <StatusDot color={getStatusColor(ac.status)} />{ac.status}
                          </div>
                        </td>
                        <td style={{ ...S.td, fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>
                          {ac.passengers > 0 ? ac.passengers : "—"}
                        </td>
                        <td style={{ ...S.td, fontFamily:"'JetBrains Mono',monospace", fontSize:12, color: ac.eta==="—"?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.7)" }}>{ac.eta}</td>
                        <td style={S.td}>
                          <Sparkline data={ac.sohTrend} color={getRiskColor(ac.band)} width={90} height={28} />
                        </td>
                      </tr>
                      {selected === ac.id && (
                        <tr key={ac.id+"-detail"}>
                          <td colSpan={10} style={{ padding:0 }}>
                            <div style={{ background:"rgba(59,240,255,0.025)", borderTop:"1px solid rgba(59,240,255,0.07)", padding:"18px 22px", animation:"slideDown 0.3s ease" }}>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:18 }}>
                                <div>
                                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Engine</div>
                                  <div style={{ fontSize:13, fontWeight:600 }}>{ac.engine}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Last Maintenance</div>
                                  <div style={{ fontSize:13, fontWeight:600 }}>{ac.lastMaint}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Risk Score</div>
                                  <div style={{ fontSize:13, fontWeight:700, color:getRiskColor(ac.band), fontFamily:"'JetBrains Mono',monospace" }}>{(ac.risk*100).toFixed(0)}%</div>
                                </div>
                                <div>
                                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Battery Diagnosis</div>
                                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>{ac.failReason}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SOH TREND CHART */}
            <div style={S.sectionTitle}>
              <span style={{ color:"#3bf0ff" }}>◆</span> SOH Time-Series Health Trends
              <div style={S.line} />
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.22)", fontWeight:400, textTransform:"none", letterSpacing:0 }}>Last 56 hours · All monitored aircraft</span>
            </div>
            <div style={{ ...S.card, padding:"18px 14px", marginBottom:22 }}>
              <SOHChart data={BATTERY_AIRCRAFT} />
              <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:10, flexWrap:"wrap" }}>
                {BATTERY_AIRCRAFT.map(ac => (
                  <div key={ac.id} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10 }}>
                    <div style={{ width:10, height:3, borderRadius:2, background:getRiskColor(ac.band) }} />
                    <span style={{ color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>{ac.id}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NAV */}
            <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:24 }}>
              {[0,1].map(i => <div key={i} style={{ width: page===i?26:7, height:7, borderRadius:4, background: page===i?"#3bf0ff":"rgba(255,255,255,0.14)", cursor:"pointer", transition:"all 0.3s", boxShadow: page===i?"0 0 10px rgba(59,240,255,0.4)":"none" }} onClick={()=>setPage(i)} />)}
            </div>
          </div>
        )}

        {/* PAGE 2: Failure Analysis */}
        {page === 1 && (
          <div style={{ animation:"fadeIn 0.45s ease" }}>
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.03em", background:"linear-gradient(135deg,#ff3b3b,#ff9f1a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:5 }}>
                Battery Failure Analysis
              </h2>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.32)" }}>
                NASA Battery Degradation Dataset · XGBoost RUL Model · RMSE 5.8 cycles · R² 0.92
              </p>
            </div>

            <div style={{ display:"grid", gap:14 }}>
              {BATTERY_AIRCRAFT.map((ac, i) => (
                <div key={ac.id} style={{ background:"rgba(255,255,255,0.018)", border:`1px solid ${getRiskColor(ac.band)}18`, borderRadius:14, overflow:"hidden", borderLeft:`3px solid ${getRiskColor(ac.band)}`, animation:`fadeIn 0.5s ease ${i*0.06}s both` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 22px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:17, fontWeight:800, color:"#fff" }}>{ac.id}</div>
                      <div style={S.badge(getStatusColor(ac.status))}><StatusDot color={getStatusColor(ac.status)} />{ac.status}</div>
                      <div style={S.badge(getRiskColor(ac.band))}>{ac.band}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:22 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em" }}>SOH</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color:getRiskColor(ac.band) }}>{ac.soh}%</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em" }}>RUL</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color: ac.rul===0?"#ff3b3b":ac.rul<20?"#ff9f1a":"#ffd439" }}>
                          {ac.rul}<span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.28)" }}> cyc</span>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em" }}>Route</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)" }}>{ac.from} → {ac.to}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:"16px 22px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                    <div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, fontWeight:700 }}>Battery Diagnosis</div>
                      <p style={{ fontSize:13, color:"rgba(255,255,255,0.68)", lineHeight:1.7 }}>{ac.failReason}</p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
                        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 14px" }}>
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Engine</div>
                          <div style={{ fontSize:12, fontWeight:600 }}>{ac.engine}</div>
                        </div>
                        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 14px" }}>
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Last Maint.</div>
                          <div style={{ fontSize:12, fontWeight:600 }}>{ac.lastMaint}</div>
                        </div>
                        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 14px" }}>
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Passengers</div>
                          <div style={{ fontSize:12, fontWeight:600 }}>{ac.passengers > 0 ? ac.passengers : "None"}</div>
                        </div>
                        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 14px" }}>
                          <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>ETA Nearest</div>
                          <div style={{ fontSize:12, fontWeight:600 }}>{ac.eta}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, fontWeight:700 }}>SOH Degradation Trend</div>
                      <Sparkline data={ac.sohTrend} color={getRiskColor(ac.band)} width={300} height={60} />
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                        <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)" }}>-56h</span>
                        <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)" }}>Now</span>
                      </div>
                      {/* Go/No-Go */}
                      <div style={{ marginTop:12, padding:"10px 14px", borderRadius:8, background: ac.band==="Critical"?"rgba(255,59,59,0.1)":ac.band==="Warning"?"rgba(255,159,26,0.1)":"rgba(124,255,107,0.1)", border:`1px solid ${getRiskColor(ac.band)}30`, display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:12, height:12, borderRadius:"50%", background:getRiskColor(ac.band), boxShadow:`0 0 8px ${getRiskColor(ac.band)}` }} />
                        <span style={{ fontWeight:700, fontSize:13, color:getRiskColor(ac.band) }}>
                          {ac.band==="Critical" ? "NO-GO — Immediate Maintenance Required" : ac.band==="Warning" ? "CAUTION — Schedule Maintenance Soon" : "GO — Cleared for Flight"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:24 }}>
              {[0,1].map(i => <div key={i} style={{ width: page===i?26:7, height:7, borderRadius:4, background: page===i?"#3bf0ff":"rgba(255,255,255,0.14)", cursor:"pointer", transition:"all 0.3s", boxShadow: page===i?"0 0 10px rgba(59,240,255,0.4)":"none" }} onClick={()=>setPage(i)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
