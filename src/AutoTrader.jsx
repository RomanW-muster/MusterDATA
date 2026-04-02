// ─────────────────────────────────────────────────────────────────────────────
// MUSTER — AUTO TRADER  (Professional Trading Model)
// src/AutoTrader.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const save = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.error('Storage error:', e); } }
const load = (key, fallback) => { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch(e) { return fallback; } }

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

// ─── INSTRUMENTS ─────────────────────────────────────────────────────────────
const INSTRUMENTS = [
  { symbol:"ZC",  name:"Corn",            emoji:"🌽", sector:"Grains",     contractSize:5000,   unit:"¢/bu",   tickSize:0.25,  tickValue:12.50, margin:1500, price:478.25  },
  { symbol:"ZW",  name:"Wheat",           emoji:"🌾", sector:"Grains",     contractSize:5000,   unit:"¢/bu",   tickSize:0.25,  tickValue:12.50, margin:1800, price:592.50  },
  { symbol:"ZS",  name:"Soybeans",        emoji:"🫘", sector:"Grains",     contractSize:5000,   unit:"¢/bu",   tickSize:0.25,  tickValue:12.50, margin:2200, price:1087.75 },
  { symbol:"ZM",  name:"Soy Meal",        emoji:"🌱", sector:"Grains",     contractSize:100,    unit:"$/ton",  tickSize:0.10,  tickValue:10.00, margin:1400, price:312.40  },
  { symbol:"ZO",  name:"Oats",            emoji:"🌿", sector:"Grains",     contractSize:5000,   unit:"¢/bu",   tickSize:0.25,  tickValue:12.50, margin:800,  price:312.50  },
  { symbol:"LE",  name:"Live Cattle",     emoji:"🐄", sector:"Livestock",  contractSize:400,    unit:"¢/lb",   tickSize:0.025, tickValue:10.00, margin:1800, price:184.325 },
  { symbol:"HE",  name:"Lean Hogs",       emoji:"🐖", sector:"Livestock",  contractSize:400,    unit:"¢/lb",   tickSize:0.025, tickValue:10.00, margin:1400, price:91.275  },
  { symbol:"GF",  name:"Feeder Cattle",   emoji:"🐂", sector:"Livestock",  contractSize:500,    unit:"¢/lb",   tickSize:0.025, tickValue:12.50, margin:2200, price:252.50  },
  { symbol:"CT",  name:"Cotton",          emoji:"🌿", sector:"Softs",      contractSize:500,    unit:"¢/lb",   tickSize:0.01,  tickValue:5.00,  margin:1200, price:78.45   },
  { symbol:"KC",  name:"Coffee",          emoji:"☕", sector:"Softs",      contractSize:375,    unit:"¢/lb",   tickSize:0.05,  tickValue:18.75, margin:2800, price:342.80  },
  { symbol:"SB",  name:"Sugar #11",       emoji:"🍬", sector:"Softs",      contractSize:1120,   unit:"¢/lb",   tickSize:0.01,  tickValue:11.20, margin:900,  price:19.85   },
  { symbol:"UAN", name:"Urea (proxy)",    emoji:"🧪", sector:"Inputs",     contractSize:100,    unit:"$/ton",  tickSize:1.00,  tickValue:100,   margin:1500, price:285.00  },
  { symbol:"6A",  name:"AUD/USD",         emoji:"🇦🇺", sector:"Currencies", contractSize:100000, unit:"USD",    tickSize:0.0001,tickValue:10.00, margin:1200, price:0.6234  },
  { symbol:"DX",  name:"US Dollar Index", emoji:"💵", sector:"Currencies", contractSize:1000,   unit:"pts",    tickSize:0.005, tickValue:5.00,  margin:1800, price:104.23  },
  { symbol:"HO",  name:"Heating Oil",     emoji:"⛽", sector:"Energy",     contractSize:42000,  unit:"$/gal",  tickSize:0.0001,tickValue:4.20,  margin:5000, price:2.685   },
  { symbol:"NG",  name:"Natural Gas",     emoji:"🔥", sector:"Energy",     contractSize:10000,  unit:"$/MMBtu",tickSize:0.001, tickValue:10.00, margin:2000, price:1.924   },
];

// ─── VARIABLE WEIGHTS ─────────────────────────────────────────────────────────
const WEIGHTS = { wasde:0.25, weather:0.20, exports:0.20, cot:0.15, seasonal:0.10, currency:0.10 };
const VAR_LABELS = { wasde:"WASDE", weather:"Weather", exports:"Exports", cot:"COT", seasonal:"Seasonal", currency:"Currency" };

// ─── SIGNAL DATA  (per-variable numeric scores 0–100) ─────────────────────────
// Bullish ~70-85, Neutral ~45-55, Bearish ~15-35
const SIGNAL_DATA = {
  ZC:  { vars:{ wasde:72, weather:68, exports:36, cot:70, seasonal:50, currency:74 }},
  ZW:  { vars:{ wasde:78, weather:75, exports:71, cot:32, seasonal:72, currency:76 }},
  ZS:  { vars:{ wasde:33, weather:65, exports:50, cot:68, seasonal:30, currency:33 }},
  ZM:  { vars:{ wasde:50, weather:50, exports:65, cot:66, seasonal:50, currency:34 }},
  ZO:  { vars:{ wasde:50, weather:52, exports:50, cot:50, seasonal:50, currency:50 }},
  LE:  { vars:{ wasde:80, weather:76, exports:52, cot:78, seasonal:73, currency:74 }},
  HE:  { vars:{ wasde:28, weather:30, exports:64, cot:50, seasonal:29, currency:30 }},
  GF:  { vars:{ wasde:74, weather:52, exports:50, cot:70, seasonal:71, currency:50 }},
  CT:  { vars:{ wasde:50, weather:66, exports:50, cot:50, seasonal:50, currency:50 }},
  KC:  { vars:{ wasde:69, weather:74, exports:68, cot:52, seasonal:50, currency:50 }},
  SB:  { vars:{ wasde:32, weather:50, exports:50, cot:50, seasonal:50, currency:50 }},
  UAN: { vars:{ wasde:50, weather:50, exports:50, cot:50, seasonal:50, currency:50 }},
  "6A":{ vars:{ wasde:50, weather:50, exports:64, cot:50, seasonal:50, currency:65 }},
  DX:  { vars:{ wasde:30, weather:50, exports:30, cot:28, seasonal:50, currency:32 }},
  HO:  { vars:{ wasde:50, weather:55, exports:50, cot:50, seasonal:50, currency:50 }},
  NG:  { vars:{ wasde:50, weather:58, exports:50, cot:50, seasonal:48, currency:50 }},
};

// ─── ENGINE FUNCTIONS ─────────────────────────────────────────────────────────
function computeWeightedScore(vars, prevScore) {
  const raw = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + (vars[k] ?? 50) * w, 0);
  const velocity = prevScore != null ? (raw > prevScore + 1 ? 5 : raw < prevScore - 1 ? -5 : 0) : 0;
  return Math.min(100, Math.max(0, raw + velocity));
}

function calcATR(history, periods = 14) {
  if (!history || history.length < 2) return (history?.[history.length - 1] || 1) * 0.008;
  const trs = [];
  for (let i = 1; i < history.length; i++) trs.push(Math.abs(history[i] - history[i - 1]));
  const recent = trs.slice(-periods);
  return recent.reduce((s, v) => s + v, 0) / recent.length;
}

function calc10DMA(history) {
  if (!history || history.length < 2) return history?.[history.length - 1] || 0;
  const slice = history.slice(-10);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function detectRegime(history) {
  if (!history || history.length < 20) return "RANGING";
  const half = Math.floor(history.length / 2);
  const earlyAvg = history.slice(0, half).reduce((s, v) => s + v, 0) / half;
  const lateAvg = history.slice(half).reduce((s, v) => s + v, 0) / (history.length - half);
  const atr = calcATR(history);
  const avgPrice = history.reduce((s, v) => s + v, 0) / history.length;
  const volPct = avgPrice > 0 ? atr / avgPrice : 0;
  if (volPct > 0.014) return "HIGH_VOL";
  if (volPct < 0.003) return "LOW_VOL";
  const trend = earlyAvg > 0 ? Math.abs(lateAvg - earlyAvg) / earlyAvg : 0;
  if (trend > 0.03) return lateAvg > earlyAvg ? "TRENDING_UP" : "TRENDING_DOWN";
  return "RANGING";
}

function computeKelly(closedTrades, accountSize, riskPerContract) {
  if (!closedTrades || closedTrades.length < 5) return 1;
  const wins = closedTrades.filter(t => t.pnl > 0);
  const losses = closedTrades.filter(t => t.pnl <= 0);
  const winRate = wins.length / closedTrades.length;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
  const k = winRate - (1 - winRate) / (avgWin / avgLoss);
  const halfK = Math.max(0, k / 2);
  const maxRisk = accountSize * halfK;
  const contracts = Math.floor(maxRisk / Math.max(riskPerContract, 1));
  return Math.min(3, Math.max(1, contracts || 1));
}

function checkEntryFilters(inst, vars, prevScore, portfolio, priceData) {
  const history = priceData?.history || [];
  const currentPrice = priceData?.current || inst.price;
  const score = computeWeightedScore(vars, prevScore);
  const atr = calcATR(history);
  const dma10 = calc10DMA(history);
  const regime = detectRegime(history);

  const bullVarCount = Object.values(vars).filter(v => v > 60).length;
  const bearVarCount = Object.values(vars).filter(v => v < 40).length;
  const direction = score >= 50 ? "LONG" : "SHORT";
  const confluenceCount = direction === "LONG" ? bullVarCount : bearVarCount;

  const alreadyAligned = confluenceCount >= 5;
  const scoreThreshold = alreadyAligned ? 65 : 70;
  const scoreOk = direction === "LONG" ? score >= scoreThreshold : score <= (100 - scoreThreshold);

  const dmaOk = direction === "LONG" ? currentPrice >= dma10 * 0.997 : currentPrice <= dma10 * 1.003;
  const atrOk = regime !== "LOW_VOL";
  const confluenceOk = confluenceCount >= 4;

  const openPositions = portfolio.positions || [];
  const totalMargin = openPositions.reduce((s, p) => s + (p.margin || 0), 0);
  const sectorPositions = openPositions.filter(p => p.sector === inst.sector);
  const sectorMargin = sectorPositions.reduce((s, p) => s + (p.margin || 0), 0);
  const portfolioHeat = portfolio.initialCapital > 0 ? totalMargin / portfolio.initialCapital : 0;
  const sectorHeat = portfolio.initialCapital > 0 ? sectorMargin / portfolio.initialCapital : 0;
  const heatOk = portfolioHeat < 0.25;
  const sectorOk = sectorHeat < 0.35;
  const marginCapOk = (inst.margin * 2) / portfolio.initialCapital < 0.08;

  const recentTrades = (portfolio.closedTrades || []).slice(-4);
  const consecLosses = recentTrades.length === 4 && recentTrades.every(t => t.pnl < 0);
  const dailyLossOk = (portfolio.dailyLoss || 0) > -(portfolio.initialCapital * 0.04);
  const weeklyLossOk = (portfolio.weeklyLoss || 0) > -(portfolio.initialCapital * 0.08);
  const equity = portfolio.cash + openPositions.reduce((s, p) => s + (p.unrealisedPnL || 0), 0);
  const drawdown = portfolio.initialCapital > 0 ? (portfolio.initialCapital - equity) / portfolio.initialCapital : 0;
  const drawdownOk = drawdown < 0.15;
  const riskOk = !consecLosses && dailyLossOk && weeklyLossOk && drawdownOk && !portfolio.halted;

  const passed = scoreOk && dmaOk && atrOk && confluenceOk && heatOk && sectorOk && marginCapOk && riskOk;
  return {
    passed, direction, score, confluenceCount, atr, dma10, regime,
    scoreOk, dmaOk, atrOk, confluenceOk, heatOk, sectorOk, marginCapOk, riskOk,
    portfolioHeat, sectorHeat, scoreThreshold, drawdown,
    reasons: { consecLosses, dailyLossOk, weeklyLossOk, drawdownOk },
  };
}

function updateAttribution(attribution, trade, vars) {
  const next = { ...attribution };
  const won = trade.pnl > 0;
  Object.keys(WEIGHTS).forEach(k => {
    const score = vars[k] ?? 50;
    const aligned = trade.direction === "LONG" ? score > 60 : score < 40;
    if (aligned) {
      next[k] = { correct: (next[k]?.correct || 0) + (won ? 1 : 0), total: (next[k]?.total || 0) + 1 };
    }
  });
  return next;
}

function computeStats(closedTrades, initialCapital) {
  if (!closedTrades || closedTrades.length === 0) return null;
  const wins = closedTrades.filter(t => t.pnl > 0);
  const losses = closedTrades.filter(t => t.pnl <= 0);
  const winRate = wins.length / closedTrades.length;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
  const rets = closedTrades.map(t => t.pnl / initialCapital);
  const mean = rets.reduce((s, v) => s + v, 0) / rets.length;
  const rfRate = 0.05 / 252;
  const variance = rets.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / rets.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? ((mean - rfRate) / stdDev) * Math.sqrt(252) : 0;
  const downRets = rets.filter(v => v < 0);
  const downVar = downRets.length ? downRets.reduce((s, v) => s + Math.pow(v, 2), 0) / downRets.length : 0;
  const sortino = downVar > 0 ? ((mean - rfRate) / Math.sqrt(downVar)) * Math.sqrt(252) : 0;
  const last10 = closedTrades.slice(-10);
  const last20 = closedTrades.slice(-20);
  const winRate10 = last10.length ? last10.filter(t => t.pnl > 0).length / last10.length : null;
  const winRate20 = last20.length ? last20.filter(t => t.pnl > 0).length / last20.length : null;
  const best = closedTrades.reduce((b, t) => t.pnl > b.pnl ? t : b, closedTrades[0]);
  const worst = closedTrades.reduce((b, t) => t.pnl < b.pnl ? t : b, closedTrades[0]);
  return { winRate, avgWin, avgLoss, expectancy, sharpe, sortino, winRate10, winRate20, best, worst };
}

// ─── PRICE SIMULATION ────────────────────────────────────────────────────────
function genPriceHistory(base, days = 30, vol = 0.008) {
  const data = []; let p = base * 0.94;
  for (let i = days; i >= 0; i--) {
    p = p * (1 + (Math.random() - 0.47) * vol);
    data.push(parseFloat(p.toFixed(4)));
  }
  data[data.length - 1] = base;
  return data;
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
function Card({ children, style = {}, ...r }) {
  return <div style={{ background: C.white, border: `1px solid ${C.lightGrey}`, borderRadius: 4, display: "flex", flexDirection: "column", ...style }} {...r}>{children}</div>;
}
function SectionHead({ label, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
      <div>
        <span style={{ background: C.eucalyptus, color: "#fff", padding: "4px 12px", borderRadius: 3, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.12em", fontWeight: 600, display: "inline-block", marginBottom: sub ? 4 : 0 }}>{label}</span>
        {sub && <div style={{ color: C.wheatDark, fontSize: 9, fontFamily: "'DM Mono',monospace" }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}
function Btn({ children, onClick, disabled, variant = "green", style = {} }) {
  const bg = disabled ? C.lightGrey : variant === "green" ? C.eucalyptus : variant === "navy" ? C.navy : variant === "red" ? C.negative : variant === "warning" ? C.warning : C.white;
  const color = variant === "outline" ? C.charcoal : C.white;
  return <button onClick={onClick} disabled={disabled} style={{ background: bg, color, border: variant === "outline" ? `1px solid ${C.lightGrey}` : "none", borderRadius: 3, padding: "8px 16px", cursor: disabled ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 600, letterSpacing: "0.04em", ...style }}>{children}</button>;
}
function Sparkline({ data, color = C.eucalyptus, height = 32 }) {
  if (!data || data.length < 2) return null;
  const W = 120; const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const px = i => (i / (data.length - 1)) * W;
  const py = v => height - ((v - min) / range) * height;
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");
  const fill = path + ` L${W},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: 120, height, display: "block" }} preserveAspectRatio="none">
      <defs><linearGradient id={`sg_${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.15" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={fill} fill={`url(#sg_${color.replace("#", "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PnLCurve({ history }) {
  if (!history || history.length < 2) return <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: C.lightGrey, fontSize: 12 }}>No trade history yet</div>;
  const W = 560, H = 80, PAD = { t: 8, b: 20, l: 8, r: 8 };
  const min = Math.min(...history); const max = Math.max(...history); const range = max - min || 1;
  const px = i => PAD.l + (i / (history.length - 1)) * (W - PAD.l - PAD.r);
  const py = v => PAD.t + (1 - (v - min) / range) * (H - PAD.t - PAD.b);
  const path = history.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");
  const fill = path + ` L${px(history.length - 1)},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`;
  const isUp = history[history.length - 1] >= history[0];
  const color = isUp ? C.eucalyptus : C.negative;
  const baseline = py(history[0]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} preserveAspectRatio="none">
      <defs><linearGradient id="pnlgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <line x1={PAD.l} y1={baseline} x2={W - PAD.r} y2={baseline} stroke={C.lightGrey} strokeWidth="1" strokeDasharray="3,3" />
      <path d={fill} fill="url(#pnlgrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ScoreBar({ label, score, weight }) {
  const bullish = score > 60; const bearish = score < 40;
  const barColor = bullish ? C.eucalyptus : bearish ? C.negative : C.warning;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.charcoal, fontWeight: 600 }}>{label}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>w={Math.round(weight * 100)}%</span>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: barColor }}>{Math.round(score)}</span>
        </div>
      </div>
      <div style={{ height: 6, background: C.lightGrey, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: barColor, marginTop: 2 }}>
        {bullish ? "BULLISH" : bearish ? "BEARISH" : "NEUTRAL"}
      </div>
    </div>
  );
}

function FilterRow({ label, passed, detail }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.offwhite}` }}>
      <span style={{ fontSize: 12, color: passed ? C.eucalyptus : C.negative }}>{passed ? "✓" : "✗"}</span>
      <span style={{ flex: 1, fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.charcoal }}>{label}</span>
      {detail && <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>{detail}</span>}
    </div>
  );
}

function RegimeBadge({ regime }) {
  const map = {
    TRENDING_UP:   { color: C.eucalyptus, bg: C.eucalyptusPale, label: "↑ TRENDING UP" },
    TRENDING_DOWN: { color: C.negative,   bg: C.negativePale,   label: "↓ TRENDING DOWN" },
    RANGING:       { color: C.navy,       bg: C.navyPale,       label: "↔ RANGING" },
    HIGH_VOL:      { color: C.warning,    bg: C.warningPale,    label: "⚡ HIGH VOL" },
    LOW_VOL:       { color: C.wheatDark,  bg: C.wheatPale,      label: "— LOW VOL" },
  };
  const r = map[regime] || map.RANGING;
  return <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: r.color, background: r.bg, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.05em" }}>{r.label}</span>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AutoTrader() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isRunning, setIsRunning] = useState(false);
  const [scanningSymbol, setScanningSymbol] = useState(null);
  const [fundSize, setFundSize] = useState(() => load("muster_portfolio", null)?.initialCapital || 10000);
  const [pendingFund, setPendingFund] = useState("");
  const [log, setLog] = useState(() => load("muster_tradelog", []));
  const [lastSaved, setLastSaved] = useState(null);
  const [selectedInst, setSelectedInst] = useState("ZW"); // for reasoning tab
  const [ibkrMode, setIbkrMode] = useState("paper");
  const [ibkrConfirmText, setIbkrConfirmText] = useState("");
  const [ibkrShowConfirm, setIbkrShowConfirm] = useState(false);

  const [prevScores, setPrevScores] = useState(() => load("muster_signals", {}));
  const [attribution, setAttribution] = useState(
    Object.fromEntries(Object.keys(WEIGHTS).map(k => [k, { correct: 0, total: 0 }]))
  );

  const initialCapital = fundSize;

  const [portfolio, setPortfolio] = useState(() => {
    const saved = load("muster_portfolio", null);
    if (saved) return saved;
    return {
      cash: initialCapital,
      initialCapital,
      positions: [],
      closedTrades: [],
      pnlHistory: [initialCapital],
      dailyLoss: 0,
      weeklyLoss: 0,
      halted: false,
      haltReason: "",
    };
  });

  const [prices, setPrices] = useState(() =>
    Object.fromEntries(INSTRUMENTS.map(i => [i.symbol, { current: i.price, history: genPriceHistory(i.price) }]))
  );

  const intervalRef = useRef(null);
  const portfolioRef = useRef(portfolio);
  const pricesRef = useRef(prices);
  const prevScoresRef = useRef(prevScores);
  const attributionRef = useRef(attribution);

  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);
  useEffect(() => { pricesRef.current = prices; }, [prices]);
  useEffect(() => { prevScoresRef.current = prevScores; }, [prevScores]);
  useEffect(() => { attributionRef.current = attribution; }, [attribution]);

  // ── Persist to localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    save("muster_portfolio", portfolio);
    setLastSaved(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [portfolio]);
  useEffect(() => { save("muster_tradelog", log); }, [log]);
  useEffect(() => { save("muster_signals", prevScores); }, [prevScores]);

  const addLog = useCallback((msg, type = "info") => {
    setLog(prev => [{ msg, type, time: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev.slice(0, 49)]);
  }, []);

  // ── Price tick ──────────────────────────────────────────────────────────────
  const tickPrices = useCallback(() => {
    setPrices(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(sym => {
        const inst = INSTRUMENTS.find(i => i.symbol === sym);
        if (!inst) return;
        const vol = inst.sector === "Currencies" ? 0.0003 : 0.004;
        const change = (Math.random() - 0.495) * vol;
        const newPrice = parseFloat((next[sym].current * (1 + change)).toFixed(4));
        next[sym] = { current: newPrice, history: [...next[sym].history.slice(-29), newPrice] };
      });
      return next;
    });
  }, []);

  // ── Update P&L for open positions ───────────────────────────────────────────
  const updatePositionPnL = useCallback((pos, currentPrice) => {
    const inst = INSTRUMENTS.find(i => i.symbol === pos.symbol);
    if (!inst) return pos;
    const priceDiff = pos.direction === "LONG" ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
    const pnl = (priceDiff / inst.tickSize) * inst.tickValue * pos.contracts;
    const pnlPct = pos.entryValue > 0 ? (pnl / pos.entryValue) * 100 : 0;
    const peakPnl = Math.max(pos.peakPnl || 0, pnl);
    // Update trailing stop
    let stopLoss = pos.stopLoss;
    const atr = calcATR(pricesRef.current[pos.symbol]?.history || []);
    const atrDollar = (atr / inst.tickSize) * inst.tickValue;
    if (pnl >= atrDollar && !pos.movedToBreakeven) {
      // Move to breakeven after 1×ATR profit
      stopLoss = pos.entryPrice;
    }
    if (pnl >= atrDollar * 2) {
      // Trail at 1.5×ATR from peak price
      const peakPrice = pos.direction === "LONG"
        ? pos.entryPrice + (peakPnl / pos.contracts / inst.tickValue) * inst.tickSize
        : pos.entryPrice - (peakPnl / pos.contracts / inst.tickValue) * inst.tickSize;
      stopLoss = pos.direction === "LONG"
        ? Math.max(stopLoss, peakPrice - atr * 1.5)
        : Math.min(stopLoss, peakPrice + atr * 1.5);
    }
    return {
      ...pos, currentPrice, unrealisedPnL: pnl, pnlPct, peakPnl,
      stopLoss, movedToBreakeven: pnl >= atrDollar || pos.movedToBreakeven,
      daysOpen: (pos.daysOpen || 0),
    };
  }, []);

  // ── Check exits ─────────────────────────────────────────────────────────────
  const processExits = useCallback((port, px) => {
    let updated = { ...port, positions: [...port.positions], closedTrades: [...port.closedTrades] };
    const toClose = [];

    updated.positions = updated.positions.map(pos => {
      const cur = px[pos.symbol]?.current || pos.entryPrice;
      const updPos = updatePositionPnL(pos, cur);

      // Stop loss hit
      const slHit = pos.direction === "LONG" ? cur <= updPos.stopLoss : cur >= updPos.stopLoss;
      if (slHit) { toClose.push({ ...updPos, closeReason: "STOP LOSS" }); return null; }

      // Take profit hit
      const tpHit = pos.direction === "LONG" ? cur >= pos.takeProfit : cur <= pos.takeProfit;
      if (tpHit) { toClose.push({ ...updPos, closeReason: "TAKE PROFIT" }); return null; }

      // Partial exit: 50% at 2×ATR profit (once)
      const inst = INSTRUMENTS.find(i => i.symbol === pos.symbol);
      if (inst && !pos.partialDone && updPos.unrealisedPnL > 0) {
        const atrDollar = calcATR(px[pos.symbol]?.history || []) / inst.tickSize * inst.tickValue;
        if (updPos.unrealisedPnL >= atrDollar * 2 && pos.contracts > 1) {
          const halfContracts = Math.floor(pos.contracts / 2);
          const halfPnl = updPos.unrealisedPnL * (halfContracts / pos.contracts);
          const closedHalf = { ...updPos, contracts: halfContracts, pnl: halfPnl, closeReason: "PARTIAL (2×ATR)" };
          toClose.push(closedHalf);
          return { ...updPos, contracts: pos.contracts - halfContracts, partialDone: true };
        }
      }

      // Time stop: 10 days unprofitable
      if ((updPos.daysOpen || 0) >= 10 && updPos.unrealisedPnL < 0) {
        toClose.push({ ...updPos, closeReason: "TIME STOP" }); return null;
      }

      // Signal invalidation: long score drops below 35, short rises above 65
      const sigVars = SIGNAL_DATA[pos.symbol]?.vars || {};
      const currentScore = computeWeightedScore(sigVars, prevScoresRef.current[pos.symbol]);
      const invalidated = pos.direction === "LONG" ? currentScore < 35 : currentScore > 65;
      if (invalidated) { toClose.push({ ...updPos, closeReason: "SIGNAL INVALIDATED" }); return null; }

      return updPos;
    }).filter(Boolean);

    // Process closed positions
    toClose.forEach(pos => {
      const pnl = pos.unrealisedPnL || 0;
      updated.cash += pnl;
      updated.dailyLoss = (updated.dailyLoss || 0) + Math.min(0, pnl);
      updated.weeklyLoss = (updated.weeklyLoss || 0) + Math.min(0, pnl);
      const closedTrade = {
        symbol: pos.symbol, name: pos.name, direction: pos.direction,
        entryPrice: pos.entryPrice, exitPrice: pos.currentPrice,
        contracts: pos.contracts, pnl, closeReason: pos.closeReason,
        closedAt: new Date().toISOString(),
      };
      updated.closedTrades = [...updated.closedTrades, closedTrade];
      // Attribution update
      const sigVars = SIGNAL_DATA[pos.symbol]?.vars || {};
      setAttribution(prev => updateAttribution(prev, closedTrade, sigVars));
    });

    // Update equity curve
    const equity = updated.cash + updated.positions.reduce((s, p) => s + (p.unrealisedPnL || 0), 0);
    updated.pnlHistory = [...(updated.pnlHistory || [initialCapital]), equity];

    // Risk halts
    if (!updated.halted) {
      if ((updated.dailyLoss || 0) <= -(updated.initialCapital * 0.04)) {
        updated.halted = true; updated.haltReason = "Daily loss limit (4%) breached";
      } else if ((updated.weeklyLoss || 0) <= -(updated.initialCapital * 0.08)) {
        updated.halted = true; updated.haltReason = "Weekly loss limit (8%) breached";
      } else if ((updated.initialCapital - equity) / updated.initialCapital >= 0.15) {
        updated.halted = true; updated.haltReason = "Drawdown halt (15%) triggered";
      } else if (updated.closedTrades.slice(-4).length === 4 && updated.closedTrades.slice(-4).every(t => t.pnl < 0)) {
        updated.halted = true; updated.haltReason = "Circuit breaker: 4 consecutive losses";
      }
    }

    if (toClose.length > 0) {
      toClose.forEach(pos => addLog(`CLOSED ${pos.symbol} ${pos.direction} — ${pos.closeReason} — P&L: $${(pos.unrealisedPnL || 0).toFixed(0)}`, pos.unrealisedPnL >= 0 ? "trade_win" : "trade_loss"));
    }

    return updated;
  }, [updatePositionPnL, addLog, initialCapital]);

  // ── Scan instruments and generate signals ───────────────────────────────────
  const runScan = useCallback(async () => {
    const port = portfolioRef.current;
    const px = pricesRef.current;
    if (port.halted) { addLog("Trading halted: " + port.haltReason, "halt"); return; }

    const newPrevScores = { ...prevScoresRef.current };

    for (const inst of INSTRUMENTS) {
      setScanningSymbol(inst.symbol);
      const sigData = SIGNAL_DATA[inst.symbol];
      if (!sigData) continue;
      const vars = sigData.vars || {};
      const prevScore = newPrevScores[inst.symbol] ?? null;
      const filters = checkEntryFilters(inst, vars, prevScore, port, px[inst.symbol]);
      newPrevScores[inst.symbol] = filters.score;

      if (!filters.passed) continue;
      // Already in this instrument?
      if (port.positions.some(p => p.symbol === inst.symbol)) continue;

      const atr = filters.atr;
      const entryPrice = px[inst.symbol]?.current || inst.price;
      const stopDist = atr * 2;
      const stopLoss = filters.direction === "LONG" ? entryPrice - stopDist : entryPrice + stopDist;
      const takeProfit = filters.direction === "LONG" ? entryPrice + atr * 4 : entryPrice - atr * 4;

      // Kelly sizing
      const riskPerContract = (stopDist / inst.tickSize) * inst.tickValue;
      const contracts = computeKelly(port.closedTrades, port.initialCapital, riskPerContract);

      const margin = inst.margin * contracts;
      const entryValue = margin;

      const position = {
        symbol: inst.symbol, name: inst.name, emoji: inst.emoji, sector: inst.sector,
        direction: filters.direction, entryPrice, currentPrice: entryPrice,
        stopLoss, takeProfit, contracts, margin, entryValue,
        unrealisedPnL: 0, pnlPct: 0, peakPnl: 0,
        movedToBreakeven: false, partialDone: false, daysOpen: 0,
        openedAt: new Date().toISOString(),
        entryScore: filters.score, entryConfluence: filters.confluenceCount,
      };

      setPortfolio(prev => ({
        ...prev,
        cash: prev.cash - margin,
        positions: [...prev.positions, position],
      }));

      addLog(`OPEN ${inst.symbol} ${filters.direction} ×${contracts} @ ${entryPrice.toFixed(4)} | SL: ${stopLoss.toFixed(4)} | TP: ${takeProfit.toFixed(4)} | Score: ${Math.round(filters.score)}`, "trade_open");
    }

    setPrevScores(newPrevScores);
    setScanningSymbol(null);
  }, [addLog]);

  // ── Main loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      tickPrices();
      setPortfolio(prev => processExits(prev, pricesRef.current));
    }, 2000);
    const scanTimer = setInterval(runScan, 30000);
    return () => { clearInterval(intervalRef.current); clearInterval(scanTimer); };
  }, [isRunning, tickPrices, processExits, runScan]);

  const handleStart = () => {
    if (portfolio.halted) { addLog("Cannot start — trading halted. Reset first.", "halt"); return; }
    setIsRunning(true);
    addLog("Auto-trader STARTED — scanning every 30s", "system");
    runScan();
  };
  const handleStop = () => { setIsRunning(false); addLog("Auto-trader STOPPED", "system"); };
  const handleReset = () => {
    setIsRunning(false);
    ["muster_portfolio","muster_tradelog","muster_signals"].forEach(k => localStorage.removeItem(k));
    setPortfolio({ cash: fundSize, initialCapital: fundSize, positions: [], closedTrades: [], pnlHistory: [fundSize], dailyLoss: 0, weeklyLoss: 0, halted: false, haltReason: "" });
    setAttribution(Object.fromEntries(Object.keys(WEIGHTS).map(k => [k, { correct: 0, total: 0 }])));
    setPrevScores({});
    setLog([]);
    setLastSaved(null);
    addLog("Portfolio reset", "system");
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const equity = portfolio.cash + portfolio.positions.reduce((s, p) => s + (p.unrealisedPnL || 0), 0);
  const totalPnL = equity - initialCapital;
  const totalPnLPct = initialCapital > 0 ? (totalPnL / initialCapital) * 100 : 0;
  const totalMarginUsed = portfolio.positions.reduce((s, p) => s + (p.margin || 0), 0);
  const portfolioHeat = initialCapital > 0 ? (totalMarginUsed / initialCapital * 100).toFixed(1) : "0.0";
  const stats = computeStats(portfolio.closedTrades, initialCapital);

  const TABS = [
    { id: "dashboard", label: "DASHBOARD" },
    { id: "scanner",   label: "SCANNER" },
    { id: "reasoning", label: "REASONING" },
    { id: "ibkr",      label: "IBKR" },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", color: C.charcoal }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <span style={{ background: C.navy, color: C.white, padding: "5px 14px", borderRadius: 3, fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>AUTO TRADER</span>
          <span style={{ marginLeft: 10, fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>PAPER MODE · {INSTRUMENTS.length} instruments</span>
          {lastSaved && <span style={{ marginLeft: 10, fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.eucalyptus }}>● Saved {lastSaved}</span>}
          {portfolio.halted && <span style={{ marginLeft: 10, background: C.negativePale, color: C.negative, padding: "3px 8px", borderRadius: 3, fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>HALTED: {portfolio.haltReason}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!isRunning
            ? <Btn onClick={handleStart} disabled={portfolio.halted}>▶ START</Btn>
            : <Btn onClick={handleStop} variant="red">■ STOP</Btn>
          }
          <Btn onClick={handleReset} variant="outline">↺ RESET</Btn>
        </div>
      </div>

      {/* Equity bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "EQUITY", value: `$${equity.toFixed(0)}`, sub: `${totalPnL >= 0 ? "+" : ""}${totalPnLPct.toFixed(2)}%`, color: totalPnL >= 0 ? C.eucalyptus : C.negative },
          { label: "CASH", value: `$${portfolio.cash.toFixed(0)}`, sub: "available", color: C.navy },
          { label: "OPEN POS.", value: portfolio.positions.length, sub: `${portfolioHeat}% heat`, color: C.wheat },
          { label: "CLOSED", value: portfolio.closedTrades.length, sub: stats ? `${(stats.winRate * 100).toFixed(0)}% win rate` : "no trades", color: C.charcoal },
        ].map((m, i) => (
          <Card key={i} style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark, marginBottom: 4, letterSpacing: "0.1em" }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: "'Lora',serif" }}>{m.value}</div>
            <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `2px solid ${C.lightGrey}`, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: "none", border: "none", borderBottom: activeTab === t.id ? `2px solid ${C.eucalyptus}` : "2px solid transparent", padding: "8px 16px", cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: activeTab === t.id ? C.eucalyptus : C.wheatDark, letterSpacing: "0.08em", marginBottom: -2 }}>{t.label}</button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
          <div>
            {/* P&L Curve */}
            <Card style={{ padding: "16px 20px", marginBottom: 16 }}>
              <SectionHead label="EQUITY CURVE" sub={`${portfolio.pnlHistory.length} data points · started at $${initialCapital.toLocaleString()}`} />
              <PnLCurve history={portfolio.pnlHistory} />
            </Card>

            {/* Performance stats */}
            {stats && (
              <Card style={{ padding: "16px 20px", marginBottom: 16 }}>
                <SectionHead label="PERFORMANCE" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Sharpe", value: stats.sharpe.toFixed(2), good: stats.sharpe > 1 },
                    { label: "Sortino", value: stats.sortino.toFixed(2), good: stats.sortino > 1 },
                    { label: "Expectancy", value: `$${stats.expectancy.toFixed(0)}`, good: stats.expectancy > 0 },
                    { label: "Win Rate", value: `${(stats.winRate * 100).toFixed(0)}%`, good: stats.winRate >= 0.5 },
                    { label: "Last 10", value: stats.winRate10 != null ? `${(stats.winRate10 * 100).toFixed(0)}%` : "—", good: (stats.winRate10 || 0) >= 0.5 },
                    { label: "Last 20", value: stats.winRate20 != null ? `${(stats.winRate20 * 100).toFixed(0)}%` : "—", good: (stats.winRate20 || 0) >= 0.5 },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "10px", background: C.offwhite, borderRadius: 4 }}>
                      <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.good ? C.eucalyptus : C.negative, fontFamily: "'Lora',serif" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {stats.best && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ padding: "8px 12px", background: C.eucalyptusPale, borderRadius: 4, borderLeft: `3px solid ${C.eucalyptus}` }}>
                      <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.eucalyptus, marginBottom: 2 }}>BEST TRADE</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.eucalyptus }}>{stats.best.symbol} +${stats.best.pnl.toFixed(0)}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: C.negativePale, borderRadius: 4, borderLeft: `3px solid ${C.negative}` }}>
                      <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.negative, marginBottom: 2 }}>WORST TRADE</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.negative }}>{stats.worst.symbol} ${stats.worst.pnl.toFixed(0)}</div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Open positions */}
            <Card style={{ padding: "16px 20px" }}>
              <SectionHead label="OPEN POSITIONS" sub={`${portfolio.positions.length} active · ${portfolioHeat}% portfolio heat`} />
              {portfolio.positions.length === 0
                ? <div style={{ color: C.lightGrey, fontSize: 12, fontFamily: "'DM Mono',monospace", padding: "20px 0" }}>No open positions. {isRunning ? "Scanning for signals…" : "Start the engine to begin."}</div>
                : portfolio.positions.map((pos, i) => {
                  const pnlColor = (pos.unrealisedPnL || 0) >= 0 ? C.eucalyptus : C.negative;
                  return (
                    <div key={i} style={{ padding: "12px 0", borderBottom: i < portfolio.positions.length - 1 ? `1px solid ${C.offwhite}` : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 16 }}>{pos.emoji}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{pos.name}</div>
                            <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>{pos.symbol} · ×{pos.contracts} · {pos.direction}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: pnlColor }}>{(pos.unrealisedPnL || 0) >= 0 ? "+" : ""}${(pos.unrealisedPnL || 0).toFixed(0)}</div>
                          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: pnlColor }}>{(pos.pnlPct || 0) >= 0 ? "+" : ""}{(pos.pnlPct || 0).toFixed(2)}%</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                        {[
                          { label: "ENTRY", val: (pos.entryPrice || 0).toFixed(4) },
                          { label: "CURRENT", val: (pos.currentPrice || 0).toFixed(4) },
                          { label: "STOP", val: (pos.stopLoss || 0).toFixed(4) },
                          { label: "TARGET", val: (pos.takeProfit || 0).toFixed(4) },
                        ].map((f, j) => (
                          <div key={j} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.charcoal }}>
                            <div style={{ color: C.wheatDark, marginBottom: 1 }}>{f.label}</div>
                            {f.val}
                          </div>
                        ))}
                      </div>
                      {pos.movedToBreakeven && <div style={{ marginTop: 4, fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.eucalyptus }}>★ Stop moved to breakeven</div>}
                      {pos.partialDone && <div style={{ marginTop: 2, fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheat }}>½ Partial exit taken at 2×ATR</div>}
                    </div>
                  );
                })
              }
            </Card>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0, maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}>
            {/* Fund size */}
            <Card style={{ padding: "14px 16px" }}>
              <SectionHead label="FUND SIZE" />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={pendingFund} onChange={e => setPendingFund(e.target.value)} placeholder={`$${fundSize.toLocaleString()}`} style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.lightGrey}`, borderRadius: 3, fontFamily: "'DM Mono',monospace", fontSize: 12 }} />
                <Btn onClick={() => { const v = parseInt(pendingFund); if (v >= 1000) { setFundSize(v); setPendingFund(""); handleReset(); } }} variant="navy" style={{ padding: "6px 12px" }}>SET</Btn>
              </div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>Min $1,000 · resets portfolio</div>
            </Card>

            {/* Risk gauges */}
            <Card style={{ padding: "14px 16px" }}>
              <SectionHead label="RISK MONITOR" />
              {[
                { label: "Portfolio Heat", val: parseFloat(portfolioHeat), max: 25, unit: "%" },
                { label: "Daily Loss", val: Math.abs(portfolio.dailyLoss || 0) / initialCapital * 100, max: 4, unit: "%" },
                { label: "Weekly Loss", val: Math.abs(portfolio.weeklyLoss || 0) / initialCapital * 100, max: 8, unit: "%" },
              ].map((g, i) => {
                const pct = Math.min(100, (g.val / g.max) * 100);
                const barColor = pct > 75 ? C.negative : pct > 50 ? C.warning : C.eucalyptus;
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.charcoal }}>{g.label}</span>
                      <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: barColor }}>{g.val.toFixed(1)}{g.unit} / {g.max}{g.unit}</span>
                    </div>
                    <div style={{ height: 6, background: C.lightGrey, borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Activity log */}
            <Card style={{ padding: "14px 16px", flex: 1 }}>
              <SectionHead label="ACTIVITY LOG" />
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                {log.length === 0 && <span style={{ color: C.lightGrey }}>No activity yet</span>}
                {log.map((l, i) => {
                  const color = l.type === "trade_win" ? C.eucalyptus : l.type === "trade_loss" ? C.negative : l.type === "trade_open" ? C.navy : l.type === "halt" ? C.warning : C.wheatDark;
                  return <div key={i} style={{ color, lineHeight: 1.5 }}><span style={{ color: C.lightGrey }}>[{l.time}] </span>{l.msg}</div>;
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── SCANNER TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "scanner" && (
        <div>
          <SectionHead label="SIGNAL SCANNER" sub="Weighted scoring across 6 variables · Regime detection · Entry filter summary" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {INSTRUMENTS.map(inst => {
              const sigData = SIGNAL_DATA[inst.symbol];
              const vars = sigData?.vars || {};
              const prevScore = prevScores[inst.symbol] ?? null;
              const score = computeWeightedScore(vars, prevScore);
              const priceData = prices[inst.symbol];
              const filters = checkEntryFilters(inst, vars, prevScore, portfolio, priceData);
              const regime = detectRegime(priceData?.history || []);
              const isScanning = scanningSymbol === inst.symbol;
              const hasPosition = portfolio.positions.some(p => p.symbol === inst.symbol);
              const dir = score > 60 ? "BULLISH" : score < 40 ? "BEARISH" : "NEUTRAL";
              const dirColor = dir === "BULLISH" ? C.eucalyptus : dir === "BEARISH" ? C.negative : C.warning;
              const borderColor = hasPosition ? C.wheat : filters.passed ? C.eucalyptus : C.lightGrey;

              return (
                <Card key={inst.symbol} style={{ padding: "14px 16px", borderLeft: `3px solid ${borderColor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 18 }}>{inst.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{inst.name} <span style={{ fontSize: 10, color: C.wheatDark, fontFamily: "'DM Mono',monospace" }}>({inst.symbol})</span></div>
                        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>{inst.sector}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: dirColor, fontFamily: "'DM Mono',monospace" }}>{Math.round(score)}</span>
                      <RegimeBadge regime={regime} />
                    </div>
                  </div>

                  {/* Mini score bars */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", marginBottom: 8 }}>
                    {Object.keys(WEIGHTS).map(k => {
                      const s = vars[k] ?? 50;
                      const c = s > 60 ? C.eucalyptus : s < 40 ? C.negative : C.warning;
                      return (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark, width: 52, flexShrink: 0 }}>{VAR_LABELS[k]}</span>
                          <div style={{ flex: 1, height: 4, background: C.lightGrey, borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${s}%`, background: c, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: c, width: 20, textAlign: "right" }}>{Math.round(s)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: dirColor, background: dir === "BULLISH" ? C.eucalyptusPale : dir === "BEARISH" ? C.negativePale : C.warningPale, padding: "2px 7px", borderRadius: 3 }}>{dir}</span>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>C:{filters.confluenceCount}/6</span>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>${(priceData?.current || inst.price).toFixed(3)}</span>
                    {hasPosition && <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheat, fontWeight: 700 }}>IN POSITION</span>}
                    {filters.passed && !hasPosition && <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.eucalyptus, fontWeight: 700 }}>★ SIGNAL</span>}
                    {isScanning && <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.navy, animation: "pulse 1s infinite" }}>SCANNING…</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── REASONING TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "reasoning" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          <div>
            <SectionHead label="SIGNAL REASONING" sub="Full variable breakdown · Entry filter results · Kelly sizing · Attribution" />

            {/* Instrument picker */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {INSTRUMENTS.map(i => (
                <button key={i.symbol} onClick={() => setSelectedInst(i.symbol)}
                  style={{ background: selectedInst === i.symbol ? C.navy : C.offwhite, color: selectedInst === i.symbol ? C.white : C.charcoal, border: `1px solid ${selectedInst === i.symbol ? C.navy : C.lightGrey}`, borderRadius: 3, padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700 }}>
                  {i.emoji} {i.symbol}
                </button>
              ))}
            </div>

            {(() => {
              const inst = INSTRUMENTS.find(i => i.symbol === selectedInst);
              if (!inst) return null;
              const sigData = SIGNAL_DATA[inst.symbol];
              const vars = sigData?.vars || {};
              const prevScore = prevScores[inst.symbol] ?? null;
              const priceData = prices[inst.symbol];
              const filters = checkEntryFilters(inst, vars, prevScore, portfolio, priceData);
              const { score, atr, dma10, regime, confluenceCount, direction } = filters;
              const riskPerContract = (atr * 2 / inst.tickSize) * inst.tickValue;
              const kellyContracts = computeKelly(portfolio.closedTrades, portfolio.initialCapital, riskPerContract);
              const currentPrice = priceData?.current || inst.price;

              return (
                <div>
                  {/* Score header */}
                  <Card style={{ padding: "16px 20px", marginBottom: 16, borderLeft: `4px solid ${score > 60 ? C.eucalyptus : score < 40 ? C.negative : C.warning}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{inst.emoji} {inst.name}</div>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>{currentPrice.toFixed(4)} {inst.unit} · {inst.sector}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: score > 60 ? C.eucalyptus : score < 40 ? C.negative : C.warning, fontFamily: "'Lora',serif", lineHeight: 1 }}>{Math.round(score)}</div>
                        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>WEIGHTED SCORE</div>
                        <div style={{ marginTop: 4 }}><RegimeBadge regime={regime} /></div>
                      </div>
                    </div>

                    {/* Variable bars */}
                    {Object.entries(WEIGHTS).map(([k, w]) => (
                      <ScoreBar key={k} label={VAR_LABELS[k]} score={vars[k] ?? 50} weight={w} />
                    ))}

                    <div style={{ marginTop: 8, padding: "8px 12px", background: C.offwhite, borderRadius: 3 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: C.navy }}>
                        CONFLUENCE: {confluenceCount}/6 variables aligned · Direction: {direction} · Score threshold: {filters.scoreThreshold}
                      </span>
                    </div>
                  </Card>

                  {/* Entry filters */}
                  <Card style={{ padding: "16px 20px", marginBottom: 16 }}>
                    <SectionHead label="ENTRY FILTER RESULTS" />
                    <FilterRow label={`Score threshold (≥${filters.scoreThreshold})`} passed={filters.scoreOk} detail={`score=${Math.round(score)}`} />
                    <FilterRow label="10-DMA alignment" passed={filters.dmaOk} detail={`price=${currentPrice.toFixed(3)} dma=${dma10.toFixed(3)}`} />
                    <FilterRow label="Volatility regime (not LOW_VOL)" passed={filters.atrOk} detail={regime} />
                    <FilterRow label="Confluence (≥4/6 aligned)" passed={filters.confluenceOk} detail={`${confluenceCount}/6`} />
                    <FilterRow label="Portfolio heat (<25%)" passed={filters.heatOk} detail={`${(filters.portfolioHeat * 100).toFixed(1)}%`} />
                    <FilterRow label="Sector concentration (<35%)" passed={filters.sectorOk} detail={`${(filters.sectorHeat * 100).toFixed(1)}%`} />
                    <FilterRow label="Margin cap (<8% equity)" passed={filters.marginCapOk} detail={`$${inst.margin}`} />
                    <FilterRow label="Risk circuit breakers clear" passed={filters.riskOk} detail={filters.reasons.consecLosses ? "4 consec losses" : filters.reasons.drawdownOk ? "" : "drawdown>15%"} />
                    <div style={{ marginTop: 12, padding: "10px 12px", background: filters.passed ? C.eucalyptusPale : C.negativePale, borderRadius: 3 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: filters.passed ? C.eucalyptus : C.negative }}>
                        {filters.passed ? `✓ SIGNAL PASSES ALL FILTERS — ${direction} ${kellyContracts} contract(s)` : "✗ SIGNAL BLOCKED — entry filters not met"}
                      </span>
                    </div>
                  </Card>

                  {/* Kelly + ATR calc */}
                  <Card style={{ padding: "16px 20px", marginBottom: 16 }}>
                    <SectionHead label="POSITION SIZING" sub="Half-Kelly · ATR-based stops" />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        { label: "ATR (14)", val: atr.toFixed(4), unit: inst.unit },
                        { label: "2×ATR Stop", val: (atr * 2).toFixed(4), unit: inst.unit },
                        { label: "4×ATR Target", val: (atr * 4).toFixed(4), unit: inst.unit },
                        { label: "Risk/Contract", val: `$${riskPerContract.toFixed(0)}`, unit: "" },
                        { label: "Kelly Contracts", val: kellyContracts, unit: "" },
                        { label: "Margin Required", val: `$${(inst.margin * kellyContracts).toFixed(0)}`, unit: "" },
                      ].map((f, i) => (
                        <div key={i} style={{ padding: "10px", background: C.offwhite, borderRadius: 3, textAlign: "center" }}>
                          <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark, marginBottom: 4 }}>{f.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Lora',serif", color: C.navy }}>{f.val} <span style={{ fontSize: 10 }}>{f.unit}</span></div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              );
            })()}
          </div>

          {/* Attribution sidebar */}
          <div style={{ position: "sticky", top: 0 }}>
            <Card style={{ padding: "16px 20px" }}>
              <SectionHead label="SIGNAL ACCURACY" sub="Per-variable attribution from closed trades" />
              {Object.keys(WEIGHTS).map(k => {
                const attr = attribution[k] || { correct: 0, total: 0 };
                const acc = attr.total > 0 ? (attr.correct / attr.total * 100) : null;
                const barColor = acc == null ? C.lightGrey : acc >= 60 ? C.eucalyptus : acc >= 45 ? C.warning : C.negative;
                return (
                  <div key={k} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.charcoal, fontWeight: 600 }}>{VAR_LABELS[k]}</span>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: barColor }}>
                        {acc != null ? `${acc.toFixed(0)}%` : "—"} <span style={{ fontSize: 9, fontWeight: 400, color: C.wheatDark }}>({attr.correct}/{attr.total})</span>
                      </span>
                    </div>
                    <div style={{ height: 5, background: C.lightGrey, borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${acc ?? 0}%`, background: barColor, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 8, padding: "8px 10px", background: C.offwhite, borderRadius: 3, fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>
                Accuracy updates as trades close. Variables with {"<"}45% accuracy may warrant weight review.
              </div>
            </Card>

            {/* Closed trades */}
            {portfolio.closedTrades.length > 0 && (
              <Card style={{ padding: "14px 16px", marginTop: 16 }}>
                <SectionHead label="RECENT CLOSES" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {portfolio.closedTrades.slice(-8).reverse().map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.offwhite}` }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{t.symbol} <span style={{ fontSize: 9, color: C.wheatDark, fontFamily: "'DM Mono',monospace" }}>{t.direction}</span></div>
                        <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark }}>{t.closeReason}</div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: t.pnl >= 0 ? C.eucalyptus : C.negative }}>
                        {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── IBKR INTEGRATION TAB ────────────────────────────────────────────────── */}
      {activeTab === "ibkr" && (
        <div style={{ maxWidth: 640 }}>
          <SectionHead label="IBKR INTEGRATION" sub="Interactive Brokers TWS / IB Gateway connection" />

          <Card style={{ padding: "20px 24px", marginBottom: 16, borderLeft: `4px solid ${C.warning}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.warning, marginBottom: 8 }}>⚠ PAPER TRADING SIMULATION ONLY</div>
            <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.7 }}>
              All trades in Muster Auto Trader are simulated with paper money. No real orders are placed. Connection to Interactive Brokers is shown here for planning purposes. Live trading requires explicit activation and carries substantial risk of financial loss.
            </div>
          </Card>

          {/* Connection status */}
          <Card style={{ padding: "20px 24px", marginBottom: 16 }}>
            <SectionHead label="CONNECTION STATUS" />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.lightGrey }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: C.wheatDark }}>DISCONNECTED</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Mode", val: ibkrMode === "paper" ? "Paper Trading (7497)" : "Live Trading (7496)" },
                { label: "Host", val: "127.0.0.1" },
                { label: "Client ID", val: "1" },
                { label: "TWS Version", val: "—" },
              ].map((f, i) => (
                <div key={i} style={{ padding: "10px 12px", background: C.offwhite, borderRadius: 3 }}>
                  <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: C.wheatDark, marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.charcoal, fontWeight: 600 }}>{f.val}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Mode selector */}
          <Card style={{ padding: "20px 24px", marginBottom: 16 }}>
            <SectionHead label="TRADING MODE" />
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setIbkrMode("paper")}
                style={{ flex: 1, padding: "12px", background: ibkrMode === "paper" ? C.navyPale : C.offwhite, border: `2px solid ${ibkrMode === "paper" ? C.navy : C.lightGrey}`, borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: ibkrMode === "paper" ? C.navy : C.charcoal }}>
                PAPER TRADING<br /><span style={{ fontSize: 9, fontWeight: 400 }}>Port 7497 · Safe</span>
              </button>
              <button onClick={() => setIbkrShowConfirm(true)}
                style={{ flex: 1, padding: "12px", background: ibkrMode === "live" ? C.negativePale : C.offwhite, border: `2px solid ${ibkrMode === "live" ? C.negative : C.lightGrey}`, borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: ibkrMode === "live" ? C.negative : C.charcoal }}>
                LIVE TRADING<br /><span style={{ fontSize: 9, fontWeight: 400 }}>Port 7496 · Real money</span>
              </button>
            </div>

            {/* Live confirmation modal */}
            {ibkrShowConfirm && (
              <div style={{ padding: "16px", background: C.negativePale, border: `1px solid ${C.negative}`, borderRadius: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.negative, marginBottom: 8 }}>⚠ ENABLE LIVE TRADING?</div>
                <div style={{ fontSize: 12, color: C.charcoal, marginBottom: 12, lineHeight: 1.6 }}>
                  This will connect to your Interactive Brokers live account and place real orders with real money. Losses can exceed your initial investment. This system has not been audited by a financial regulator.
                  <br /><br />Type <strong>I UNDERSTAND THE RISKS</strong> to confirm.
                </div>
                <input value={ibkrConfirmText} onChange={e => setIbkrConfirmText(e.target.value)}
                  placeholder="Type confirmation here…"
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.negative}`, borderRadius: 3, fontFamily: "'DM Mono',monospace", fontSize: 12, marginBottom: 10, boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => { if (ibkrConfirmText === "I UNDERSTAND THE RISKS") { setIbkrMode("live"); setIbkrShowConfirm(false); setIbkrConfirmText(""); } }} variant="red" disabled={ibkrConfirmText !== "I UNDERSTAND THE RISKS"}>CONFIRM LIVE MODE</Btn>
                  <Btn onClick={() => { setIbkrShowConfirm(false); setIbkrConfirmText(""); }} variant="outline">CANCEL</Btn>
                </div>
              </div>
            )}
          </Card>

          {/* Setup instructions */}
          <Card style={{ padding: "20px 24px" }}>
            <SectionHead label="SETUP GUIDE" />
            {[
              "1. Install Interactive Brokers TWS or IB Gateway",
              "2. In TWS: Configure → API → Settings → Enable ActiveX and Socket Clients",
              "3. Set Socket port to 7497 (paper) or 7496 (live)",
              "4. Allow localhost connections (127.0.0.1)",
              "5. Start Muster with IBKR environment variables configured",
              "6. Paper test thoroughly before enabling live mode",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < 5 ? `1px solid ${C.offwhite}` : "none" }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.wheatDark, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
