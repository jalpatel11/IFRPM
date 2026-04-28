import { useState, useEffect, useRef } from "react";

const MOCK_AIRCRAFT = [
  { id: "AC-131", risk: 0.87, rul: 36, status: "In-Flight", passengers: 182, route: "KCI → LAX", engine: "CFM56-7B", lastMaint: "2026-04-10", failReason: "Turbine blade micro-fracture detected in engine #2. Vibration amplitude exceeding threshold by 14%.", trend: [82, 78, 71, 65, 58, 52, 44, 38] },
  { id: "AC-247", risk: 0.73, rul: 54, status: "In-Flight", passengers: 215, route: "KCI → JFK", engine: "LEAP-1A", lastMaint: "2026-04-08", failReason: "Oil pressure anomaly in hydraulic system. Degradation rate suggests seal wear in actuator assembly.", trend: [90, 88, 83, 79, 72, 68, 61, 55] },
  { id: "AC-089", risk: 0.65, rul: 78, status: "Grounded", passengers: 0, route: "—", engine: "PW1100G", lastMaint: "2026-04-12", failReason: "Compressor stall signature detected during last 3 startups. Fan blade erosion pattern consistent with FOD ingestion.", trend: [75, 73, 70, 68, 64, 60, 57, 53] },
  { id: "AC-402", risk: 0.58, rul: 102, status: "Taxiing", passengers: 143, route: "KCI → ORD", engine: "CFM56-5B", lastMaint: "2026-04-15", failReason: "Bearing temperature trending upward in accessory gearbox. Predicted thermal runaway within 102 flight hours.", trend: [88, 86, 84, 80, 76, 73, 69, 65] },
  { id: "AC-318", risk: 0.44, rul: 156, status: "In-Flight", passengers: 197, route: "KCI → SEA", engine: "GE90-115B", lastMaint: "2026-04-18", failReason: "Fuel nozzle coking detected in combustor section. Spray pattern deviation causing hotspot formation.", trend: [92, 91, 89, 86, 83, 80, 77, 74] },
  { id: "AC-556", risk: 0.31, rul: 210, status: "Gate", passengers: 0, route: "KCI → DFW", engine: "LEAP-1B", lastMaint: "2026-04-20", failReason: "Minor bleed air leak detected in pneumatic ducting. Progressive erosion at T-joint connection.", trend: [95, 94, 93, 91, 89, 87, 85, 83] },
];

const HEALTHY_AIRCRAFT = [
  { id: "AC-710", status: "In-Flight", health: 97 },
  { id: "AC-811", status: "Gate", health: 99 },
  { id: "AC-622", status: "In-Flight", health: 95 },
  { id: "AC-933", status: "Taxiing", health: 98 },
  { id: "AC-144", status: "In-Flight", health: 96 },
  { id: "AC-505", status: "Gate", health: 94 },
  { id: "AC-267", status: "In-Flight", health: 99 },
  { id: "AC-878", status: "In-Flight", health: 97 },
];

const TOTAL_AIRCRAFT = MOCK_AIRCRAFT.length + HEALTHY_AIRCRAFT.length;
const AT_RISK = MOCK_AIRCRAFT.length;
const HEALTHY = HEALTHY_AIRCRAFT.length;

function getRiskColor(risk) {
  if (risk >= 0.75) return "#ff3b3b";
  if (risk >= 0.5) return "#ff9f1a";
  return "#ffd439";
}

function getStatusColor(status) {
  switch (status) {
    case "In-Flight": return "#3bf0ff";
    case "Grounded": return "#ff3b3b";
    case "Taxiing": return "#ffd439";
    case "Gate": return "#7cff6b";
    default: return "#8892a4";
  }
}

// Sparkline component
function Sparkline({ data, color = "#3bf0ff", width = 120, height = 40 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`spark-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${color.replace("#","")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Animated ring gauge
function RingGauge({ value, total, color, label, size = 100 }) {
  const pct = value / total;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const [animPct, setAnimPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimPct(pct), 100);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - animPct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
        <text x={size/2} y={size/2 - 4} textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="'DM Sans', sans-serif">{value}</text>
        <text x={size/2} y={size/2 + 14} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="'DM Sans', sans-serif">/ {total}</text>
      </svg>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// Health trend chart (larger)
function HealthChart({ data, labels }) {
  const w = 700, h = 200, pad = 40;
  const min = 0, max = 100;
  const range = max - min;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} style={{ display: "block" }}>
      {[0, 25, 50, 75, 100].map(v => {
        const y = h - pad - ((v - min) / range) * (h - 2 * pad);
        return (
          <g key={v}>
            <line x1={pad} y1={y} x2={w - 10} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pad - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="'DM Sans', sans-serif">{v}%</text>
          </g>
        );
      })}
      {data.map((series, si) => {
        const color = getRiskColor(MOCK_AIRCRAFT[si]?.risk || 0.5);
        const pts = series.map((v, i) => {
          const x = pad + (i / (series.length - 1)) * (w - pad - 10);
          const y = h - pad - ((v - min) / range) * (h - 2 * pad);
          return `${x},${y}`;
        }).join(" ");
        return (
          <polyline key={si} points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        );
      })}
      {labels.map((l, i) => {
        const x = pad + (i / (labels.length - 1)) * (w - pad - 10);
        return <text key={i} x={x} y={h + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="'DM Sans', sans-serif">{l}</text>;
      })}
    </svg>
  );
}

// Pulsing dot for status
function StatusDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 8, height: 8, marginRight: 8 }}>
      <span style={{
        position: "absolute", top: 0, left: 0, width: 8, height: 8,
        borderRadius: "50%", background: color,
        animation: color === "#3bf0ff" || color === "#ffd439" ? "pulse 2s infinite" : "none"
      }} />
    </span>
  );
}

export default function App() {
  const [page, setPage] = useState(0);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utc = time.toISOString().slice(11, 19) + " UTC";

  const styles = {
    app: {
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a0e1a 0%, #0d1321 40%, #111827 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e2e8f0",
      padding: "0",
      position: "relative",
      overflow: "hidden",
    },
    gridBg: {
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: "linear-gradient(rgba(59,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,240,255,0.03) 1px, transparent 1px)",
      backgroundSize: "60px 60px",
      pointerEvents: "none",
      zIndex: 0,
    },
    topBar: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 32px",
      borderBottom: "1px solid rgba(59,240,255,0.08)",
      background: "rgba(10,14,26,0.8)",
      backdropFilter: "blur(20px)",
      position: "sticky", top: 0, zIndex: 100,
    },
    logo: {
      display: "flex", alignItems: "center", gap: 12,
    },
    logoIcon: {
      width: 36, height: 36, borderRadius: 8,
      background: "linear-gradient(135deg, #3bf0ff 0%, #0ea5e9 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, fontWeight: 900, color: "#0a0e1a",
      boxShadow: "0 0 20px rgba(59,240,255,0.3)",
    },
    teamName: {
      fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
      background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    utc: {
      fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.05em",
    },
    content: { padding: "24px 32px", position: "relative", zIndex: 1 },
    kpiRow: {
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24,
    },
    kpiCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "20px 24px",
      backdropFilter: "blur(10px)",
      transition: "all 0.3s ease",
    },
    kpiLabel: {
      fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
      letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8,
    },
    kpiValue: {
      fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
    },
    kpiSub: {
      fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4,
    },
    sectionTitle: {
      fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
      color: "rgba(255,255,255,0.4)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
    },
    sectionLine: {
      flex: 1, height: 1, background: "rgba(255,255,255,0.06)",
    },
    tableWrap: {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, overflow: "hidden", marginBottom: 24,
    },
    th: {
      padding: "14px 20px", textAlign: "left", fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(255,255,255,0.02)",
    },
    td: {
      padding: "16px 20px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,0.04)",
      verticalAlign: "middle",
    },
    navDots: {
      display: "flex", justifyContent: "center", gap: 10, marginTop: 32,
    },
    dot: (active) => ({
      width: active ? 28 : 8, height: 8, borderRadius: 4,
      background: active ? "#3bf0ff" : "rgba(255,255,255,0.15)",
      cursor: "pointer", transition: "all 0.3s ease",
      boxShadow: active ? "0 0 12px rgba(59,240,255,0.4)" : "none",
    }),
    badge: (color) => ({
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      background: `${color}15`, color: color,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.02em",
    }),
    riskBar: (risk) => ({
      width: 80, height: 6, borderRadius: 3,
      background: "rgba(255,255,255,0.06)",
      position: "relative", overflow: "hidden",
    }),
    riskFill: (risk) => ({
      position: "absolute", top: 0, left: 0,
      width: `${risk * 100}%`, height: "100%",
      borderRadius: 3,
      background: `linear-gradient(90deg, ${getRiskColor(risk)}88, ${getRiskColor(risk)})`,
      transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
    }),
    expandPanel: {
      background: "rgba(59,240,255,0.03)",
      borderTop: "1px solid rgba(59,240,255,0.08)",
      padding: "20px 24px",
    },
  };

  const chartLabels = ["-56h", "-48h", "-40h", "-32h", "-24h", "-16h", "-8h", "Now"];
  const chartData = MOCK_AIRCRAFT.map(a => a.trend);

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;600&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.8); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 300px; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(59,240,255,0.15); border-radius: 3px; }
        table { border-collapse: collapse; width: 100%; }
        tr { transition: background 0.2s ease; }
      `}</style>

      <div style={styles.gridBg} />

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>K</div>
          <div>
            <div style={styles.teamName}>Team Kansas Air Fleet</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Intelligent Fleet Reliability & Predictive Maintenance
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["Overview", "Failure Analysis"].map((label, i) => (
              <button key={i} onClick={() => setPage(i)} style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.02em", transition: "all 0.2s ease",
                background: page === i ? "rgba(59,240,255,0.12)" : "transparent",
                color: page === i ? "#3bf0ff" : "rgba(255,255,255,0.4)",
                border: page === i ? "1px solid rgba(59,240,255,0.2)" : "1px solid transparent",
              }}>
                {label}
              </button>
            ))}
          </div>
          <div style={styles.utc}>{utc}</div>
        </div>
      </div>

      <div style={styles.content}>
        {/* PAGE 1: Fleet Overview */}
        {page === 0 && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            {/* KPI Cards */}
            <div style={styles.kpiRow}>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Total Active Aircraft</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ ...styles.kpiValue, color: "#ffffff" }}>{TOTAL_AIRCRAFT}</div>
                    <div style={styles.kpiSub}>Fleet capacity nominal</div>
                  </div>
                  <Sparkline data={[10, 11, 12, 13, 14, 14, 14, 14]} color="#3bf0ff" width={80} height={36} />
                </div>
              </div>

              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Fleet Health Distribution</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 4 }}>
                  <RingGauge value={HEALTHY} total={TOTAL_AIRCRAFT} color="#7cff6b" label="Healthy" size={80} />
                  <RingGauge value={AT_RISK} total={TOTAL_AIRCRAFT} color="#ff3b3b" label="At Risk" size={80} />
                </div>
              </div>

              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Predicted Failures</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ ...styles.kpiValue, color: "#ff3b3b" }}>3</div>
                    <div style={styles.kpiSub}>Within next 48 hours</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "#ff9f1a" }}>▲ 2 high severity</span>
                    <span style={{ fontSize: 11, color: "#ffd439" }}>● 1 moderate</span>
                  </div>
                </div>
              </div>

              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Avg. Remaining Life</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ ...styles.kpiValue, color: "#ffd439" }}>106<span style={{ fontSize: 16, fontWeight: 400 }}>hrs</span></div>
                    <div style={styles.kpiSub}>Across at-risk fleet</div>
                  </div>
                  <Sparkline data={[140, 132, 125, 118, 112, 108, 106, 106]} color="#ffd439" width={80} height={36} />
                </div>
              </div>
            </div>

            {/* At Risk Table */}
            <div style={styles.sectionTitle}>
              <span style={{ color: "#ff3b3b" }}>⚠</span> Aircraft at Risk
              <div style={styles.sectionLine} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                Sorted by risk score
              </span>
            </div>

            <div style={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th style={styles.th}>Aircraft</th>
                    <th style={styles.th}>Risk Score</th>
                    <th style={styles.th}>RUL</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Passengers</th>
                    <th style={styles.th}>Route</th>
                    <th style={styles.th}>Health Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_AIRCRAFT.map((ac, i) => (
                    <>
                      <tr
                        key={ac.id}
                        onClick={() => setSelectedAircraft(selectedAircraft === ac.id ? null : ac.id)}
                        onMouseEnter={() => setHoverRow(i)}
                        onMouseLeave={() => setHoverRow(null)}
                        style={{
                          cursor: "pointer",
                          background: selectedAircraft === ac.id
                            ? "rgba(59,240,255,0.06)"
                            : hoverRow === i ? "rgba(255,255,255,0.02)" : "transparent",
                        }}
                      >
                        <td style={{ ...styles.td, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#fff" }}>
                          {ac.id}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ color: getRiskColor(ac.risk), fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}>
                              {ac.risk.toFixed(2)}
                            </span>
                            <div style={styles.riskBar(ac.risk)}>
                              <div style={styles.riskFill(ac.risk)} />
                            </div>
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace" }}>
                          <span style={{ color: ac.rul <= 48 ? "#ff3b3b" : ac.rul <= 100 ? "#ff9f1a" : "#ffd439", fontWeight: 700 }}>
                            {ac.rul}
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}> hrs</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.badge(getStatusColor(ac.status))}>
                            <StatusDot color={getStatusColor(ac.status)} />
                            {ac.status}
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {ac.passengers > 0 ? ac.passengers : "—"}
                        </td>
                        <td style={{ ...styles.td, fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {ac.route}
                        </td>
                        <td style={styles.td}>
                          <Sparkline data={ac.trend} color={getRiskColor(ac.risk)} width={100} height={30} />
                        </td>
                      </tr>
                      {selectedAircraft === ac.id && (
                        <tr key={ac.id + "-detail"}>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div style={{ ...styles.expandPanel, animation: "slideDown 0.3s ease" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                                <div>
                                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Engine Type</div>
                                  <div style={{ fontSize: 14, fontWeight: 600 }}>{ac.engine}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Last Maintenance</div>
                                  <div style={{ fontSize: 14, fontWeight: 600 }}>{ac.lastMaint}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Failure Prediction</div>
                                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{ac.failReason}</div>
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

            {/* Health Trends Chart */}
            <div style={styles.sectionTitle}>
              <span style={{ color: "#3bf0ff" }}>◆</span> Time-Series Health Trends
              <div style={styles.sectionLine} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                Last 56 hours
              </span>
            </div>

            <div style={{ ...styles.tableWrap, padding: "20px 16px" }}>
              <HealthChart data={chartData} labels={chartLabels} />
              <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                {MOCK_AIRCRAFT.map(ac => (
                  <div key={ac.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <div style={{ width: 12, height: 3, borderRadius: 2, background: getRiskColor(ac.risk) }} />
                    <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>{ac.id}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nav */}
            <div style={styles.navDots}>
              {[0, 1].map(i => (
                <div key={i} style={styles.dot(page === i)} onClick={() => setPage(i)} />
              ))}
            </div>
          </div>
        )}

        {/* PAGE 2: Failure Explanation Panel */}
        {page === 1 && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, #ff3b3b 0%, #ff9f1a 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                marginBottom: 6,
              }}>
                Failure Explanation Panel
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                AI-driven root cause analysis and predictive failure diagnostics for at-risk aircraft
              </p>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {MOCK_AIRCRAFT.map((ac, i) => (
                <div key={ac.id} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${getRiskColor(ac.risk)}15`,
                  borderRadius: 16, padding: 0, overflow: "hidden",
                  borderLeft: `3px solid ${getRiskColor(ac.risk)}`,
                  animation: `fadeIn 0.5s ease ${i * 0.08}s both`,
                }}>
                  {/* Card Header */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color: "#fff",
                      }}>
                        {ac.id}
                      </div>
                      <div style={styles.badge(getStatusColor(ac.status))}>
                        <StatusDot color={getStatusColor(ac.status)} />
                        {ac.status}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>RUL</div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800,
                          color: ac.rul <= 48 ? "#ff3b3b" : ac.rul <= 100 ? "#ff9f1a" : "#ffd439",
                        }}>
                          {ac.rul}<span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}> hrs</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Risk</div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800,
                          color: getRiskColor(ac.risk),
                        }}>
                          {(ac.risk * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
                        Root Cause Analysis
                      </div>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                        {ac.failReason}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 16px" }}>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Engine</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{ac.engine}</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 16px" }}>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Route</div>
                          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{ac.route}</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 16px" }}>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Last Maint.</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{ac.lastMaint}</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 16px" }}>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Passengers</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{ac.passengers > 0 ? ac.passengers : "None"}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: "auto" }}>
                        <Sparkline data={ac.trend} color={getRiskColor(ac.risk)} width={280} height={40} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nav */}
            <div style={styles.navDots}>
              {[0, 1].map(i => (
                <div key={i} style={styles.dot(page === i)} onClick={() => setPage(i)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
