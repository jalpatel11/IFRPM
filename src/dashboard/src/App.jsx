import { useState, useEffect } from "react";

// ─── BATTERY DATA (Prem — NASA Battery Degradation, XGBoost) ─────────────────
const BATTERY_AIRCRAFT = [
  { id:"AC-001", rul:0,  soh:96.5, band:"Critical", status:"In-Flight", passengers:171, from:"KCI", to:"LAX", engine:"CFM56-7B", lastMaint:"2026-04-24", eta:"29 min", esr:0.21, rct:1.82, temp:38, fadeRate:-0.008, diagnosis:"Battery at end-of-life (RUL=0). Rct critically elevated. Immediate replacement required.", sohTrend:[96.5,94.1,91.8,89.2,86.5,83.1,79.4,75.0], rulTrend:[50,42,34,27,18,10,4,0] },
  { id:"AC-002", rul:0,  soh:78.0, band:"Critical", status:"In-Flight", passengers:219, from:"KCI", to:"JFK", engine:"LEAP-1A",  lastMaint:"2026-04-12", eta:"38 min", esr:0.28, rct:2.10, temp:41, fadeRate:-0.012, diagnosis:"SOH at 78% — below safe threshold. Capacity fade accelerating over last 10 cycles.", sohTrend:[78.0,76.5,74.2,72.8,71.0,69.5,67.8,66.0], rulTrend:[50,40,30,21,13,6,2,0] },
  { id:"AC-003", rul:0,  soh:90.4, band:"Critical", status:"Taxiing",   passengers:141, from:"KCI", to:"SEA", engine:"PW1100G",  lastMaint:"2026-04-15", eta:"65 min", esr:0.25, rct:1.95, temp:43, fadeRate:-0.009, diagnosis:"Impedance anomaly — EOL reached. Thermal stress factor beyond safe range.", sohTrend:[90.4,88.6,86.1,83.7,81.2,78.4,75.6,72.5], rulTrend:[50,44,37,29,20,11,5,0] },
  { id:"AC-004", rul:35, soh:87.0, band:"Warning",  status:"Grounded",  passengers:0,   from:"KCI", to:"MIA", engine:"LEAP-1B",  lastMaint:"2026-04-06", eta:"—",      esr:0.19, rct:1.74, temp:36, fadeRate:-0.005, diagnosis:"SOH 87%. 35 cycles to EOL. Grounded pending inspection.", sohTrend:[87.0,86.1,85.2,84.4,83.5,82.6,81.8,80.9], rulTrend:[50,48,46,44,43,41,38,35] },
  { id:"AC-005", rul:29, soh:81.9, band:"Warning",  status:"In-Flight", passengers:173, from:"KCI", to:"ATL", engine:"PW4000",   lastMaint:"2026-04-16", eta:"18 min", esr:0.22, rct:1.88, temp:37, fadeRate:-0.007, diagnosis:"SOH 81.9%, Rct_norm rising. Schedule maintenance within 2 weeks.", sohTrend:[81.9,81.2,80.5,79.8,79.1,78.4,77.7,77.0], rulTrend:[50,46,43,40,37,34,32,29] },
  { id:"AC-006", rul:48, soh:91.0, band:"Warning",  status:"In-Flight", passengers:134, from:"KCI", to:"DEN", engine:"CF6-80",   lastMaint:"2026-04-13", eta:"86 min", esr:0.17, rct:1.65, temp:35, fadeRate:-0.004, diagnosis:"Nearing warning threshold. Monitor charge-transfer resistance trend.", sohTrend:[91.0,90.5,90.0,89.4,88.9,88.3,87.8,87.2], rulTrend:[50,49,49,48,48,48,48,48] },
  { id:"AC-007", rul:92, soh:98.6, band:"Normal",   status:"In-Flight", passengers:160, from:"KCI", to:"SFO", engine:"CFM56-7B", lastMaint:"2026-04-08", eta:"43 min", esr:0.14, rct:1.42, temp:32, fadeRate:-0.001, diagnosis:"All metrics nominal. SOH 98.6%, 92 cycles remaining.", sohTrend:[98.6,98.4,98.3,98.1,97.9,97.8,97.6,97.4], rulTrend:[50,50,50,50,50,50,50,50] },
  { id:"AC-008", rul:57, soh:85.4, band:"Normal",   status:"Taxiing",   passengers:114, from:"KCI", to:"BOS", engine:"LEAP-1A",  lastMaint:"2026-04-08", eta:"49 min", esr:0.16, rct:1.58, temp:33, fadeRate:-0.002, diagnosis:"Healthy — slight capacity fade within expected degradation curve.", sohTrend:[85.4,85.2,85.0,84.8,84.6,84.4,84.2,84.0], rulTrend:[50,50,50,50,50,50,50,50] },
  { id:"AC-009", rul:72, soh:94.9, band:"Normal",   status:"Gate",      passengers:0,   from:"KCI", to:"LAS", engine:"PW1100G",  lastMaint:"2026-04-03", eta:"—",      esr:0.13, rct:1.38, temp:31, fadeRate:-0.001, diagnosis:"Excellent condition. No anomalies detected.", sohTrend:[94.9,94.8,94.7,94.6,94.5,94.4,94.3,94.2], rulTrend:[50,50,50,50,50,50,50,50] },
  { id:"AC-010", rul:86, soh:98.3, band:"Normal",   status:"Gate",      passengers:0,   from:"KCI", to:"PHX", engine:"CFM56-5B", lastMaint:"2026-04-23", eta:"—",      esr:0.12, rct:1.35, temp:30, fadeRate:0.000,  diagnosis:"Fully healthy. Recently maintained — all metrics nominal.", sohTrend:[98.3,98.2,98.2,98.1,98.0,98.0,97.9,97.8], rulTrend:[50,50,50,50,50,50,50,50] },
];

// ─── CAPACITOR DATA (Hrishikesh — NASA Capacitor EIS) ────────────────────────
const CAPACITOR_DATA = [
  { id:"CAP-ES10-C1", stress:"ES10", esr:0.179, cs:1459.9, zmag:0.272, phase:-20.77, sweeps:24, band:"Normal",   rul:82, diagnosis:"ESR within nominal bounds. Capacitance stable across sweep history." },
  { id:"CAP-ES10-C2", stress:"ES10", esr:0.198, cs:1420.3, zmag:0.291, phase:-19.85, sweeps:24, band:"Normal",   rul:71, diagnosis:"Minor ESR increase. Monitor over next 5 sweeps." },
  { id:"CAP-ES12-C1", stress:"ES12", esr:0.312, cs:1201.6, zmag:0.418, phase:-14.22, sweeps:31, band:"Warning",  rul:38, diagnosis:"Capacitance degraded 17.7% from baseline. ESR elevated. Schedule replacement." },
  { id:"CAP-ES12-C2", stress:"ES12", esr:0.291, cs:1255.4, zmag:0.389, phase:-15.63, sweeps:31, band:"Warning",  rul:44, diagnosis:"Phase shift anomaly detected. Cs dropping below warning threshold." },
  { id:"CAP-ES14-C1", stress:"ES14", esr:0.451, cs:988.2,  zmag:0.612, phase:-9.41,  sweeps:39, band:"Critical", rul:8,  diagnosis:"ESR 2.5x baseline — near end-of-life. Cs below 1000 µF critical limit." },
  { id:"CAP-ES14-C2", stress:"ES14", esr:0.489, cs:942.7,  zmag:0.658, phase:-8.77,  sweeps:39, band:"Critical", rul:3,  diagnosis:"Catastrophic Cs loss (35%). Phase response severely degraded. Replace immediately." },
];

// ─── C-MAPSS ENGINE DATA (Deveshree — NASA C-MAPSS Bi-LSTM) ──────────────────
// Feature sensors: s2,s3,s4,s7,s8,s9,s11,s12,s13,s14,s15,s17,s20,s21
// RUL clipped at 125 cycles, 6 operating regimes (KMeans on op1/op2)
const ENGINE_DATA = [
  { id:"ENG-FD001-E01", dataset:"FD001", regime:0, cycle:192, s2:641.82, s3:1589.7, s4:1407.8, s7:554.36, s8:2388.1, s9:9065.3, s11:47.20, s12:521.72, s13:2388.1, s14:8138.6, s15:8.4195, s17:392, s20:38.83, s21:23.419, band:"Critical", rul:8,  diagnosis:"Engine near end-of-life. High degradation across s3/s4. Immediate inspection required." },
  { id:"ENG-FD001-E05", dataset:"FD001", regime:0, cycle:143, s2:642.11, s3:1591.4, s4:1410.1, s7:554.51, s8:2388.5, s9:9068.2, s11:47.34, s12:521.94, s13:2388.5, s14:8141.3, s15:8.4241, s17:391, s20:38.76, s21:23.441, band:"Warning",  rul:33, diagnosis:"Moderate degradation pattern. s4 elevation trending — schedule maintenance soon." },
  { id:"ENG-FD001-E10", dataset:"FD001", regime:0, cycle:78,  s2:643.45, s3:1585.3, s4:1396.8, s7:553.82, s8:2387.4, s9:9062.1, s11:47.08, s12:520.81, s13:2387.4, s14:8130.2, s15:8.4082, s17:394, s20:39.10, s21:23.388, band:"Normal",   rul:95, diagnosis:"Healthy engine. All sensor readings within expected bounds for this operating regime." },
  { id:"ENG-FD002-E15", dataset:"FD002", regime:3, cycle:211, s2:553.24, s3:1358.6, s4:1184.2, s7:491.38, s8:2388.1, s9:8721.4, s11:44.63, s12:490.51, s13:2388.1, s14:7872.3, s15:8.1124, s17:354, s20:36.92, s21:22.841, band:"Critical", rul:12, diagnosis:"Multi-condition fault — Regime 3 degradation pattern. s9 anomaly detected." },
  { id:"ENG-FD003-E07", dataset:"FD003", regime:0, cycle:156, s2:644.01, s3:1587.2, s4:1402.5, s7:554.01, s8:2388.3, s9:9063.7, s11:47.15, s12:521.14, s13:2388.3, s14:8135.4, s15:8.4133, s17:393, s20:38.95, s21:23.411, band:"Warning",  rul:41, diagnosis:"Dual fault mode — compressor + HPC degradation. Monitor s4 closely." },
  { id:"ENG-FD004-E09", dataset:"FD004", regime:2, cycle:89,  s2:605.37, s3:1480.2, s4:1290.6, s7:522.85, s8:2388.2, s9:8892.5, s11:45.84, s12:506.23, s13:2388.2, s14:8003.1, s15:8.2614, s17:373, s20:37.91, s21:23.124, band:"Normal",   rul:88, diagnosis:"6-condition dataset, Regime 2. Operating nominally — low degradation rate." },
];

// ─── DEMO VALUES ──────────────────────────────────────────────────────────────
const BATTERY_DEMO_CRITICAL = { cycle_normalized:0.92, SOH:75.0, capacity_ahr:1.40, Re_norm:1.45, Rct_norm:2.10, SOH_rolling_mean:76.2, SOH_rolling_std:1.8, temperature_stress_factor:1.18, capacity_fade_rate:-0.018, ambient_temperature:42 };
const BATTERY_DEMO_NORMAL   = { cycle_normalized:0.20, SOH:97.5, capacity_ahr:1.90, Re_norm:1.01, Rct_norm:1.05, SOH_rolling_mean:97.8, SOH_rolling_std:0.2, temperature_stress_factor:1.00, capacity_fade_rate:-0.001, ambient_temperature:25 };

const CAP_DEMO_CRITICAL = { esr:0.48, cs:945,  zmag:0.65, phase:-8.5,  sweeps:40 };
const CAP_DEMO_NORMAL   = { esr:0.16, cs:1450, zmag:0.26, phase:-21.0, sweeps:8  };

const ENG_DEMO_CRITICAL = { s2:641.2, s3:1592.8, s4:1415.3, s7:555.1, s8:2388.5, s9:9071.2, s11:47.62, s12:522.8, s13:2388.5, s14:8148.3, s15:8.441, s17:389, s20:38.52, s21:23.461 };
const ENG_DEMO_NORMAL   = { s2:643.8, s3:1583.2, s4:1392.1, s7:553.4, s8:2387.1, s9:9058.4, s11:46.98, s12:520.2, s13:2387.1, s14:8126.7, s15:8.402, s17:395, s20:39.21, s21:23.371 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const RC = b => b==="Critical"?"#ff3b3b":b==="Warning"?"#ff9f1a":"#7cff6b";
const SC = s => ({
  "In-Flight":"#3bf0ff","Grounded":"#ff3b3b","Taxiing":"#ffd439","Gate":"#7cff6b"
})[s]||"#8892a4";

const CRIT_BAT  = BATTERY_AIRCRAFT.filter(a=>a.band==="Critical").length;
const WARN_BAT  = BATTERY_AIRCRAFT.filter(a=>a.band==="Warning").length;
const NORM_BAT  = BATTERY_AIRCRAFT.filter(a=>a.band==="Normal").length;
const AVG_RUL   = Math.round(BATTERY_AIRCRAFT.filter(a=>a.rul>0).reduce((s,a)=>s+a.rul,0)/BATTERY_AIRCRAFT.filter(a=>a.rul>0).length);

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Sparkline({ data, color="#3bf0ff", width=120, height=36 }) {
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*width},${height-((v-min)/range)*(height-6)-3}`).join(" ");
  const gid=`sg${color.replace(/[^a-z0-9]/gi,"")}${width}${Math.random().toString(36).slice(2,5)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RingGauge({ value, total, color, label, size=82 }) {
  const r=(size-12)/2,circ=2*Math.PI*r;
  const [anim,setAnim]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setAnim(value/total),120);return()=>clearTimeout(t);},[value,total]);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ*(1-anim)} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:"stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)"}}/>
        <text x={size/2} y={size/2-3} textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="'DM Sans',sans-serif">{value}</text>
        <text x={size/2} y={size/2+13} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="'DM Sans',sans-serif">/ {total}</text>
      </svg>
      <span style={{fontSize:9,color:"rgba(255,255,255,0.32)",letterSpacing:"0.09em",textTransform:"uppercase",fontWeight:600}}>{label}</span>
    </div>
  );
}

function StatusDot({ color }) {
  return <span style={{position:"relative",display:"inline-block",width:7,height:7,marginRight:5}}>
    <span style={{position:"absolute",inset:0,borderRadius:"50%",background:color,
      animation:color==="#3bf0ff"||color==="#ffd439"?"pulse 2s infinite":"none"}}/>
  </span>;
}

function Badge({ band }) {
  const c=RC(band);
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 10px",borderRadius:20,background:`${c}18`,color:c,fontSize:10,fontWeight:700}}>{band}</span>;
}

function GoNoGo({ band }) {
  const [c,txt]=band==="Critical"?["#ff3b3b","NO-GO — Immediate Maintenance Required"]:band==="Warning"?["#ff9f1a","CAUTION — Schedule Maintenance Soon"]:["#7cff6b","GO — Cleared for Operation"];
  return (
    <div style={{padding:"9px 14px",borderRadius:8,background:`${c}12`,border:`1px solid ${c}28`,display:"flex",alignItems:"center",gap:10,marginTop:10}}>
      <div style={{width:10,height:10,borderRadius:"50%",flexShrink:0,background:c,boxShadow:`0 0 8px ${c}`}}/>
      <span style={{fontWeight:700,fontSize:12,color:c}}>{txt}</span>
    </div>
  );
}

function SectionTitle({ icon, color="#3bf0ff", children, note }) {
  return (
    <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.13em",color:"rgba(255,255,255,0.32)",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
      <span style={{color}}>{icon}</span>{children}
      <div style={{flex:1,height:1,background:"rgba(255,255,255,0.05)"}}/>
      {note&&<span style={{fontSize:9,fontWeight:400,textTransform:"none",letterSpacing:0,color:"rgba(255,255,255,0.2)"}}>{note}</span>}
    </div>
  );
}

function DemoBtn({ onClick, color="#3bf0ff", label="Load Demo Values (Critical)" }) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 14px",borderRadius:6,border:`1px solid ${color}30`,background:`${color}0e`,
      color,fontSize:10,fontWeight:700,letterSpacing:"0.04em",cursor:"pointer",transition:"all 0.2s"
    }}>{label}</button>
  );
}

// ─── BATTERY PREDICTOR ────────────────────────────────────────────────────────
const BAT_FIELDS = [
  {key:"SOH",                    label:"SOH (%)",             min:60,    max:110,   step:0.1,   unit:"%" },
  {key:"capacity_ahr",           label:"Capacity (Ahr)",      min:1.2,   max:2.1,   step:0.01,  unit:"Ahr"},
  {key:"cycle_normalized",       label:"Cycle (norm 0–1)",    min:0,     max:1,     step:0.01,  unit:"" },
  {key:"Re_norm",                label:"Re (norm)",           min:0.8,   max:2.5,   step:0.01,  unit:"x"},
  {key:"Rct_norm",               label:"Rct (norm)",          min:0.8,   max:3.0,   step:0.01,  unit:"x"},
  {key:"SOH_rolling_mean",       label:"SOH Rolling Mean",    min:60,    max:110,   step:0.1,   unit:"%"},
  {key:"SOH_rolling_std",        label:"SOH Rolling Std",     min:0,     max:5,     step:0.01,  unit:""},
  {key:"temperature_stress_factor",label:"Temp Stress Factor",min:0.8,   max:1.3,   step:0.01,  unit:"x"},
  {key:"capacity_fade_rate",     label:"Fade Rate (/cycle)",  min:-0.05, max:0.01,  step:0.001, unit:""},
  {key:"ambient_temperature",    label:"Ambient Temp (°C)",   min:4,     max:50,    step:0.5,   unit:"°C"},
];

const BAT_DEFAULTS = {cycle_normalized:0.5,SOH:90,capacity_ahr:1.7,Re_norm:1.0,Rct_norm:1.0,SOH_rolling_mean:90,SOH_rolling_std:0.5,temperature_stress_factor:1.0,capacity_fade_rate:-0.003,ambient_temperature:25};

function BatteryPredictor() {
  const [vals,setVals]=useState(BAT_DEFAULTS);
  const [result,setResult]=useState(null);

  function predict() {
    const soh=+vals.SOH,rctN=+vals.Rct_norm,reN=+vals.Re_norm,cycN=+vals.cycle_normalized,fade=+vals.capacity_fade_rate,temp=+vals.temperature_stress_factor;
    const sohRUL=Math.max(0,((soh-70)/30)*50);
    const impPen=Math.max(0,1-((rctN-1)*0.6+(reN-1)*0.3));
    const fadePen=Math.max(0,1+fade*200);
    const cycRUL=Math.max(0,(1-cycN)*50);
    const tempPen=Math.max(0.5,2-temp);
    const raw=Math.round(sohRUL*0.45+cycRUL*0.25+sohRUL*impPen*fadePen*tempPen*0.3);
    const rul=Math.min(50,Math.max(0,raw));
    setResult({rul,band:rul<15?"Critical":rul<35?"Warning":"Normal"});
  }

  return (
    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"22px 24px"}}>
      <SectionTitle icon="⚡" color="#ffd439" note="NASA Battery XGBoost · RMSE 5.8 · R² 0.92 · Prem">
        Battery RUL Predictor
      </SectionTitle>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <DemoBtn color="#ff3b3b" label="▶ Load Critical Demo"   onClick={()=>{setVals(BATTERY_DEMO_CRITICAL);setResult(null);}}/>
        <DemoBtn color="#7cff6b" label="▶ Load Normal Demo"     onClick={()=>{setVals(BATTERY_DEMO_NORMAL);setResult(null);}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:18}}>
        {BAT_FIELDS.map(f=>(
          <div key={f.key}>
            <label style={{fontSize:9,color:"rgba(255,255,255,0.38)",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:4,fontWeight:600}}>{f.label}</label>
            <input type="number" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px 9px",color:"#e2e8f0",fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
            <input type="range" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",marginTop:3,accentColor:"#ffd439",height:2}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"rgba(255,255,255,0.18)"}}>
              <span>{f.min}{f.unit}</span><span>{f.max}{f.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={predict} style={{padding:"9px 28px",borderRadius:8,border:"1px solid rgba(255,212,57,0.3)",background:"rgba(255,212,57,0.08)",color:"#ffd439",fontSize:12,fontWeight:700,letterSpacing:"0.04em",cursor:"pointer"}}>
        ▶ Run RUL Prediction
      </button>
      {result&&(
        <div style={{marginTop:16,display:"flex",alignItems:"center",gap:22,padding:"16px 20px",borderRadius:10,background:`${RC(result.band)}08`,border:`1px solid ${RC(result.band)}25`,animation:"fadeIn 0.4s ease"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Predicted RUL</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:40,fontWeight:800,color:RC(result.band),lineHeight:1}}>
              {result.rul}<span style={{fontSize:12,fontWeight:400,color:"rgba(255,255,255,0.28)"}}> cyc</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <Badge band={result.band}/>
            <GoNoGo band={result.band}/>
          </div>
          <div style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.28)",lineHeight:1.8}}>
            <div>SOH: {(+vals.SOH).toFixed(1)}%</div>
            <div>Rct: {(+vals.Rct_norm).toFixed(2)}×</div>
            <div>Fade: {(+vals.capacity_fade_rate).toFixed(3)}/cyc</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CAPACITOR PREDICTOR ─────────────────────────────────────────────────────
const CAP_FIELDS = [
  {key:"esr",    label:"ESR (Ω)",       min:0.10, max:0.60, step:0.001},
  {key:"cs",     label:"Cs (µF)",       min:800,  max:1600, step:1   },
  {key:"zmag",   label:"Zmag (Ω)",      min:0.15, max:0.80, step:0.001},
  {key:"phase",  label:"Phase (°)",     min:-40,  max:-5,   step:0.1 },
  {key:"sweeps", label:"Sweep Number",  min:1,    max:50,   step:1   },
];

const CAP_DEFAULTS = {esr:0.18,cs:1450,zmag:0.27,phase:-20,sweeps:10};

function CapacitorPredictor() {
  const [vals,setVals]=useState(CAP_DEFAULTS);
  const [result,setResult]=useState(null);

  function predict() {
    const esr=+vals.esr,cs=+vals.cs,sw=+vals.sweeps;
    const esrF=Math.max(0,1-(esr-0.18)/(0.45-0.18));
    const csF =Math.max(0,(cs-900)/(1460-900));
    const swF =Math.max(0,1-sw/50);
    const rul =Math.min(90,Math.max(0,Math.round((esrF*0.5+csF*0.35+swF*0.15)*90)));
    setResult({rul,band:rul<20?"Critical":rul<50?"Warning":"Normal"});
  }

  return (
    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"22px 24px"}}>
      <SectionTitle icon="⚙" color="#a78bfa" note="NASA Capacitor EIS Dataset · Hrishikesh">
        Capacitor Degradation Predictor
      </SectionTitle>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <DemoBtn color="#ff3b3b" label="▶ Load Critical Demo" onClick={()=>{setVals(CAP_DEMO_CRITICAL);setResult(null);}}/>
        <DemoBtn color="#7cff6b" label="▶ Load Normal Demo"   onClick={()=>{setVals(CAP_DEMO_NORMAL);setResult(null);}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:18}}>
        {CAP_FIELDS.map(f=>(
          <div key={f.key}>
            <label style={{fontSize:9,color:"rgba(255,255,255,0.38)",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:4,fontWeight:600}}>{f.label}</label>
            <input type="number" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px 9px",color:"#e2e8f0",fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
            <input type="range" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",marginTop:3,accentColor:"#a78bfa",height:2}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"rgba(255,255,255,0.18)"}}>
              <span>{f.min}</span><span>{f.max}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={predict} style={{padding:"9px 28px",borderRadius:8,border:"1px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.08)",color:"#a78bfa",fontSize:12,fontWeight:700,letterSpacing:"0.04em",cursor:"pointer"}}>
        ▶ Run Capacitor RUL
      </button>
      {result&&(
        <div style={{marginTop:16,display:"flex",alignItems:"center",gap:22,padding:"16px 20px",borderRadius:10,background:`${RC(result.band)}08`,border:`1px solid ${RC(result.band)}25`,animation:"fadeIn 0.4s ease"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Predicted RUL</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:40,fontWeight:800,color:RC(result.band),lineHeight:1}}>
              {result.rul}<span style={{fontSize:12,fontWeight:400,color:"rgba(255,255,255,0.28)"}}> sweeps</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <Badge band={result.band}/>
            <GoNoGo band={result.band}/>
          </div>
          <div style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.28)",lineHeight:1.8}}>
            <div>ESR: {(+vals.esr).toFixed(3)} Ω</div>
            <div>Cs: {(+vals.cs).toFixed(0)} µF</div>
            <div>Phase: {(+vals.phase).toFixed(1)}°</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── C-MAPSS ENGINE PREDICTOR (Deveshree — Bi-LSTM) ─────────────────────────
const ENG_FIELDS = [
  {key:"s2",  label:"s2 — Fan Inlet Temp",       min:550, max:650, step:0.1 },
  {key:"s3",  label:"s3 — HPC Out Temp",          min:1350,max:1620,step:0.1 },
  {key:"s4",  label:"s4 — HPT Out Temp",          min:1180,max:1450,step:0.1 },
  {key:"s7",  label:"s7 — HPC Out Pressure",      min:475, max:570, step:0.1 },
  {key:"s8",  label:"s8 — Physical Fan Speed",    min:2386,max:2391,step:0.01},
  {key:"s9",  label:"s9 — Physical Core Speed",   min:9050,max:9080,step:0.1 },
  {key:"s11", label:"s11 — HPT Coolant Bleed",    min:46,  max:48,  step:0.01},
  {key:"s12", label:"s12 — LPT Efficiency",       min:515, max:525, step:0.1 },
  {key:"s13", label:"s13 — LPT Flow",             min:2385,max:2392,step:0.01},
  {key:"s14", label:"s14 — BPR",                  min:8100,max:8160,step:0.1 },
  {key:"s15", label:"s15 — Bleed Enthalpy",       min:8.38,max:8.46,step:0.001},
  {key:"s17", label:"s17 — HPT Cool Flow",        min:385, max:400, step:0.1 },
  {key:"s20", label:"s20 — Bypass Ratio",         min:38,  max:40,  step:0.01},
  {key:"s21", label:"s21 — Vibrational Energy",   min:23.3,max:23.5,step:0.001},
];

const ENG_DEFAULTS = {s2:643,s3:1586,s4:1400,s7:554,s8:2388.1,s9:9063,s11:47.1,s12:521,s13:2388.1,s14:8134,s15:8.413,s17:393,s20:39.0,s21:23.40};

function EnginePredictor() {
  const [vals,setVals]=useState(ENG_DEFAULTS);
  const [result,setResult]=useState(null);

  function predict() {
    // Heuristic based on C-MAPSS degradation patterns from Deveshree's Bi-LSTM analysis
    // Healthy baselines: s3~1586, s4~1400, s9~9063, s11~47.1
    // Degradation: s3/s4 rise, s9 drops, s11 changes — these are top SHAP features
    const s3=+vals.s3, s4=+vals.s4, s9=+vals.s9, s11=+vals.s11, s12=+vals.s12;

    const s3score  = Math.max(0, 1-(s3-1585)/(1615-1585));   // rises with degradation
    const s4score  = Math.max(0, 1-(s4-1398)/(1445-1398));   // rises with degradation
    const s9score  = Math.max(0, (s9-9050)/(9075-9050));      // drops with degradation
    const s11score = Math.max(0, 1-Math.abs(s11-47.1)/1.2);  // deviates with degradation
    const s12score = Math.max(0, (s12-515)/(525-515));         // key efficiency sensor

    const health = s3score*0.30 + s4score*0.25 + s9score*0.20 + s11score*0.15 + s12score*0.10;
    const rul    = Math.min(125, Math.max(0, Math.round(health*125)));
    const band   = rul<30?"Critical":rul<70?"Warning":"Normal";

    // Map to C-MAPSS degradation mode
    const mode = s3>1600&&s4>1430 ? "HPC+HPT degradation (Dual-fault mode)" :
                 s3>1595           ? "High-pressure compressor wear" :
                 s9<9055           ? "Core speed anomaly — HPT degradation" :
                                     "Normal operation — within regime bounds";
    setResult({rul,band,mode});
  }

  return (
    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"22px 24px"}}>
      <SectionTitle icon="✈" color="#38bdf8" note="NASA C-MAPSS · Bi-LSTM · RUL clip 125 · 6 regimes · Deveshree">
        Engine RUL Predictor (C-MAPSS)
      </SectionTitle>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <DemoBtn color="#ff3b3b" label="▶ Load Degraded Engine Demo" onClick={()=>{setVals(ENG_DEMO_CRITICAL);setResult(null);}}/>
        <DemoBtn color="#7cff6b" label="▶ Load Healthy Engine Demo"  onClick={()=>{setVals(ENG_DEMO_NORMAL);setResult(null);}}/>
      </div>
      <div style={{background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:8,padding:"8px 14px",marginBottom:14,fontSize:10,color:"rgba(255,255,255,0.4)"}}>
        Top SHAP features (from Deveshree's analysis): <span style={{color:"#38bdf8",fontWeight:700}}>s3 (HPC Out Temp) · s4 (HPT Out Temp) · s9 (Core Speed) · s11 (Coolant Bleed) · s12 (LPT Efficiency)</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:18}}>
        {ENG_FIELDS.map(f=>(
          <div key={f.key}>
            <label style={{fontSize:9,color:"rgba(255,255,255,0.38)",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4,fontWeight:600,lineHeight:1.3}}>{f.label}</label>
            <input type="number" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px 9px",color:"#e2e8f0",fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
            <input type="range" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",marginTop:3,accentColor:"#38bdf8",height:2}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"rgba(255,255,255,0.18)"}}>
              <span>{f.min}</span><span>{f.max}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={predict} style={{padding:"9px 28px",borderRadius:8,border:"1px solid rgba(56,189,248,0.3)",background:"rgba(56,189,248,0.08)",color:"#38bdf8",fontSize:12,fontWeight:700,letterSpacing:"0.04em",cursor:"pointer"}}>
        ▶ Run Engine RUL Prediction
      </button>
      {result&&(
        <div style={{marginTop:16,display:"flex",alignItems:"center",gap:22,padding:"16px 20px",borderRadius:10,background:`${RC(result.band)}08`,border:`1px solid ${RC(result.band)}25`,animation:"fadeIn 0.4s ease"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Predicted RUL</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:40,fontWeight:800,color:RC(result.band),lineHeight:1}}>
              {result.rul}<span style={{fontSize:12,fontWeight:400,color:"rgba(255,255,255,0.28)"}}> cyc</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <Badge band={result.band}/>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:6}}>
              Mode: <span style={{color:"#e2e8f0",fontWeight:600}}>{result.mode}</span>
            </div>
            <GoNoGo band={result.band}/>
          </div>
          <div style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.28)",lineHeight:1.8}}>
            <div>s3: {(+vals.s3).toFixed(1)}</div>
            <div>s4: {(+vals.s4).toFixed(1)}</div>
            <div>s9: {(+vals.s9).toFixed(1)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FULL PREDICTION PAGE ────────────────────────────────────────────────────
function FullPrediction() {
  // Battery state
  const [batVals, setBatVals] = useState({
    cycle_normalized:0.5, SOH:90, capacity_ahr:1.7, Re_norm:1.0, Rct_norm:1.0,
    SOH_rolling_mean:90, SOH_rolling_std:0.5, temperature_stress_factor:1.0,
    capacity_fade_rate:-0.003, ambient_temperature:25,
  });
  const [batResult, setBatResult] = useState(null);

  // Capacitor state
  const [capVals, setCapVals] = useState({ esr:0.18, cs:1450, zmag:0.27, phase:-20, sweeps:10 });
  const [capResult, setCapResult] = useState(null);

  // Engine state
  const [engVals, setEngVals] = useState({
    s2:643, s3:1586, s4:1400, s7:554, s8:2388.1, s9:9063,
    s11:47.1, s12:521, s13:2388.1, s14:8134, s15:8.413, s17:393, s20:39.0, s21:23.40,
  });
  const [engResult, setEngResult] = useState(null);

  // ── predict functions (same logic as individual predictors) ─────────────────
  function predictBat(v) {
    const soh=+v.SOH, rctN=+v.Rct_norm, reN=+v.Re_norm, cycN=+v.cycle_normalized;
    const fade=+v.capacity_fade_rate, temp=+v.temperature_stress_factor;
    const sohRUL=Math.max(0,((soh-70)/30)*50);
    const impPen=Math.max(0,1-((rctN-1)*0.6+(reN-1)*0.3));
    const fadePen=Math.max(0,1+fade*200);
    const cycRUL=Math.max(0,(1-cycN)*50);
    const tempPen=Math.max(0.5,2-temp);
    const rul=Math.min(50,Math.max(0,Math.round(sohRUL*0.45+cycRUL*0.25+sohRUL*impPen*fadePen*tempPen*0.3)));
    return { rul, band:rul<15?"Critical":rul<35?"Warning":"Normal" };
  }

  function predictCap(v) {
    const esr=+v.esr, cs=+v.cs, sw=+v.sweeps;
    const esrF=Math.max(0,1-(esr-0.18)/(0.45-0.18));
    const csF=Math.max(0,(cs-900)/(1460-900));
    const swF=Math.max(0,1-sw/50);
    const rul=Math.min(90,Math.max(0,Math.round((esrF*0.5+csF*0.35+swF*0.15)*90)));
    return { rul, band:rul<20?"Critical":rul<50?"Warning":"Normal" };
  }

  function predictEng(v) {
    const s3=+v.s3, s4=+v.s4, s9=+v.s9, s11=+v.s11, s12=+v.s12;
    const s3s=Math.max(0,1-(s3-1585)/(1615-1585));
    const s4s=Math.max(0,1-(s4-1398)/(1445-1398));
    const s9s=Math.max(0,(s9-9050)/(9075-9050));
    const s11s=Math.max(0,1-Math.abs(s11-47.1)/1.2);
    const s12s=Math.max(0,(s12-515)/(525-515));
    const rul=Math.min(125,Math.max(0,Math.round((s3s*0.30+s4s*0.25+s9s*0.20+s11s*0.15+s12s*0.10)*125)));
    const mode=s3>1600&&s4>1430?"HPC+HPT degradation":s3>1595?"HPC wear":s9<9055?"Core speed anomaly":"Normal";
    return { rul, band:rul<30?"Critical":rul<70?"Warning":"Normal", mode };
  }

  function runAll() {
    setBatResult(predictBat(batVals));
    setCapResult(predictCap(capVals));
    setEngResult(predictEng(engVals));
  }

  function loadDemoAll(type) {
    if (type === "critical") {
      setBatVals(BATTERY_DEMO_CRITICAL);
      setCapVals(CAP_DEMO_CRITICAL);
      setEngVals(ENG_DEMO_CRITICAL);
    } else {
      setBatVals(BATTERY_DEMO_NORMAL);
      setCapVals(CAP_DEMO_NORMAL);
      setEngVals(ENG_DEMO_NORMAL);
    }
    setBatResult(null); setCapResult(null); setEngResult(null);
  }

  // Overall decision: worst band across all 3 results
  const allResults = [batResult, capResult, engResult].filter(Boolean);
  const overallBand = allResults.some(r=>r.band==="Critical") ? "Critical"
                    : allResults.some(r=>r.band==="Warning")  ? "Warning"
                    : allResults.length===3                    ? "Normal"
                    : null;

  const MONO = { fontFamily:"'JetBrains Mono',monospace" };

  // ── field renderer ─────────────────────────────────────────────────────────
  function FieldGrid({ fields, vals, setVals, accent }) {
    return (
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
        {fields.map(f=>(
          <div key={f.key}>
            <label style={{fontSize:8,color:"rgba(255,255,255,0.36)",textTransform:"uppercase",letterSpacing:"0.07em",display:"block",marginBottom:3,fontWeight:700,lineHeight:1.3}}>{f.label}</label>
            <input type="number" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12,...MONO,outline:"none"}}/>
            <input type="range" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
              onChange={e=>setVals({...vals,[f.key]:e.target.value})}
              style={{width:"100%",marginTop:3,accentColor:accent,height:2}}/>
          </div>
        ))}
      </div>
    );
  }

  // ── result pill ────────────────────────────────────────────────────────────
  function ResultPill({ result, unit }) {
    if (!result) return <span style={{fontSize:11,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>Not run yet</span>;
    return (
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{...MONO,fontSize:26,fontWeight:800,color:RC(result.band),lineHeight:1}}>
          {result.rul}<span style={{fontSize:10,fontWeight:400,color:"rgba(255,255,255,0.3)"}}> {unit}</span>
        </span>
        <Badge band={result.band}/>
        {result.mode && <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{result.mode}</span>}
      </div>
    );
  }

  const batFields = [
    {key:"SOH",label:"SOH (%)",min:60,max:110,step:0.1},
    {key:"capacity_ahr",label:"Capacity (Ahr)",min:1.2,max:2.1,step:0.01},
    {key:"cycle_normalized",label:"Cycle (0–1)",min:0,max:1,step:0.01},
    {key:"Re_norm",label:"Re norm",min:0.8,max:2.5,step:0.01},
    {key:"Rct_norm",label:"Rct norm",min:0.8,max:3.0,step:0.01},
    {key:"SOH_rolling_mean",label:"SOH Roll Mean",min:60,max:110,step:0.1},
    {key:"SOH_rolling_std",label:"SOH Roll Std",min:0,max:5,step:0.01},
    {key:"temperature_stress_factor",label:"Temp Stress",min:0.8,max:1.3,step:0.01},
    {key:"capacity_fade_rate",label:"Fade Rate",min:-0.05,max:0.01,step:0.001},
    {key:"ambient_temperature",label:"Ambient (°C)",min:4,max:50,step:0.5},
  ];
  const capFields = [
    {key:"esr",label:"ESR (Ω)",min:0.10,max:0.60,step:0.001},
    {key:"cs",label:"Cs (µF)",min:800,max:1600,step:1},
    {key:"zmag",label:"Zmag (Ω)",min:0.15,max:0.80,step:0.001},
    {key:"phase",label:"Phase (°)",min:-40,max:-5,step:0.1},
    {key:"sweeps",label:"Sweep #",min:1,max:50,step:1},
  ];
  const engFields = [
    {key:"s2",label:"s2 Fan Inlet",min:550,max:650,step:0.1},
    {key:"s3",label:"s3 HPC Temp",min:1350,max:1620,step:0.1},
    {key:"s4",label:"s4 HPT Temp",min:1180,max:1450,step:0.1},
    {key:"s7",label:"s7 HPC Press",min:475,max:570,step:0.1},
    {key:"s8",label:"s8 Fan Speed",min:2386,max:2391,step:0.01},
    {key:"s9",label:"s9 Core Speed",min:9050,max:9080,step:0.1},
    {key:"s11",label:"s11 Coolant",min:46,max:48,step:0.01},
    {key:"s12",label:"s12 LPT Eff",min:515,max:525,step:0.1},
    {key:"s13",label:"s13 LPT Flow",min:2385,max:2392,step:0.01},
    {key:"s14",label:"s14 BPR",min:8100,max:8160,step:0.1},
    {key:"s15",label:"s15 Bleed",min:8.38,max:8.46,step:0.001},
    {key:"s17",label:"s17 HPT Cool",min:385,max:400,step:0.1},
    {key:"s20",label:"s20 Bypass",min:38,max:40,step:0.01},
    {key:"s21",label:"s21 Vibration",min:23.3,max:23.5,step:0.001},
  ];

  const sectionCard = (color, icon, title, by, note, children, result, unit) => (
    <div style={{background:"rgba(255,255,255,0.022)",border:`1px solid ${color}20`,borderRadius:14,overflow:"hidden"}}>
      {/* header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${color}15`,background:`${color}06`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>{icon}</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{title}</div>
            <div style={{fontSize:9,color:color,fontWeight:600,letterSpacing:"0.06em"}}>{by} · {note}</div>
          </div>
        </div>
        <ResultPill result={result} unit={unit}/>
      </div>
      {/* fields */}
      <div style={{padding:"16px 20px"}}>{children}</div>
    </div>
  );

  return (
    <div style={{animation:"fadeIn 0.4s ease"}}>
      {/* Page header */}
      <div style={{marginBottom:18}}>
        <h2 style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",background:"linear-gradient(135deg,#3bf0ff,#a78bfa,#ffd439)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Full Aircraft Readiness Prediction
        </h2>
        <p style={{fontSize:11,color:"rgba(255,255,255,0.28)",marginTop:3}}>
          Enter readings for all three components → run combined prediction → get overall Go/No-Go
        </p>
      </div>

      {/* Demo + Run buttons */}
      <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center"}}>
        <button onClick={()=>loadDemoAll("critical")} style={{padding:"8px 18px",borderRadius:8,border:"1px solid rgba(255,59,59,0.35)",background:"rgba(255,59,59,0.08)",color:"#ff3b3b",fontSize:11,fontWeight:700,cursor:"pointer"}}>
          ⚡ Load All — Critical Demo
        </button>
        <button onClick={()=>loadDemoAll("normal")} style={{padding:"8px 18px",borderRadius:8,border:"1px solid rgba(124,255,107,0.35)",background:"rgba(124,255,107,0.08)",color:"#7cff6b",fontSize:11,fontWeight:700,cursor:"pointer"}}>
          ✓ Load All — Normal Demo
        </button>
        <div style={{flex:1}}/>
        <button onClick={runAll} style={{padding:"10px 32px",borderRadius:9,border:"1px solid rgba(59,240,255,0.4)",background:"linear-gradient(135deg,rgba(59,240,255,0.12),rgba(167,139,250,0.12))",color:"#3bf0ff",fontSize:13,fontWeight:800,letterSpacing:"0.04em",cursor:"pointer",boxShadow:"0 0 24px rgba(59,240,255,0.1)"}}>
          ▶▶ Run Full Prediction
        </button>
      </div>

      {/* Overall verdict — shown only after all 3 are run */}
      {overallBand && (
        <div style={{
          marginBottom:20, padding:"18px 24px", borderRadius:13,
          background:`${RC(overallBand)}0c`, border:`1.5px solid ${RC(overallBand)}35`,
          display:"flex", alignItems:"center", gap:20, animation:"fadeIn 0.5s ease"
        }}>
          <div style={{width:16,height:16,borderRadius:"50%",background:RC(overallBand),boxShadow:`0 0 16px ${RC(overallBand)}`,flexShrink:0}}/>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Overall Aircraft Readiness — Combined Decision</div>
            <div style={{fontSize:20,fontWeight:800,color:RC(overallBand)}}>
              {overallBand==="Critical" ? "NO-GO — Aircraft Not Flight Ready. Immediate Maintenance Required."
               : overallBand==="Warning" ? "CAUTION — Schedule Maintenance Before Next Flight."
               : "GO — Aircraft Cleared for Flight. All Components Nominal."}
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:24}}>
            {[
              {l:"Battery RUL",   v:batResult?`${batResult.rul} cyc`:"—",  c:batResult?RC(batResult.band):"rgba(255,255,255,0.25)"},
              {l:"Capacitor RUL", v:capResult?`${capResult.rul} sw`:"—",   c:capResult?RC(capResult.band):"rgba(255,255,255,0.25)"},
              {l:"Engine RUL",    v:engResult?`${engResult.rul} cyc`:"—",  c:engResult?RC(engResult.band):"rgba(255,255,255,0.25)"},
            ].map(m=>(
              <div key={m.l} style={{textAlign:"center"}}>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{m.l}</div>
                <div style={{...MONO,fontSize:18,fontWeight:800,color:m.c}}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Three component sections */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {sectionCard("#ffd439","⚡","Battery RUL","Prem · XGBoost","NASA Battery · EOL 1.4 Ahr · RMSE 5.8 · R² 0.92",
          <FieldGrid fields={batFields} vals={batVals} setVals={setBatVals} accent="#ffd439"/>,
          batResult,"cyc"
        )}
        {sectionCard("#a78bfa","⚙","Capacitor EIS","Hrishikesh","NASA Capacitor · EIS Spectroscopy · ESR/Cs degradation",
          <FieldGrid fields={capFields} vals={capVals} setVals={setCapVals} accent="#a78bfa"/>,
          capResult,"sweeps"
        )}
        {sectionCard("#38bdf8","✈","Engine C-MAPSS","Deveshree · Bi-LSTM","FD001–FD004 · 6 regimes · RUL clip 125 · SHAP",
          <FieldGrid fields={engFields} vals={engVals} setVals={setEngVals} accent="#38bdf8"/>,
          engResult,"cyc"
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const PAGES = ["Fleet Overview","Battery Monitor","Capacitor Health","Engine C-MAPSS","Predictor Tool","Full Prediction"];

export default function App() {
  const [page,setPage]         = useState(0);
  const [batFilter,setBatFilter]= useState("All");
  const [selBat,setSelBat]     = useState(null);
  const [time,setTime]         = useState(new Date());
  const [predTab,setPredTab]   = useState(0);

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);
  const utc=time.toISOString().slice(11,19)+" UTC";

  const filtBat=batFilter==="All"?BATTERY_AIRCRAFT:BATTERY_AIRCRAFT.filter(a=>a.band===batFilter);

  const S={
    app:  {minHeight:"100vh",background:"linear-gradient(145deg,#060a14 0%,#0a0e1a 40%,#0d1321 100%)",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0"},
    grid: {position:"fixed",top:0,left:0,right:0,bottom:0,backgroundImage:"linear-gradient(rgba(59,240,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(59,240,255,0.018) 1px,transparent 1px)",backgroundSize:"55px 55px",pointerEvents:"none",zIndex:0},
    top:  {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 28px",borderBottom:"1px solid rgba(59,240,255,0.07)",background:"rgba(6,10,20,0.92)",backdropFilter:"blur(24px)",position:"sticky",top:0,zIndex:100},
    body: {padding:"20px 28px",position:"relative",zIndex:1},
    card: {background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"18px 20px"},
    th:   {padding:"10px 15px",textAlign:"left",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.28)",borderBottom:"1px solid rgba(255,255,255,0.05)",whiteSpace:"nowrap"},
    td:   {padding:"12px 15px",fontSize:12,borderBottom:"1px solid rgba(255,255,255,0.03)",verticalAlign:"middle"},
    mono: {fontFamily:"'JetBrains Mono',monospace"},
  };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300..800&family=JetBrains+Mono:wght@400;600&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.8)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(59,240,255,0.15);border-radius:3px}
        table{border-collapse:collapse;width:100%}
        tr{transition:background 0.15s}
        button{cursor:pointer;font-family:'DM Sans',sans-serif}
        input[type=number]{-moz-appearance:textfield}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
      `}</style>
      <div style={S.grid}/>

      {/* TOP BAR */}
      <div style={S.top}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#3bf0ff,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#060a14",boxShadow:"0 0 16px rgba(59,240,255,0.28)"}}>K</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#fff,#94a3b8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Kansas Fleet — IFRPM</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.22)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Intelligent Flight Readiness & Predictive Maintenance</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {PAGES.map((label,i)=>(
            <button key={i} onClick={()=>setPage(i)} style={{
              padding:"5px 14px",borderRadius:7,fontSize:10,fontWeight:600,letterSpacing:"0.02em",transition:"all 0.2s",
              border:page===i?"1px solid rgba(59,240,255,0.25)":"1px solid transparent",
              background:page===i?"rgba(59,240,255,0.1)":"transparent",
              color:page===i?"#3bf0ff":"rgba(255,255,255,0.32)",
            }}>{label}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#7cff6b",display:"inline-block",boxShadow:"0 0 5px #7cff6b"}}/>
            <span style={{color:"rgba(255,255,255,0.3)"}}>Live</span>
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",...S.mono}}>{utc}</div>
        </div>
      </div>

      <div style={S.body}>

        {/* ── PAGE 0: Fleet Overview ──────────────────────────────────────── */}
        {page===0&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {/* KPI */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
              <div style={S.card}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginBottom:8}}>Total Monitored</div>
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:36,fontWeight:800,color:"#fff",lineHeight:1}}>{BATTERY_AIRCRAFT.length+CAPACITOR_DATA.length+ENGINE_DATA.length}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.26)",marginTop:3}}>components · 3 datasets</div>
                  </div>
                  <Sparkline data={[12,14,15,16,17,18,19,21]} color="#3bf0ff" width={62} height={26}/>
                </div>
              </div>
              <div style={S.card}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginBottom:6}}>Battery Fleet Health</div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:2}}>
                  <RingGauge value={NORM_BAT} total={BATTERY_AIRCRAFT.length} color="#7cff6b" label="Normal"  size={68}/>
                  <RingGauge value={WARN_BAT} total={BATTERY_AIRCRAFT.length} color="#ff9f1a" label="Warning" size={68}/>
                  <RingGauge value={CRIT_BAT} total={BATTERY_AIRCRAFT.length} color="#ff3b3b" label="Critical" size={68}/>
                </div>
              </div>
              <div style={S.card}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginBottom:8}}>Predicted Failures 48h</div>
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:36,fontWeight:800,color:"#ff3b3b",lineHeight:1}}>{BATTERY_AIRCRAFT.filter(a=>a.rul<=15).length+CAPACITOR_DATA.filter(c=>c.band==="Critical").length}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.26)",marginTop:3}}>batteries + capacitors at EOL</div>
                  </div>
                  <div style={{fontSize:11,textAlign:"right",lineHeight:1.8}}>
                    <div style={{color:"#ff3b3b"}}>▲ {CRIT_BAT+CAPACITOR_DATA.filter(c=>c.band==="Critical").length} critical</div>
                    <div style={{color:"#ff9f1a"}}>● {WARN_BAT+CAPACITOR_DATA.filter(c=>c.band==="Warning").length} warning</div>
                  </div>
                </div>
              </div>
              <div style={S.card}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginBottom:8}}>Avg Battery RUL</div>
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:36,fontWeight:800,color:"#ffd439",lineHeight:1}}>{AVG_RUL}<span style={{fontSize:12,fontWeight:400}}> cyc</span></div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.26)",marginTop:3}}>RMSE 5.8 · R² 0.92</div>
                  </div>
                  <Sparkline data={[80,72,66,60,54,50,48,AVG_RUL]} color="#ffd439" width={62} height={26}/>
                </div>
              </div>
            </div>

            {/* Combined Table */}
            <SectionTitle icon="◆" color="#3bf0ff" note="Battery · Capacitor · C-MAPSS Engine">All Datasets — Component Summary</SectionTitle>
            <div style={{...S.card,padding:0,overflow:"hidden",marginBottom:22}}>
              <table>
                <thead><tr>
                  {["Dataset","Component","Type / Label","RUL","Risk Band","Key Metric","Decision"].map(h=><th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {BATTERY_AIRCRAFT.slice(0,4).map(a=>(
                    <tr key={a.id}>
                      <td style={{...S.td,fontSize:10,color:"rgba(255,255,255,0.32)"}}>Battery (Prem)</td>
                      <td style={{...S.td,...S.mono,fontWeight:700,color:"#fff"}}>{a.id}</td>
                      <td style={{...S.td,fontSize:11}}><StatusDot color={SC(a.status)}/>{a.status}</td>
                      <td style={{...S.td,...S.mono,color:a.rul===0?"#ff3b3b":a.rul<30?"#ff9f1a":"#ffd439",fontWeight:700}}>{a.rul} cyc</td>
                      <td style={S.td}><Badge band={a.band}/></td>
                      <td style={{...S.td,fontSize:11,color:"rgba(255,255,255,0.42)"}}>SOH {a.soh}% · Rct {a.rct.toFixed(2)}×</td>
                      <td style={S.td}><span style={{color:RC(a.band),fontWeight:700,fontSize:11}}>{a.band==="Critical"?"NO-GO":a.band==="Warning"?"CAUTION":"GO"}</span></td>
                    </tr>
                  ))}
                  {CAPACITOR_DATA.slice(0,3).map(c=>(
                    <tr key={c.id}>
                      <td style={{...S.td,fontSize:10,color:"rgba(255,255,255,0.32)"}}>Capacitor (Hrishi)</td>
                      <td style={{...S.td,...S.mono,fontWeight:700,color:"#fff"}}>{c.id}</td>
                      <td style={{...S.td,fontSize:11,color:"rgba(255,255,255,0.45)"}}>EIS Sweep #{c.sweeps}</td>
                      <td style={{...S.td,...S.mono,color:c.rul<20?"#ff3b3b":c.rul<50?"#ff9f1a":"#ffd439",fontWeight:700}}>{c.rul} sw</td>
                      <td style={S.td}><Badge band={c.band}/></td>
                      <td style={{...S.td,fontSize:11,color:"rgba(255,255,255,0.42)"}}>ESR {c.esr.toFixed(3)}Ω · Cs {c.cs.toFixed(0)}µF</td>
                      <td style={S.td}><span style={{color:RC(c.band),fontWeight:700,fontSize:11}}>{c.band==="Critical"?"NO-GO":c.band==="Warning"?"CAUTION":"GO"}</span></td>
                    </tr>
                  ))}
                  {ENGINE_DATA.slice(0,3).map(e=>(
                    <tr key={e.id}>
                      <td style={{...S.td,fontSize:10,color:"rgba(255,255,255,0.32)"}}>Engine (Deveshree)</td>
                      <td style={{...S.td,...S.mono,fontWeight:700,color:"#fff"}}>{e.id}</td>
                      <td style={{...S.td,fontSize:11,color:"rgba(255,255,255,0.45)"}}>{e.dataset} · Regime {e.regime}</td>
                      <td style={{...S.td,...S.mono,color:e.rul<30?"#ff3b3b":e.rul<70?"#ff9f1a":"#ffd439",fontWeight:700}}>{e.rul} cyc</td>
                      <td style={S.td}><Badge band={e.band}/></td>
                      <td style={{...S.td,fontSize:11,color:"rgba(255,255,255,0.42)"}}>s3={e.s3.toFixed(1)} · s4={e.s4.toFixed(1)} · s9={e.s9.toFixed(1)}</td>
                      <td style={S.td}><span style={{color:RC(e.band),fontWeight:700,fontSize:11}}>{e.band==="Critical"?"NO-GO":e.band==="Warning"?"CAUTION":"GO"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Model Cards */}
            <SectionTitle icon="▣" color="#ffd439">Model Performance Summary</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {[
                {title:"Battery RUL — XGBoost",      who:"Prem",     color:"#ffd439", metrics:[{l:"RMSE",v:"5.80 cycles"},{l:"MAE",v:"3.30 cycles"},{l:"R²",v:"0.92"},{l:"NASA Score",v:"181.9"}],       note:"NASA Battery Dataset (PCoE) · 34 batteries · EOL 1.4 Ahr · 2771 discharge cycles"},
                {title:"Capacitor EIS — Degradation", who:"Hrishikesh",color:"#a78bfa",metrics:[{l:"Dataset",v:"NASA Capacitor"},{l:"Features",v:"ESR, Cs, Zmag, Phase"},{l:"Stress IDs",v:"ES10–ES16"},{l:"Sweeps",v:"1657 records"}], note:"EIS Impedance Spectroscopy · Multi-stress level degradation analysis"},
                {title:"Engine RUL — Bi-LSTM",        who:"Deveshree", color:"#38bdf8", metrics:[{l:"Model",v:"Bi-LSTM (2-layer)"},{l:"Datasets",v:"FD001–FD004"},{l:"RUL Clip",v:"125 cycles"},{l:"Regimes",v:"6 (KMeans)"}],          note:"NASA C-MAPSS · Per-regime MinMaxScaler · 14 sensors + rolling features · SHAP explainability"},
              ].map(m=>(
                <div key={m.title} style={{...S.card,borderTop:`3px solid ${m.color}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:2}}>{m.title}</div>
                  <div style={{fontSize:10,color:m.color,marginBottom:12,fontWeight:600}}>{m.who}</div>
                  {m.metrics.map(mt=>(
                    <div key={mt.l} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                      <span style={{fontSize:10,color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{mt.l}</span>
                      <span style={{...S.mono,fontSize:12,fontWeight:700,color:"#fff"}}>{mt.v}</span>
                    </div>
                  ))}
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:8,marginTop:4,lineHeight:1.5}}>{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PAGE 1: Battery Monitor ─────────────────────────────────────── */}
        {page===1&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{marginBottom:16}}>
              <h2 style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",background:"linear-gradient(135deg,#ffd439,#ff9f1a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Battery Fleet Monitor</h2>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.28)",marginTop:3}}>NASA Battery Degradation Dataset (PCoE) · Prem · XGBoost · RMSE 5.8 · R² 0.92 · EOL threshold 1.4 Ahr</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {["All","Critical","Warning","Normal"].map(f=>(
                <button key={f} onClick={()=>setBatFilter(f)} style={{
                  padding:"4px 14px",borderRadius:18,fontSize:10,fontWeight:700,transition:"all 0.2s",
                  border:`1px solid ${batFilter===f?(f==="Critical"?"#ff3b3b":f==="Warning"?"#ff9f1a":f==="Normal"?"#7cff6b":"rgba(59,240,255,0.4)"):"rgba(255,255,255,0.08)"}`,
                  background:batFilter===f?`${f==="Critical"?"#ff3b3b":f==="Warning"?"#ff9f1a":f==="Normal"?"#7cff6b":"#3bf0ff"}14`:"transparent",
                  color:batFilter===f?(f==="Critical"?"#ff3b3b":f==="Warning"?"#ff9f1a":f==="Normal"?"#7cff6b":"#3bf0ff"):"rgba(255,255,255,0.32)",
                }}>{f} ({(f==="All"?BATTERY_AIRCRAFT:BATTERY_AIRCRAFT.filter(a=>a.band===f)).length})</button>
              ))}
            </div>
            <div style={{...S.card,padding:0,overflow:"hidden",marginBottom:20}}>
              <table>
                <thead><tr>
                  {["Aircraft","Risk","RUL","SOH%","Route","Status","Pax","ETA","ESR (Ω)","Rct (×)","Temp","Trend"].map(h=><th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtBat.map((ac)=>(
                    <>
                      <tr key={ac.id} onClick={()=>setSelBat(selBat===ac.id?null:ac.id)}
                        style={{cursor:"pointer",background:selBat===ac.id?"rgba(59,240,255,0.04)":"transparent"}}>
                        <td style={{...S.td,...S.mono,fontWeight:700,color:"#fff",fontSize:13}}>{ac.id}</td>
                        <td style={S.td}><Badge band={ac.band}/></td>
                        <td style={{...S.td,...S.mono,color:ac.rul===0?"#ff3b3b":ac.rul<30?"#ff9f1a":"#ffd439",fontWeight:800,fontSize:14}}>{ac.rul}<span style={{fontSize:9,color:"rgba(255,255,255,0.26)",fontWeight:400}}> c</span></td>
                        <td style={S.td}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:40,height:4,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden",position:"relative"}}>
                              <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${Math.min(100,ac.soh)}%`,borderRadius:3,background:`linear-gradient(90deg,${RC(ac.band)}88,${RC(ac.band)})`,transition:"width 0.8s"}}/>
                            </div>
                            <span style={{...S.mono,fontSize:11,color:"rgba(255,255,255,0.62)"}}>{ac.soh}%</span>
                          </div>
                        </td>
                        <td style={{...S.td,...S.mono,fontSize:11,color:"rgba(255,255,255,0.48)"}}>{ac.from}→{ac.to}</td>
                        <td style={S.td}><span style={{fontSize:11}}><StatusDot color={SC(ac.status)}/>{ac.status}</span></td>
                        <td style={{...S.td,...S.mono,fontSize:12}}>{ac.passengers||"—"}</td>
                        <td style={{...S.td,...S.mono,fontSize:11,color:ac.eta==="—"?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.62)"}}>{ac.eta}</td>
                        <td style={{...S.td,...S.mono,fontSize:11,color:ac.esr>0.35?"#ff9f1a":"rgba(255,255,255,0.48)"}}>{ac.esr.toFixed(3)}</td>
                        <td style={{...S.td,...S.mono,fontSize:11,color:ac.rct>1.9?"#ff9f1a":"rgba(255,255,255,0.48)"}}>{ac.rct.toFixed(2)}</td>
                        <td style={{...S.td,...S.mono,fontSize:11,color:ac.temp>40?"#ff9f1a":"rgba(255,255,255,0.48)"}}>{ac.temp}°C</td>
                        <td style={S.td}><Sparkline data={ac.sohTrend} color={RC(ac.band)} width={76} height={22}/></td>
                      </tr>
                      {selBat===ac.id&&(
                        <tr key={ac.id+"-x"}>
                          <td colSpan={12} style={{padding:0}}>
                            <div style={{background:"rgba(59,240,255,0.022)",borderTop:"1px solid rgba(59,240,255,0.07)",padding:"16px 20px",animation:"fadeIn 0.3s ease"}}>
                              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:16}}>
                                <div>
                                  <div style={{fontSize:9,color:"rgba(255,255,255,0.26)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Battery Diagnosis</div>
                                  <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>{ac.diagnosis}</p>
                                </div>
                                <div>
                                  <div style={{fontSize:9,color:"rgba(255,255,255,0.26)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Engine</div>
                                  <div style={{fontSize:12,fontWeight:600}}>{ac.engine}</div>
                                  <div style={{fontSize:9,color:"rgba(255,255,255,0.26)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:10,marginBottom:5}}>Last Maint.</div>
                                  <div style={{fontSize:12,fontWeight:600}}>{ac.lastMaint}</div>
                                </div>
                                <div>
                                  <div style={{fontSize:9,color:"rgba(255,255,255,0.26)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>RUL Trend</div>
                                  <Sparkline data={ac.rulTrend} color={RC(ac.band)} width={110} height={38}/>
                                </div>
                                <div>
                                  <div style={{fontSize:9,color:"rgba(255,255,255,0.26)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Decision</div>
                                  <GoNoGo band={ac.band}/>
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
            <SectionTitle icon="◆" color="#3bf0ff" note="Last 56 hours · All aircraft">SOH History — Fleet View</SectionTitle>
            <div style={{...S.card,padding:"16px 12px"}}>
              {(()=>{const w=660,h=158,pad=40;return(
                <svg width="100%" viewBox={`0 0 ${w} ${h+22}`} style={{display:"block"}}>
                  {[70,80,90,100].map(v=>{const y=h-pad-(v-60)/50*(h-2*pad);return(
                    <g key={v}><line x1={pad} y1={y} x2={w-6} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                    <text x={pad-5} y={y+4} textAnchor="end" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="'DM Sans',sans-serif">{v}%</text></g>
                  );})}
                  {BATTERY_AIRCRAFT.map((ac,si)=>{const c=RC(ac.band);const pts=ac.sohTrend.map((v,i)=>`${pad+(i/7)*(w-pad-6)},${h-pad-(v-60)/50*(h-2*pad)}`).join(" ");return(
                    <polyline key={si} points={pts} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
                  );})}
                  {["-56h","-48h","-40h","-32h","-24h","-16h","-8h","Now"].map((l,i)=>(
                    <text key={i} x={pad+(i/7)*(w-pad-6)} y={h+14} textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="'DM Sans',sans-serif">{l}</text>
                  ))}
                </svg>
              );})()}
              <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:6,justifyContent:"center"}}>
                {BATTERY_AIRCRAFT.map(ac=>(
                  <div key={ac.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:9}}>
                    <div style={{width:10,height:2,borderRadius:2,background:RC(ac.band)}}/>
                    <span style={{color:"rgba(255,255,255,0.28)",...S.mono}}>{ac.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PAGE 2: Capacitor Health ────────────────────────────────────── */}
        {page===2&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{marginBottom:16}}>
              <h2 style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Capacitor Health Monitor</h2>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.28)",marginTop:3}}>NASA Capacitor EIS Dataset (PCoE) · Hrishikesh · EIS Impedance Spectroscopy · Multi-stress degradation</p>
            </div>
            <div style={{display:"grid",gap:12}}>
              {CAPACITOR_DATA.map((c,i)=>(
                <div key={c.id} style={{background:"rgba(255,255,255,0.018)",border:`1px solid ${RC(c.band)}18`,borderRadius:13,borderLeft:`3px solid ${RC(c.band)}`,padding:"16px 20px",animation:`fadeIn 0.4s ease ${i*0.05}s both`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{...S.mono,fontWeight:800,fontSize:14,color:"#fff",marginBottom:6}}>{c.id}</div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Badge band={c.band}/>
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.32)"}}>Stress: {c.stress} · EIS Sweep #{c.sweeps}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:20}}>
                      {[
                        {l:"RUL",      v:`${c.rul} sw`,           col:RC(c.band)},
                        {l:"ESR",      v:`${c.esr.toFixed(3)} Ω`, col:c.esr>0.35?"#ff9f1a":"rgba(255,255,255,0.68)"},
                        {l:"Cs",       v:`${c.cs.toFixed(0)} µF`, col:c.cs<1000?"#ff3b3b":"rgba(255,255,255,0.68)"},
                        {l:"Zmag",     v:`${c.zmag.toFixed(3)} Ω`,col:"rgba(255,255,255,0.68)"},
                        {l:"Phase",    v:`${c.phase.toFixed(1)}°`, col:"rgba(255,255,255,0.68)"},
                      ].map(m=>(
                        <div key={m.l} style={{textAlign:"right"}}>
                          <div style={{fontSize:9,color:"rgba(255,255,255,0.26)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{m.l}</div>
                          <div style={{...S.mono,fontSize:14,fontWeight:700,color:m.col}}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,0.52)",lineHeight:1.6}}>{c.diagnosis}</div>
                  <GoNoGo band={c.band}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PAGE 3: Engine C-MAPSS ──────────────────────────────────────── */}
        {page===3&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{marginBottom:16}}>
              <h2 style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",background:"linear-gradient(135deg,#38bdf8,#0ea5e9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Engine Health Monitor (C-MAPSS)</h2>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.28)",marginTop:3}}>NASA C-MAPSS Turbofan Degradation · Deveshree · Bi-LSTM · RUL clip 125 · 6 operating regimes · 14 sensor features</p>
            </div>
            <div style={{background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.1)",borderRadius:10,padding:"12px 18px",marginBottom:16,display:"flex",gap:28,flexWrap:"wrap"}}>
              {[
                {l:"Model",        v:"Bi-LSTM (2-layer bidirectional)"},
                {l:"Datasets",     v:"FD001 · FD002 · FD003 · FD004"},
                {l:"Regimes",      v:"6 (KMeans on op1/op2)"},
                {l:"Scaling",      v:"Per-regime MinMaxScaler"},
                {l:"Features",     v:"14 sensors + rolling mean/std/min/max"},
                {l:"SHAP",         v:"GradientExplainer"},
              ].map(m=>(
                <div key={m.l}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{m.l}</div>
                  <div style={{fontSize:11,fontWeight:600,color:"#38bdf8",marginTop:2}}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gap:12}}>
              {ENGINE_DATA.map((e,i)=>(
                <div key={e.id} style={{background:"rgba(255,255,255,0.018)",border:`1px solid ${RC(e.band)}18`,borderRadius:13,borderLeft:`3px solid ${RC(e.band)}`,padding:"16px 20px",animation:`fadeIn 0.4s ease ${i*0.05}s both`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                    <div>
                      <div style={{...S.mono,fontWeight:800,fontSize:14,color:"#fff",marginBottom:6}}>{e.id}</div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Badge band={e.band}/>
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.32)"}}>Dataset: {e.dataset} · Regime {e.regime} · Cycle {e.cycle}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {[
                        {l:"RUL",   v:`${e.rul} cyc`,        col:RC(e.band)},
                        {l:"s3 HPC",v:`${e.s3.toFixed(1)}`,  col:e.s3>1595?"#ff9f1a":"rgba(255,255,255,0.68)"},
                        {l:"s4 HPT",v:`${e.s4.toFixed(1)}`,  col:e.s4>1420?"#ff9f1a":"rgba(255,255,255,0.68)"},
                        {l:"s9 Core",v:`${e.s9.toFixed(1)}`, col:e.s9<9055?"#ff9f1a":"rgba(255,255,255,0.68)"},
                        {l:"s11 Cool",v:`${e.s11.toFixed(2)}`,col:"rgba(255,255,255,0.68)"},
                        {l:"s12 LPT",v:`${e.s12.toFixed(1)}`, col:"rgba(255,255,255,0.68)"},
                      ].map(m=>(
                        <div key={m.l} style={{textAlign:"right"}}>
                          <div style={{fontSize:9,color:"rgba(255,255,255,0.26)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{m.l}</div>
                          <div style={{...S.mono,fontSize:14,fontWeight:700,color:m.col}}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,0.52)",lineHeight:1.6}}>{e.diagnosis}</div>
                  <GoNoGo band={e.band}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PAGE 4: Predictor Tool ──────────────────────────────────────── */}
        {page===4&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{marginBottom:18}}>
              <h2 style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",background:"linear-gradient(135deg,#3bf0ff,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Interactive Predictor Tool</h2>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.28)",marginTop:3}}>Enter sensor values or click Demo Values → run prediction → get RUL + Go/No-Go decision</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {[["⚡ Battery RUL","#ffd439"],["⚙ Capacitor EIS","#a78bfa"],["✈ Engine C-MAPSS","#38bdf8"]].map(([t,c],i)=>(
                <button key={i} onClick={()=>setPredTab(i)} style={{
                  padding:"7px 20px",borderRadius:8,fontSize:11,fontWeight:700,transition:"all 0.2s",
                  border:predTab===i?`1px solid ${c}35`:"1px solid rgba(255,255,255,0.08)",
                  background:predTab===i?`${c}10`:"transparent",
                  color:predTab===i?c:"rgba(255,255,255,0.32)",
                }}>{t}</button>
              ))}
            </div>
            {predTab===0&&<BatteryPredictor/>}
            {predTab===1&&<CapacitorPredictor/>}
            {predTab===2&&<EnginePredictor/>}
          </div>
        )}

        {/* ── PAGE 5: Full Prediction ─────────────────────────────────────── */}
        {page===5&&<FullPrediction/>}

      </div>
    </div>
  );
}
