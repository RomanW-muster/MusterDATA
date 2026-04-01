// ─────────────────────────────────────────────────────────────────────────────
// MUSTER — AUTO TRADER (PAPER TRADING MODULE)
// Save as src/AutoTrader.jsx
//
// Add to App.jsx:
//   import AutoTrader from "./AutoTrader";
//   { id:"autotrader", label:"AUTO TRADER", emoji:"🤖" } in TABS
//   {tab==="autotrader" && <AutoTrader/>} in content section
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";

// ─── COLOURS ─────────────────────────────────────────────────────────────────
const C = {
  eucalyptus:"#2F4F3E", eggshell:"#F4F1EA", navy:"#1E2F3F", wheat:"#C8A96A",
  charcoal:"#2A2A2A", lightGrey:"#D9D9D9",
  eucalyptusLight:"#3d6b52", eucalyptusPale:"#e8f4ee",
  navyLight:"#2a4a63", navyPale:"#e8eef4",
  wheatDark:"#9a7d45", wheatPale:"#fdf6e8",
  negative:"#8B1A1A", negativePale:"#faeaea",
  warning:"#c8860a", warningPale:"#fef6e4",
  white:"#ffffff", offwhite:"#fafaf8",
};

// ─── TRADEABLE UNIVERSE ───────────────────────────────────────────────────────
const INSTRUMENTS = [
  // Grains
  { symbol:"ZC", name:"Corn",           emoji:"🌽", sector:"Grains",     contractSize:5000,  unit:"¢/bu",  tickSize:0.25, tickValue:12.50, margin:1500,  price:478.25  },
  { symbol:"ZW", name:"Wheat",          emoji:"🌾", sector:"Grains",     contractSize:5000,  unit:"¢/bu",  tickSize:0.25, tickValue:12.50, margin:1800,  price:592.50  },
  { symbol:"ZS", name:"Soybeans",       emoji:"🫘", sector:"Grains",     contractSize:5000,  unit:"¢/bu",  tickSize:0.25, tickValue:12.50, margin:2200,  price:1087.75 },
  { symbol:"ZM", name:"Soy Meal",       emoji:"🌱", sector:"Grains",     contractSize:100,   unit:"$/ton", tickSize:0.10, tickValue:10.00, margin:1400,  price:312.40  },
  { symbol:"ZO", name:"Oats",           emoji:"🌿", sector:"Grains",     contractSize:5000,  unit:"¢/bu",  tickSize:0.25, tickValue:12.50, margin:800,   price:312.50  },
  // Livestock
  { symbol:"LE", name:"Live Cattle",    emoji:"🐄", sector:"Livestock",  contractSize:400,   unit:"¢/lb",  tickSize:0.025,tickValue:10.00, margin:1800,  price:184.325 },
  { symbol:"HE", name:"Lean Hogs",      emoji:"🐖", sector:"Livestock",  contractSize:400,   unit:"¢/lb",  tickSize:0.025,tickValue:10.00, margin:1400,  price:91.275  },
  { symbol:"GF", name:"Feeder Cattle",  emoji:"🐂", sector:"Livestock",  contractSize:500,   unit:"¢/lb",  tickSize:0.025,tickValue:12.50, margin:2200,  price:252.50  },
  // Softs / Other Ag
  { symbol:"CT", name:"Cotton",         emoji:"🌿", sector:"Softs",      contractSize:500,   unit:"¢/lb",  tickSize:0.01, tickValue:5.00,  margin:1200,  price:78.45   },
  { symbol:"KC", name:"Coffee",         emoji:"☕", sector:"Softs",      contractSize:375,   unit:"¢/lb",  tickSize:0.05, tickValue:18.75, margin:2800,  price:342.80  },
  { symbol:"SB", name:"Sugar #11",      emoji:"🍬", sector:"Softs",      contractSize:1120,  unit:"¢/lb",  tickSize:0.01, tickValue:11.20, margin:900,   price:19.85   },
  // Fertiliser / Inputs
  { symbol:"UAN", name:"Urea (proxy)",  emoji:"🧪", sector:"Inputs",     contractSize:100,   unit:"$/ton", tickSize:1.00, tickValue:100,   margin:1500,  price:285.00  },
  // Currencies (Ag relevant)
  { symbol:"6A",  name:"AUD/USD",       emoji:"🇦🇺", sector:"Currencies", contractSize:100000,unit:"USD",  tickSize:0.0001,tickValue:10.00,margin:1200,  price:0.6234  },
  { symbol:"6B",  name:"BRL/USD (proxy)",emoji:"🇧🇷",sector:"Currencies", contractSize:100000,unit:"USD",  tickSize:0.0001,tickValue:10.00,margin:1400,  price:0.1966  },
  { symbol:"DX",  name:"US Dollar Index",emoji:"💵",sector:"Currencies", contractSize:1000,  unit:"pts",   tickSize:0.005,tickValue:5.00,  margin:1800,  price:104.23  },
  // Energy (farm inputs)
  { symbol:"HO",  name:"Heating Oil",   emoji:"⛽", sector:"Energy",     contractSize:42000, unit:"$/gal", tickSize:0.0001,tickValue:4.20, margin:5000,  price:2.685   },
  { symbol:"NG",  name:"Natural Gas",   emoji:"🔥", sector:"Energy",     contractSize:10000, unit:"$/MMBtu",tickSize:0.001,tickValue:10.00,margin:2000,  price:1.924   },
];

// Signal data (mirrors Muster scorecard)
const SIGNAL_DATA = {
  ZC: { score:68, overall:"BULLISH",  vars:{ wasde:"BULLISH", weather:"BULLISH", cot:"BULLISH", exports:"BEARISH", seasonal:"NEUTRAL", currency:"BULLISH" }},
  ZW: { score:74, overall:"BULLISH",  vars:{ wasde:"BULLISH", weather:"BULLISH", cot:"BEARISH", exports:"BULLISH", seasonal:"BULLISH", currency:"BULLISH" }},
  ZS: { score:52, overall:"NEUTRAL",  vars:{ wasde:"BEARISH", weather:"BULLISH", cot:"BULLISH", exports:"NEUTRAL", seasonal:"BEARISH", currency:"BEARISH" }},
  ZM: { score:55, overall:"NEUTRAL",  vars:{ wasde:"NEUTRAL", weather:"NEUTRAL", cot:"BULLISH", exports:"BULLISH", seasonal:"NEUTRAL", currency:"BEARISH" }},
  LE: { score:78, overall:"BULLISH",  vars:{ wasde:"BULLISH", weather:"BULLISH", cot:"BULLISH", exports:"NEUTRAL", seasonal:"BULLISH", currency:"BULLISH" }},
  HE: { score:38, overall:"BEARISH",  vars:{ wasde:"BEARISH", weather:"BEARISH", cot:"NEUTRAL", exports:"BULLISH", seasonal:"BEARISH", currency:"BEARISH" }},
  GF: { score:72, overall:"BULLISH",  vars:{ wasde:"BULLISH", weather:"NEUTRAL", cot:"BULLISH", exports:"NEUTRAL", seasonal:"BULLISH", currency:"NEUTRAL" }},
  CT: { score:58, overall:"NEUTRAL",  vars:{ wasde:"NEUTRAL", weather:"BULLISH", cot:"NEUTRAL", exports:"NEUTRAL", seasonal:"NEUTRAL", currency:"NEUTRAL" }},
  KC: { score:62, overall:"BULLISH",  vars:{ wasde:"BULLISH", weather:"BULLISH", cot:"NEUTRAL", exports:"BULLISH", seasonal:"NEUTRAL", currency:"NEUTRAL" }},
  SB: { score:45, overall:"NEUTRAL",  vars:{ wasde:"BEARISH", weather:"NEUTRAL", cot:"NEUTRAL", exports:"NEUTRAL", seasonal:"NEUTRAL", currency:"NEUTRAL" }},
  DX: { score:35, overall:"BEARISH",  vars:{ wasde:"BEARISH", weather:"NEUTRAL", cot:"BEARISH", exports:"BEARISH", seasonal:"NEUTRAL", currency:"BEARISH" }},
  "6A":{ score:60, overall:"NEUTRAL", vars:{ wasde:"NEUTRAL", weather:"NEUTRAL", cot:"NEUTRAL", exports:"BULLISH", seasonal:"NEUTRAL", currency:"BULLISH" }},
};

// Simulated price history for sparklines
function genPriceHistory(base, days=30, vol=0.008) {
  const data = []; let p = base * 0.94;
  for (let i=days; i>=0; i--) {
    p = p * (1 + (Math.random()-0.47)*vol);
    data.push(parseFloat(p.toFixed(4)));
  }
  data[data.length-1] = base;
  return data;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Card({children,style={},...r}){ return <div style={{background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:4,...style}} {...r}>{children}</div>; }
function SectionHead({label,sub,action}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:3,height:16,background:C.eucalyptus,borderRadius:2}}/>
        <div>
          <div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:"0.12em"}}>{label}</div>
          {sub&&<div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginTop:1}}>{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
function Btn({children,onClick,disabled,variant="green",style={}}){
  const bg=disabled?C.lightGrey:variant==="green"?C.eucalyptus:variant==="navy"?C.navy:variant==="red"?C.negative:C.white;
  const color=variant==="outline"?C.charcoal:C.white;
  return <button onClick={onClick} disabled={disabled} style={{background:bg,color,border:variant==="outline"?`1px solid ${C.lightGrey}`:"none",borderRadius:3,padding:"8px 16px",cursor:disabled?"not-allowed":"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,transition:"all 0.15s",letterSpacing:"0.04em",...style}}>{children}</button>;
}
function Spinner(){return <span style={{display:"inline-block",width:12,height:12,border:`2px solid ${C.lightGrey}`,borderTopColor:C.eucalyptus,borderRadius:"50%",animation:"spin 0.8s linear infinite",marginRight:6}}/>;}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({data, color=C.eucalyptus, height=32}){
  if(!data||data.length<2) return null;
  const W=120; const min=Math.min(...data); const max=Math.max(...data); const range=max-min||1;
  const px=(i)=>(i/(data.length-1))*W;
  const py=(v)=>height-((v-min)/range)*height;
  const path=data.map((v,i)=>`${i===0?"M":"L"}${px(i)},${py(v)}`).join(" ");
  const fill=data.map((v,i)=>`${i===0?"M":"L"}${px(i)},${py(v)}`).join(" ")+` L${W},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{width:120,height,display:"block"}} preserveAspectRatio="none">
      <defs><linearGradient id={`sg_${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.15"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={fill} fill={`url(#sg_${color.replace("#","")})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── P&L CURVE ────────────────────────────────────────────────────────────────
function PnLCurve({history}){
  if(!history||history.length<2) return <div style={{height:80,display:"flex",alignItems:"center",justifyContent:"center",color:C.lightGrey,fontSize:12}}>No trade history yet</div>;
  const W=600,H=80,PAD={t:8,b:20,l:8,r:8};
  const min=Math.min(...history); const max=Math.max(...history); const range=max-min||1;
  const px=(i)=>PAD.l+(i/(history.length-1))*(W-PAD.l-PAD.r);
  const py=(v)=>PAD.t+(1-(v-min)/range)*(H-PAD.t-PAD.b);
  const path=history.map((v,i)=>`${i===0?"M":"L"}${px(i)},${py(v)}`).join(" ");
  const fill=path+` L${px(history.length-1)},${H-PAD.b} L${PAD.l},${H-PAD.b} Z`;
  const isUp=history[history.length-1]>=history[0];
  const color=isUp?C.eucalyptus:C.negative;
  const baseline=py(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H}} preserveAspectRatio="none">
      <defs><linearGradient id="pnlgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <line x1={PAD.l} y1={baseline} x2={W-PAD.r} y2={baseline} stroke={C.lightGrey} strokeWidth="1" strokeDasharray="3,3"/>
      <path d={fill} fill="url(#pnlgrad)"/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// ─── SIGNAL ENGINE ────────────────────────────────────────────────────────────
async function generateSignal(instrument, accountSize, openPositions) {
  const sig = SIGNAL_DATA[instrument.symbol];
  const marketContext = `
Instrument: ${instrument.name} (${instrument.symbol})
Current Price: ${instrument.price} ${instrument.unit}
Contract Size: ${instrument.contractSize} ${instrument.unit}
Margin Required: $${instrument.margin.toFixed(0)}
Account Size: $${accountSize.toFixed(0)}
Open Positions: ${openPositions}
Scorecard Signal: ${sig?.overall || "NEUTRAL"} (Score: ${sig?.score || 50}/100)
Variable Breakdown: ${sig ? Object.entries(sig.vars).map(([k,v])=>`${k}=${v}`).join(", ") : "N/A"}
Sector: ${instrument.sector}
`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:400,
        system:`You are an automated paper trading signal engine for agricultural and commodity futures markets. Your job is to analyse market data and generate precise trading signals with risk parameters.

You MUST respond with ONLY valid JSON in exactly this format, no other text:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "contracts": 1-3,
  "stopLoss": number,
  "takeProfit": number,
  "riskPercent": 0.5-5.0,
  "reasoning": "2-3 sentence explanation",
  "timeframe": "short" | "medium" | "long"
}

Rules:
- Only trade if confidence >= 65
- Never risk more than 5% of account on one trade
- Scale contracts (1-3) based on confidence: 65-74=1, 75-84=2, 85+=3
- Set stop loss 1.5-2.5x ATR from entry (use 0.8% of price as proxy ATR)
- Set take profit 2-3x the stop loss distance (minimum 2:1 R:R)
- Consider existing open positions — reduce size if already 3+ positions open
- For HOLD: still provide what price would trigger a BUY or SELL entry`,
        messages:[{ role:"user", content:`Generate a trading signal for:\n${marketContext}\n\nRespond with JSON only.` }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(b=>b.text||"").join("")||"{}";
    const clean = text.replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  } catch(e) {
    // Fallback signal based on scorecard
    const score = sig?.score || 50;
    const action = score >= 65 ? "BUY" : score <= 40 ? "SELL" : "HOLD";
    const confidence = Math.abs(score - 50) * 2;
    const atr = instrument.price * 0.008;
    return {
      action, confidence,
      contracts: confidence >= 85 ? 2 : 1,
      stopLoss: action==="BUY" ? instrument.price - atr*2 : instrument.price + atr*2,
      takeProfit: action==="BUY" ? instrument.price + atr*4 : instrument.price - atr*4,
      riskPercent: 1.5,
      reasoning: `Scorecard signal ${sig?.overall} with score ${score}/100. ${action==="HOLD"?"Waiting for stronger confluence.":"Signal strength sufficient to enter."}`,
      timeframe: "medium",
    };
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AutoTrader() {
  const INITIAL_CAPITAL = 10000;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isRunning, setIsRunning] = useState(false);
  const [portfolio, setPortfolio] = useState({
    cash: INITIAL_CAPITAL,
    initialCapital: INITIAL_CAPITAL,
    positions: [],
    closedTrades: [],
    pnlHistory: [INITIAL_CAPITAL],
    dailyLossLimit: INITIAL_CAPITAL * 0.05,
    dailyLoss: 0,
    halted: false,
    haltReason: "",
    lastSignalTime: null,
    signalInterval: 30, // minutes
  });
  const [scanningSymbol, setScanningSymbol] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [log, setLog] = useState([]);
  const [prices, setPrices] = useState(
    Object.fromEntries(INSTRUMENTS.map(i => [i.symbol, {
      current: i.price,
      history: genPriceHistory(i.price),
    }]))
  );
  const intervalRef = useRef(null);

  // Simulate price movements
  const tickPrices = useCallback(() => {
    setPrices(prev => {
      const next = {...prev};
      Object.keys(next).forEach(sym => {
        const inst = INSTRUMENTS.find(i=>i.symbol===sym);
        if (!inst) return;
        const vol = inst.sector==="Currencies" ? 0.0003 : 0.004;
        const change = (Math.random()-0.495) * vol;
        const newPrice = parseFloat((next[sym].current * (1+change)).toFixed(4));
        next[sym] = {
          current: newPrice,
          history: [...next[sym].history.slice(-29), newPrice],
        };
      });
      return next;
    });
  }, []);

  // Update open position P&L
  const updatePositionPnL = useCallback((pos, currentPrice) => {
    const inst = INSTRUMENTS.find(i=>i.symbol===pos.symbol);
    if (!inst) return pos;
    const priceDiff = pos.direction==="LONG"
      ? currentPrice - pos.entryPrice
      : pos.entryPrice - currentPrice;
    const pnl = (priceDiff / (inst.tickSize)) * inst.tickValue * pos.contracts;
    const pct = (pnl / (pos.entryPrice * inst.contractSize * pos.contracts / 100)) * 100;
    return { ...pos, currentPrice, unrealisedPnL:pnl, pnlPct:pct };
  }, []);

  // Check stop loss / take profit
  const checkExits = useCallback((portfolio, prices) => {
    let updated = {...portfolio};
    const toClose = [];
    updated.positions = updated.positions.map(pos => {
      const cur = prices[pos.symbol]?.current || pos.entryPrice;
      const updPos = updatePositionPnL(pos, cur);
      // Check SL/TP
      if (pos.direction==="LONG") {
        if (cur <= pos.stopLoss)  { toClose.push({...updPos, closeReason:"Stop Loss Hit ⛔"}); return null; }
        if (cur >= pos.takeProfit){ toClose.push({...updPos, closeReason:"Take Profit Hit ✅"}); return null; }
      } else {
        if (cur >= pos.stopLoss)  { toClose.push({...updPos, closeReason:"Stop Loss Hit ⛔"}); return null; }
        if (cur <= pos.takeProfit){ toClose.push({...updPos, closeReason:"Take Profit Hit ✅"}); return null; }
      }
      return updPos;
    }).filter(Boolean);

    toClose.forEach(pos => {
      const pnl = pos.unrealisedPnL || 0;
      updated.cash += pnl;
      updated.dailyLoss += Math.min(0, pnl);
      const closed = { ...pos, closedAt: new Date(), closePnL: pnl, closePrice: pos.currentPrice };
      updated.closedTrades = [closed, ...updated.closedTrades];
      const totalEquity = updated.cash + updated.positions.reduce((s,p)=>s+(p.unrealisedPnL||0),0);
      updated.pnlHistory = [...updated.pnlHistory, totalEquity];
      addLog(`${pos.closeReason} — ${pos.symbol} ${pos.direction} | P&L: ${pnl>=0?"+":""}$${pnl.toFixed(0)}`, pnl>=0?"success":"error");
    });

    // Daily loss limit check
    if (Math.abs(updated.dailyLoss) >= updated.dailyLossLimit && !updated.halted) {
      updated.halted = true;
      updated.haltReason = `Daily loss limit reached ($${Math.abs(updated.dailyLoss).toFixed(0)}). Trading halted for today.`;
      addLog("🚨 DAILY LOSS LIMIT REACHED — Trading halted", "error");
    }

    return updated;
  }, [updatePositionPnL]);

  function addLog(message, type="info") {
    setLog(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
      message, type,
    }, ...prev.slice(0,99)]);
  }

  // Price tick every 3 seconds when running
  useEffect(() => {
    if (isRunning) {
      const tick = setInterval(tickPrices, 3000);
      return () => clearInterval(tick);
    }
  }, [isRunning, tickPrices]);

  // Check exits on price update
  useEffect(() => {
    if (isRunning && portfolio.positions.length > 0) {
      setPortfolio(prev => checkExits(prev, prices));
    }
  }, [prices, isRunning, checkExits]);

  // Auto scan every N minutes
  useEffect(() => {
    if (isRunning && !portfolio.halted) {
      intervalRef.current = setInterval(() => {
        runScan();
      }, portfolio.signalInterval * 60 * 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [isRunning, portfolio.halted]);

  async function runScan() {
    if (portfolio.halted) { addLog("Trading halted — scan skipped", "warning"); return; }
    const openCount = portfolio.positions.length;
    if (openCount >= 5) { addLog("Max positions (5) reached — scan skipped", "warning"); return; }
    const totalEquity = portfolio.cash + portfolio.positions.reduce((s,p)=>s+(p.unrealisedPnL||0),0);

    // Scan instruments with signal data
    const toScan = INSTRUMENTS.filter(i => SIGNAL_DATA[i.symbol] && !portfolio.positions.find(p=>p.symbol===i.symbol));
    addLog(`🔍 Scanning ${toScan.length} instruments...`, "info");

    for (const inst of toScan.slice(0,6)) { // Limit API calls
      setScanningSymbol(inst.symbol);
      const signal = await generateSignal(inst, totalEquity, openCount);
      setScanningSymbol(null);

      if (signal.action === "HOLD" || signal.confidence < 65) {
        addLog(`${inst.emoji} ${inst.symbol} — HOLD (confidence: ${signal.confidence}%)`, "info");
        continue;
      }

      // Execute trade
      const currentPrice = prices[inst.symbol]?.current || inst.price;
      const riskAmount = totalEquity * (signal.riskPercent / 100);
      const contracts = Math.min(signal.contracts, Math.floor(totalEquity / (inst.margin * 2)));
      if (contracts < 1) { addLog(`${inst.symbol} — Insufficient margin, skipping`, "warning"); continue; }

      const newPosition = {
        id: Date.now(),
        symbol: inst.symbol,
        name: inst.name,
        emoji: inst.emoji,
        sector: inst.sector,
        direction: signal.action,
        contracts,
        entryPrice: currentPrice,
        currentPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        confidence: signal.confidence,
        riskPercent: signal.riskPercent,
        reasoning: signal.reasoning,
        timeframe: signal.timeframe,
        openedAt: new Date(),
        unrealisedPnL: 0,
        pnlPct: 0,
        marginUsed: inst.margin * contracts,
      };

      setPortfolio(prev => ({
        ...prev,
        cash: prev.cash - inst.margin * contracts,
        positions: [...prev.positions, newPosition],
        lastSignalTime: new Date(),
      }));
      addLog(`✅ EXECUTED: ${signal.action} ${contracts}x ${inst.symbol} @ ${currentPrice.toFixed(4)} | SL: ${signal.stopLoss.toFixed(4)} | TP: ${signal.takeProfit.toFixed(4)} | Confidence: ${signal.confidence}%`, "success");
      addLog(`   Reasoning: ${signal.reasoning}`, "reasoning");
    }
    setLastScan(new Date());
  }

  async function manualSignal(symbol) {
    const inst = INSTRUMENTS.find(i=>i.symbol===symbol);
    if (!inst) return;
    setScanningSymbol(symbol);
    const totalEquity = portfolio.cash + portfolio.positions.reduce((s,p)=>s+(p.unrealisedPnL||0),0);
    const signal = await generateSignal(inst, totalEquity, portfolio.positions.length);
    setScanningSymbol(null);
    addLog(`🔬 Manual signal for ${symbol}: ${signal.action} | Confidence: ${signal.confidence}% | ${signal.reasoning}`, signal.action==="BUY"?"success":signal.action==="SELL"?"error":"info");

    if (signal.action !== "HOLD" && signal.confidence >= 65 && !portfolio.positions.find(p=>p.symbol===symbol)) {
      const currentPrice = prices[symbol]?.current || inst.price;
      const contracts = Math.min(signal.contracts, Math.floor(totalEquity / (inst.margin * 2)));
      if (contracts >= 1) {
        setPortfolio(prev => ({
          ...prev,
          cash: prev.cash - inst.margin * contracts,
          positions: [...prev.positions, {
            id:Date.now(), symbol, name:inst.name, emoji:inst.emoji, sector:inst.sector,
            direction:signal.action, contracts, entryPrice:currentPrice, currentPrice,
            stopLoss:signal.stopLoss, takeProfit:signal.takeProfit,
            confidence:signal.confidence, riskPercent:signal.riskPercent,
            reasoning:signal.reasoning, timeframe:signal.timeframe,
            openedAt:new Date(), unrealisedPnL:0, pnlPct:0, marginUsed:inst.margin*contracts,
          }],
        }));
      }
    }
  }

  function closePosition(id) {
    setPortfolio(prev => {
      const pos = prev.positions.find(p=>p.id===id);
      if (!pos) return prev;
      const pnl = pos.unrealisedPnL || 0;
      const totalEquity = prev.cash + pnl + prev.positions.filter(p=>p.id!==id).reduce((s,p)=>s+(p.unrealisedPnL||0),0);
      addLog(`🔴 Manual close: ${pos.symbol} ${pos.direction} | P&L: ${pnl>=0?"+":""}$${pnl.toFixed(0)}`, pnl>=0?"success":"error");
      return {
        ...prev,
        cash: prev.cash + pos.marginUsed + pnl,
        positions: prev.positions.filter(p=>p.id!==id),
        closedTrades: [{...pos, closedAt:new Date(), closePnL:pnl, closePrice:pos.currentPrice, closeReason:"Manual Close"}, ...prev.closedTrades],
        pnlHistory: [...prev.pnlHistory, totalEquity],
      };
    });
  }

  function resetPortfolio() {
    setPortfolio({
      cash:INITIAL_CAPITAL, initialCapital:INITIAL_CAPITAL, positions:[], closedTrades:[],
      pnlHistory:[INITIAL_CAPITAL], dailyLossLimit:INITIAL_CAPITAL*0.05, dailyLoss:0,
      halted:false, haltReason:"", lastSignalTime:null, signalInterval:30,
    });
    setLog([]);
    setIsRunning(false);
    addLog("Portfolio reset to $10,000", "info");
  }

  // ─── COMPUTED STATS ─────────────────────────────────────────────────────────
  const totalEquity = portfolio.cash + portfolio.positions.reduce((s,p)=>s+(p.unrealisedPnL||0),0);
  const totalReturn = totalEquity - INITIAL_CAPITAL;
  const returnPct = (totalReturn / INITIAL_CAPITAL) * 100;
  const wins = portfolio.closedTrades.filter(t=>t.closePnL>0).length;
  const losses = portfolio.closedTrades.filter(t=>t.closePnL<=0).length;
  const winRate = portfolio.closedTrades.length > 0 ? (wins/portfolio.closedTrades.length*100) : 0;
  const avgWin = wins > 0 ? portfolio.closedTrades.filter(t=>t.closePnL>0).reduce((s,t)=>s+t.closePnL,0)/wins : 0;
  const avgLoss = losses > 0 ? Math.abs(portfolio.closedTrades.filter(t=>t.closePnL<=0).reduce((s,t)=>s+t.closePnL,0)/losses) : 0;
  const profitFactor = avgLoss > 0 ? avgWin/avgLoss : avgWin > 0 ? 999 : 0;
  const maxDrawdown = portfolio.pnlHistory.reduce((md, val, i, arr) => {
    const peak = Math.max(...arr.slice(0,i+1));
    return Math.max(md, (peak-val)/peak*100);
  }, 0);
  const marginUsed = portfolio.positions.reduce((s,p)=>s+p.marginUsed,0);

  const TABS = [
    { id:"dashboard", label:"DASHBOARD" },
    { id:"positions", label:"POSITIONS" },
    { id:"scanner",   label:"SCANNER"   },
    { id:"history",   label:"TRADE LOG" },
    { id:"settings",  label:"SETTINGS"  },
  ];

  return (
    <div>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes scanPulse { 0%,100%{background:${C.warningPale}} 50%{background:#fff3cd} }
      `}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg, ${C.charcoal} 0%, ${C.navy} 100%)`,borderRadius:6,padding:"18px 22px",marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:28}}>🤖</span>
            <div>
              <div style={{color:C.wheat,fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:"0.12em"}}>AUTO TRADER</div>
              <div style={{color:"rgba(255,255,255,0.55)",fontSize:11,fontFamily:"'DM Mono',monospace"}}>
                Paper Trading Mode · $10,000 Test Fund · Claude Signal Engine
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {portfolio.halted ? (
              <div style={{background:"#3a0a0a",border:`1px solid ${C.negative}`,borderRadius:3,padding:"6px 14px"}}>
                <span style={{color:C.negative,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700}}>🚨 TRADING HALTED — {portfolio.haltReason}</span>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:isRunning?C.eucalyptus:C.lightGrey,animation:isRunning?"pulse 2s infinite":"none"}}/>
                <span style={{color:isRunning?C.eucalyptus:C.lightGrey,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{isRunning?"LIVE — SCANNING MARKETS":"PAUSED"}</span>
              </div>
            )}
            {!portfolio.halted && (
              <Btn
                onClick={()=>{
                  setIsRunning(!isRunning);
                  addLog(isRunning?"⏸ Trading paused":"▶ Trading started — scanning for signals", isRunning?"warning":"success");
                  if (!isRunning) setTimeout(()=>runScan(), 1000);
                }}
                variant={isRunning?"red":"green"}
                style={{padding:"8px 20px",fontSize:12}}
              >
                {isRunning?"⏸ PAUSE":"▶ START TRADING"}
              </Btn>
            )}
            {portfolio.halted && <Btn onClick={()=>setPortfolio(p=>({...p,halted:false,haltReason:"",dailyLoss:0}))} variant="navy">RESET HALT</Btn>}
          </div>
        </div>

        {/* Key metrics */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10}}>
          {[
            {l:"PORTFOLIO VALUE",  v:`$${totalEquity.toFixed(0)}`,           c:totalReturn>=0?C.wheat:"#f87171"},
            {l:"TOTAL RETURN",     v:`${totalReturn>=0?"+":""}$${totalReturn.toFixed(0)}`, c:totalReturn>=0?"#7de8a0":"#f87171"},
            {l:"RETURN %",         v:`${returnPct>=0?"+":""}${returnPct.toFixed(2)}%`,     c:totalReturn>=0?"#7de8a0":"#f87171"},
            {l:"OPEN POSITIONS",   v:portfolio.positions.length,              c:C.wheat},
            {l:"WIN RATE",         v:`${winRate.toFixed(0)}%`,                c:winRate>=50?"#7de8a0":"#f87171"},
            {l:"PROFIT FACTOR",    v:profitFactor.toFixed(2),                 c:profitFactor>=1.5?"#7de8a0":profitFactor>=1?C.wheat:"#f87171"},
            {l:"MAX DRAWDOWN",     v:`${maxDrawdown.toFixed(1)}%`,            c:maxDrawdown>10?"#f87171":C.wheat},
            {l:"CASH AVAILABLE",   v:`$${portfolio.cash.toFixed(0)}`,         c:"rgba(255,255,255,0.7)"},
          ].map((s,i)=>(
            <div key={i}>
              <div style={{color:"rgba(255,255,255,0.4)",fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:3}}>{s.l}</div>
              <div style={{color:s.c,fontSize:15,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub nav */}
      <div style={{background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:4,padding:"4px 6px",marginBottom:18,display:"flex",gap:2}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            background:activeTab===t.id?C.eggshell:"none",
            border:`1px solid ${activeTab===t.id?C.lightGrey:"transparent"}`,
            borderRadius:3,padding:"7px 16px",cursor:"pointer",
            fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:activeTab===t.id?600:400,
            letterSpacing:"0.08em",color:activeTab===t.id?C.eucalyptus:C.wheatDark,
            transition:"all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ─── DASHBOARD ─── */}
      {activeTab==="dashboard" && (
        <div style={{animation:"fadeIn 0.2s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18,marginBottom:18}}>
            {/* P&L curve */}
            <Card style={{padding:18}}>
              <SectionHead label="PORTFOLIO P&L CURVE" sub={`${portfolio.pnlHistory.length-1} data points · Started at $${INITIAL_CAPITAL.toLocaleString()}`}/>
              <PnLCurve history={portfolio.pnlHistory}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>Start</span>
                <span style={{color:totalReturn>=0?C.eucalyptus:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{totalReturn>=0?"+":""}${totalReturn.toFixed(0)} ({returnPct>=0?"+":""}{ returnPct.toFixed(2)}%)</span>
                <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>Now</span>
              </div>
            </Card>

            {/* Stats */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Card style={{padding:14}}>
                <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:10}}>Performance Stats</div>
                {[
                  ["Total Trades",   portfolio.closedTrades.length, C.navy],
                  ["Wins / Losses",  `${wins} / ${losses}`, wins>losses?C.eucalyptus:C.negative],
                  ["Win Rate",       `${winRate.toFixed(1)}%`, winRate>=50?C.eucalyptus:C.negative],
                  ["Avg Win",        `$${avgWin.toFixed(0)}`, C.eucalyptus],
                  ["Avg Loss",       `-$${avgLoss.toFixed(0)}`, C.negative],
                  ["Profit Factor",  profitFactor.toFixed(2), profitFactor>=1.5?C.eucalyptus:profitFactor>=1?C.warning:C.negative],
                  ["Max Drawdown",   `${maxDrawdown.toFixed(1)}%`, maxDrawdown>10?C.negative:C.charcoal],
                  ["Margin Used",    `$${marginUsed.toFixed(0)}`, C.charcoal],
                ].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.lightGrey}`}}>
                    <span style={{color:C.charcoal,fontSize:11}}>{l}</span>
                    <span style={{color:c,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </Card>
              <Card style={{padding:12,background:C.offwhite}}>
                <div style={{color:C.charcoal,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:4}}>NEXT SCAN</div>
                <div style={{color:C.charcoal,fontSize:12}}>{isRunning ? `Every ${portfolio.signalInterval} minutes` : "Paused — start trading to enable"}</div>
                {lastScan && <div style={{color:C.wheatDark,fontSize:10,marginTop:3}}>Last scan: {lastScan.toLocaleTimeString("en-AU")}</div>}
              </Card>
            </div>
          </div>

          {/* Open positions summary */}
          <SectionHead label="OPEN POSITIONS" sub={`${portfolio.positions.length} open · Stops and targets active`}
            action={portfolio.positions.length>0&&<Btn variant="outline" style={{fontSize:10,padding:"5px 12px"}} onClick={()=>setActiveTab("positions")}>View all →</Btn>}
          />
          {portfolio.positions.length===0 ? (
            <Card style={{padding:30,textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>📭</div>
              <div style={{color:C.wheatDark,fontSize:13}}>{isRunning?"Scanning for opportunities...":"Start trading to begin scanning for signals"}</div>
              {isRunning && scanningSymbol && <div style={{color:C.warning,fontSize:11,fontFamily:"'DM Mono',monospace",marginTop:6,animation:"blink 1s infinite"}}>🔍 Analysing {scanningSymbol}...</div>}
            </Card>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
              {portfolio.positions.map(pos=>{
                const up=pos.unrealisedPnL>=0;
                const cur=prices[pos.symbol]?.current||pos.entryPrice;
                const updPos=updatePositionPnL(pos,cur);
                const slPct=Math.abs((pos.entryPrice-pos.stopLoss)/pos.entryPrice*100).toFixed(1);
                const tpPct=Math.abs((pos.takeProfit-pos.entryPrice)/pos.entryPrice*100).toFixed(1);
                return (
                  <Card key={pos.id} style={{padding:14,borderLeft:`4px solid ${up?C.eucalyptus:C.negative}`,animation:"fadeIn 0.3s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:18}}>{pos.emoji}</span>
                        <div>
                          <div style={{color:C.charcoal,fontSize:13,fontWeight:700}}>{pos.symbol}</div>
                          <span style={{fontSize:9,padding:"1px 5px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:pos.direction==="LONG"?C.eucalyptus:C.negative}}>{pos.direction}</span>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:up?C.eucalyptus:C.negative,fontSize:16,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{up?"+":"-"}${Math.abs(updPos.unrealisedPnL).toFixed(0)}</div>
                        <div style={{color:up?C.eucalyptus:C.negative,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{up?"+":""}{updPos.pnlPct?.toFixed(2)}%</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:8}}>
                      {[["ENTRY",pos.entryPrice.toFixed(4),C.charcoal],["CURRENT",cur.toFixed(4),up?C.eucalyptus:C.negative],["CONTRACTS",pos.contracts,C.navy]].map(([l,v,c])=>(
                        <div key={l}><div style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:1}}>{l}</div><div style={{color:c,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</div></div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                      <div style={{padding:"5px 8px",background:C.negativePale,borderRadius:2}}><div style={{color:C.negative,fontSize:9,fontFamily:"'DM Mono',monospace"}}>STOP LOSS</div><div style={{color:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{pos.stopLoss.toFixed(4)} <span style={{opacity:0.7}}>(-{slPct}%)</span></div></div>
                      <div style={{padding:"5px 8px",background:C.eucalyptusPale,borderRadius:2}}><div style={{color:C.eucalyptus,fontSize:9,fontFamily:"'DM Mono',monospace"}}>TAKE PROFIT</div><div style={{color:C.eucalyptus,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{pos.takeProfit.toFixed(4)} <span style={{opacity:0.7}}>(+{tpPct}%)</span></div></div>
                    </div>
                    <div style={{color:C.wheatDark,fontSize:10,lineHeight:1.4,marginBottom:8,fontStyle:"italic",fontFamily:"'Lora',serif"}}>"{pos.reasoning}"</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>Confidence: {pos.confidence}% · {pos.timeframe}</span>
                      <Btn variant="outline" style={{fontSize:9,padding:"3px 8px"}} onClick={()=>closePosition(pos.id)}>Close</Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Recent log */}
          <div style={{marginTop:20}}>
            <SectionHead label="ACTIVITY LOG" sub="Last 10 events"/>
            <Card style={{padding:14,fontFamily:"'DM Mono',monospace",fontSize:11}}>
              {log.slice(0,10).map(l=>(
                <div key={l.id} style={{padding:"4px 0",borderBottom:`1px solid ${C.lightGrey}`,display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{color:C.lightGrey,flexShrink:0}}>{l.time}</span>
                  <span style={{color:l.type==="success"?C.eucalyptus:l.type==="error"?C.negative:l.type==="warning"?C.warning:l.type==="reasoning"?C.wheatDark:C.charcoal,lineHeight:1.4}}>{l.message}</span>
                </div>
              ))}
              {log.length===0&&<div style={{color:C.lightGrey,textAlign:"center",padding:"14px 0"}}>No activity yet — start trading to begin</div>}
            </Card>
          </div>
        </div>
      )}

      {/* ─── POSITIONS ─── */}
      {activeTab==="positions" && (
        <div style={{animation:"fadeIn 0.2s ease"}}>
          <SectionHead label="OPEN POSITIONS" sub={`${portfolio.positions.length} positions · All stops active · Auto-closes on SL/TP hit`}/>
          {portfolio.positions.length===0 ? (
            <Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>📭</div><div style={{color:C.wheatDark}}>No open positions</div></Card>
          ) : (
            portfolio.positions.map(pos=>{
              const cur=prices[pos.symbol]?.current||pos.entryPrice;
              const updPos=updatePositionPnL(pos,cur);
              const up=updPos.unrealisedPnL>=0;
              const hist=prices[pos.symbol]?.history||[];
              return (
                <Card key={pos.id} style={{padding:18,marginBottom:10,borderLeft:`4px solid ${up?C.eucalyptus:C.negative}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:16,alignItems:"start"}}>
                    <span style={{fontSize:28}}>{pos.emoji}</span>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{color:C.charcoal,fontSize:15,fontWeight:700}}>{pos.name}</span>
                        <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:pos.direction==="LONG"?C.eucalyptus:C.negative}}>{pos.direction}</span>
                        <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",color:C.navy,background:C.navyPale,border:`1px solid ${C.navy}22`}}>{pos.contracts} contract{pos.contracts>1?"s":""}</span>
                        <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",color:C.eucalyptus,background:C.eucalyptusPale}}>Confidence: {pos.confidence}%</span>
                        <span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{pos.openedAt?.toLocaleTimeString("en-AU")}</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(5,auto)",gap:"4px 20px",marginBottom:10}}>
                        {[["ENTRY",pos.entryPrice.toFixed(4),C.charcoal],["CURRENT",cur.toFixed(4),up?C.eucalyptus:C.negative],["STOP",pos.stopLoss.toFixed(4),C.negative],["TARGET",pos.takeProfit.toFixed(4),C.eucalyptus],["MARGIN",$`$${pos.marginUsed.toFixed(0)}`,C.navy]].map(([l,v,c])=>(
                          <div key={l}><div style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:1}}>{l}</div><div style={{color:c,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</div></div>
                        ))}
                      </div>
                      <div style={{color:C.charcoal,fontSize:12,fontStyle:"italic",padding:"6px 10px",background:C.eggshell,borderRadius:2,borderLeft:`2px solid ${C.wheat}`,marginBottom:8}}>"{pos.reasoning}"</div>
                    </div>
                    <Sparkline data={hist} color={up?C.eucalyptus:C.negative}/>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:up?C.eucalyptus:C.negative,fontSize:22,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{up?"+":"-"}${Math.abs(updPos.unrealisedPnL).toFixed(0)}</div>
                      <div style={{color:up?C.eucalyptus:C.negative,fontSize:12,fontFamily:"'DM Mono',monospace",marginBottom:10}}>{up?"+":""}{updPos.pnlPct?.toFixed(2)}%</div>
                      <Btn variant="red" style={{fontSize:10,padding:"5px 12px"}} onClick={()=>closePosition(pos.id)}>CLOSE POSITION</Btn>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── SCANNER ─── */}
      {activeTab==="scanner" && (
        <div style={{animation:"fadeIn 0.2s ease"}}>
          <SectionHead label="MARKET SCANNER" sub="Claude analyses each instrument and generates BUY/SELL/HOLD signals with confidence scores"
            action={<Btn onClick={runScan} disabled={!!scanningSymbol||portfolio.halted} style={{padding:"7px 14px"}}>{scanningSymbol?<><Spinner/>SCANNING {scanningSymbol}...</>:"🔍 RUN FULL SCAN"}</Btn>}
          />
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10,marginBottom:16}}>
            {INSTRUMENTS.map(inst=>{
              const sig=SIGNAL_DATA[inst.symbol];
              const cur=prices[inst.symbol]?.current||inst.price;
              const up=cur>=inst.price;
              const isOpen=portfolio.positions.find(p=>p.symbol===inst.symbol);
              const isScanning=scanningSymbol===inst.symbol;
              const sectorColors={Grains:C.eucalyptus,Livestock:C.navy,Softs:C.wheat,Inputs:C.warning,Currencies:C.navyLight,Energy:C.wheatDark};
              return (
                <Card key={inst.symbol} style={{padding:14,animation:isScanning?"scanPulse 0.8s infinite":undefined,border:`1px solid ${isOpen?C.eucalyptus:C.lightGrey}`,borderTop:`3px solid ${sectorColors[inst.sector]||C.lightGrey}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>{inst.emoji}</span><div><div style={{color:C.charcoal,fontSize:12,fontWeight:700}}>{inst.symbol}</div><div style={{color:C.wheatDark,fontSize:9}}>{inst.sector}</div></div></div>
                    {sig ? <span style={{fontSize:9,padding:"2px 6px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:700,color:sig.overall==="BULLISH"?C.eucalyptus:sig.overall==="BEARISH"?C.negative:C.warning,background:sig.overall==="BULLISH"?C.eucalyptusPale:sig.overall==="BEARISH"?C.negativePale:C.warningPale}}>{sig.overall}</span> : <span style={{color:C.lightGrey,fontSize:9}}>—</span>}
                  </div>
                  <div style={{color:C.navy,fontSize:16,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:2}}>{cur.toFixed(inst.symbol==="6A"||inst.symbol==="6B"||inst.symbol==="DX"?4:2)}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{inst.unit}</span>
                    {sig && <div style={{height:3,width:60,background:C.lightGrey,borderRadius:2}}><div style={{height:"100%",width:`${sig.score}%`,background:sig.score>=65?C.eucalyptus:sig.score>=45?C.warning:C.negative,borderRadius:2}}/></div>}
                  </div>
                  {isOpen ? (
                    <div style={{padding:"4px 8px",background:C.eucalyptusPale,borderRadius:2,fontSize:10,color:C.eucalyptus,fontFamily:"'DM Mono',monospace",fontWeight:600}}>POSITION OPEN</div>
                  ) : (
                    <Btn variant="outline" style={{fontSize:10,padding:"5px 10px",width:"100%"}} onClick={()=>manualSignal(inst.symbol)} disabled={isScanning}>
                      {isScanning?<><Spinner/>Analysing...</>:"◆ Get Signal"}
                    </Btn>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TRADE LOG ─── */}
      {activeTab==="history" && (
        <div style={{animation:"fadeIn 0.2s ease"}}>
          <SectionHead label="TRADE LOG" sub={`${portfolio.closedTrades.length} closed trades · Win rate: ${winRate.toFixed(1)}% · Profit factor: ${profitFactor.toFixed(2)}`}/>
          {portfolio.closedTrades.length===0 ? (
            <Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>📋</div><div style={{color:C.wheatDark}}>No closed trades yet</div></Card>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {portfolio.closedTrades.map(t=>{
                const win=t.closePnL>0;
                return (
                  <Card key={t.id} style={{padding:"12px 16px",borderLeft:`4px solid ${win?C.eucalyptus:C.negative}`,display:"flex",alignItems:"center",gap:14}}>
                    <span style={{fontSize:20,flexShrink:0}}>{t.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{color:C.charcoal,fontSize:13,fontWeight:700}}>{t.name}</span>
                        <span style={{fontSize:9,padding:"1px 5px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:t.direction==="LONG"?C.eucalyptus:C.negative}}>{t.direction}</span>
                        <span style={{fontSize:9,padding:"1px 5px",borderRadius:2,fontFamily:"'DM Mono',monospace",color:win?C.eucalyptus:C.negative,background:win?C.eucalyptusPale:C.negativePale}}>{t.closeReason}</span>
                        <span style={{color:C.lightGrey,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{t.closedAt?.toLocaleDateString("en-AU")}</span>
                      </div>
                      <div style={{display:"flex",gap:14}}>
                        {[["Entry",t.entryPrice?.toFixed(4)],["Exit",t.closePrice?.toFixed(4)],["Contracts",t.contracts],["Confidence",`${t.confidence}%`]].map(([l,v])=>(
                          <div key={l}><span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{l}: </span><span style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500}}>{v}</span></div>
                        ))}
                      </div>
                      {t.reasoning&&<div style={{color:C.wheatDark,fontSize:10,fontStyle:"italic",marginTop:4}}>"{t.reasoning}"</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{color:win?C.eucalyptus:C.negative,fontSize:18,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{win?"+":"-"}${Math.abs(t.closePnL).toFixed(0)}</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <div style={{marginTop:20}}>
            <SectionHead label="FULL ACTIVITY LOG" sub="All system events"/>
            <Card style={{padding:14,maxHeight:400,overflowY:"auto",fontFamily:"'DM Mono',monospace",fontSize:11}}>
              {log.map(l=>(
                <div key={l.id} style={{padding:"3px 0",borderBottom:`1px solid ${C.lightGrey}`,display:"flex",gap:10}}>
                  <span style={{color:C.lightGrey,flexShrink:0,width:56}}>{l.time}</span>
                  <span style={{color:l.type==="success"?C.eucalyptus:l.type==="error"?C.negative:l.type==="warning"?C.warning:l.type==="reasoning"?C.wheatDark:C.charcoal}}>{l.message}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ─── SETTINGS ─── */}
      {activeTab==="settings" && (
        <div style={{animation:"fadeIn 0.2s ease"}}>
          <SectionHead label="TRADING SETTINGS"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
            <Card style={{padding:20}}>
              <div style={{color:C.charcoal,fontSize:13,fontWeight:600,marginBottom:14}}>Risk Management</div>
              {[
                {l:"Starting Capital",     v:`$${INITIAL_CAPITAL.toLocaleString()}`, note:"Set at initialisation"},
                {l:"Daily Loss Limit",     v:`$${portfolio.dailyLossLimit.toFixed(0)} (5% of capital)`, note:"Trading halts if breached"},
                {l:"Max Open Positions",   v:"5", note:"Prevents overexposure"},
                {l:"Min Signal Confidence",v:"65%", note:"Below this = HOLD"},
                {l:"Max Contracts/Trade",  v:"3", note:"Scales with confidence"},
                {l:"Risk Per Trade",       v:"Claude-managed (0.5–5%)", note:"Based on signal confidence"},
                {l:"Stop Loss Method",     v:"ATR-based (0.8% price proxy)", note:"Auto-calculated per instrument"},
                {l:"Min R:R Ratio",        v:"2:1", note:"TP always 2x the SL distance"},
              ].map(([l,v,note])=>(
                <div key={l} style={{padding:"8px 0",borderBottom:`1px solid ${C.lightGrey}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{color:C.charcoal,fontSize:12}}>{l}</span><span style={{color:C.navy,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</span></div>
                  <div style={{color:C.wheatDark,fontSize:10}}>{note}</div>
                </div>
              ))}
            </Card>
            <Card style={{padding:20}}>
              <div style={{color:C.charcoal,fontSize:13,fontWeight:600,marginBottom:14}}>Scan Frequency</div>
              <div style={{marginBottom:16}}>
                <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:6}}>SCAN EVERY (MINUTES)</div>
                <div style={{display:"flex",gap:8}}>
                  {[15,30,60,120].map(m=>(
                    <button key={m} onClick={()=>setPortfolio(p=>({...p,signalInterval:m}))} style={{background:portfolio.signalInterval===m?C.eucalyptus:C.white,color:portfolio.signalInterval===m?C.white:C.charcoal,border:`1px solid ${portfolio.signalInterval===m?C.eucalyptus:C.lightGrey}`,borderRadius:3,padding:"8px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500}}>{m}m</button>
                  ))}
                </div>
              </div>
              <div style={{color:C.charcoal,fontSize:13,fontWeight:600,marginBottom:10,marginTop:18}}>IBKR Live Trading Hook</div>
              <div style={{padding:"12px 14px",background:C.offwhite,border:`1px dashed ${C.lightGrey}`,borderRadius:3,marginBottom:10}}>
                <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:4}}>⚡ HOOK: Interactive Brokers API</div>
                <div style={{color:C.charcoal,fontSize:12,lineHeight:1.6,fontFamily:"'Lora',serif"}}>When you're ready to go live, replace the paper execution layer with IBKR's TWS API. All signal logic stays the same — only the order execution changes. Requires: IBKR account, TWS running, API enabled on port 7497.</div>
              </div>
              <div style={{color:C.charcoal,fontSize:11,lineHeight:1.6,fontFamily:"'Lora',serif"}}>
                <strong>Recommended path to live trading:</strong><br/>
                1. Run paper mode for 3+ months<br/>
                2. Achieve &gt;50% win rate and profit factor &gt;1.5<br/>
                3. Open IBKR account with $10,000 real capital<br/>
                4. Enable IBKR API hook above<br/>
                5. Start live with same risk settings
              </div>
              <div style={{marginTop:16}}>
                <Btn variant="red" onClick={resetPortfolio} style={{fontSize:11,width:"100%"}}>🔄 RESET PAPER PORTFOLIO</Btn>
              </div>
            </Card>
          </div>
          <Card style={{padding:16,background:C.warningPale,border:`1px solid ${C.warning}33`}}>
            <div style={{color:C.warning,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:4}}>⚠ PAPER TRADING DISCLAIMER</div>
            <div style={{color:C.charcoal,fontSize:12,lineHeight:1.6,fontFamily:"'Lora',serif"}}>This is a paper trading simulation using simulated price movements. Results do not reflect actual market performance and are not indicative of future results. Live commodity futures trading involves substantial risk of loss and is not suitable for all investors. Always consult a licensed financial advisor before trading with real capital. This tool is for educational and research purposes only.</div>
          </Card>
        </div>
      )}
    </div>
  );
}
