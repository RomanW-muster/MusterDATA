// ─────────────────────────────────────────────────────────────────────────────
// MUSTER — AUSTRALIAN DOMESTIC AG TAB
// Drop this file into your Muster project as AustraliaTab.jsx
// Import and add to the main nav in Muster.jsx:
//   import AustraliaTab from "./AustraliaTab";
//   Add { id:"australia", label:"AUSTRALIA", emoji:"🦘" } to TABS array
//   Add {tab==="australia" && <AustraliaTab/>} to content section
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR SYSTEM (mirrors main app)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  eucalyptus:"#2F4F3E", eggshell:"#F4F1EA", navy:"#1E2F3F", wheat:"#C8A96A",
  charcoal:"#2A2A2A", lightGrey:"#D9D9D9",
  eucalyptusLight:"#3d6b52", eucalyptusPale:"#e8f4ee",
  navyLight:"#2a4a63", navyPale:"#e8eef4",
  wheatDark:"#9a7d45", wheatPale:"#fdf6e8",
  negative:"#8B1A1A", negativePale:"#faeaea",
  warning:"#c8860a", warningPale:"#fef6e4",
  white:"#ffffff", offwhite:"#fafaf8",
  // AU accent — warm ochre/terracotta
  auGold:"#C8860A", auGoldPale:"#fef6e4",
};

// ─────────────────────────────────────────────────────────────────────────────
// API HOOKS — free sources, drop keys when ready
// ─────────────────────────────────────────────────────────────────────────────
const AU_API = {
  // FREE — no key needed, just wire the fetch
  mla:     "https://www.mla.com.au/prices-markets/market-reports-prices/",         // MLA indicators
  awex:    "https://www.awex.com.au/market-information/",                           // Wool EMI
  abares:  "https://www.agriculture.gov.au/abares/research-topics/agricultural-outlook", // Crop forecasts
  grdc:    "https://grdc.com.au/resources-and-publications/grdc-update-papers",     // Grain research
  // PAID — add key when ready
  mecardo: null,  // mecardo.com — AU grain delivered prices by region (~$200/mo)
  // FREE NEWS SCRAPE TARGETS
  grainCentral: "https://www.graincentral.com/",
  weeklyTimes:  "https://www.weeklytimesnow.com.au/agribusiness",
  stockJournal: "https://www.stockjournal.com.au/",
};

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATED AU MARKET DATA
// (replaced by live API calls when keys/hooks are wired)
// ─────────────────────────────────────────────────────────────────────────────

// GRAINS — Delivered port prices (AUD/tonne)
const AU_GRAIN_PRICES = [
  {
    commodity:"APW Wheat", code:"APW1", emoji:"🌾", color:C.navy,
    ports:{
      "Kwinana (WA)":  { price:348.50, change:4.50,  pct:1.31  },
      "Port Adelaide":  { price:362.00, change:-2.00, pct:-0.55 },
      "Melbourne":      { price:368.00, change:1.50,  pct:0.41  },
      "Newcastle":      { price:371.00, change:3.00,  pct:0.81  },
      "Geelong":        { price:365.00, change:2.00,  pct:0.55  },
    },
    grade:"Australian Premium White",
    protein:"10.5% min",
    source:"GIWA / GRDC",
    sourceUrl:"https://www.giwa.org.au/",
  },
  {
    commodity:"ASW Wheat", code:"ASW", emoji:"🌾", color:C.navyLight,
    ports:{
      "Kwinana (WA)":  { price:325.00, change:3.00,  pct:0.93  },
      "Port Adelaide":  { price:338.00, change:-1.50, pct:-0.44 },
      "Melbourne":      { price:344.00, change:1.00,  pct:0.29  },
      "Newcastle":      { price:347.00, change:2.50,  pct:0.72  },
    },
    grade:"Australian Standard White",
    protein:"9.5% min",
    source:"GIWA / GRDC",
    sourceUrl:"https://www.giwa.org.au/",
  },
  {
    commodity:"Canola", code:"CAN", emoji:"🌻", color:C.wheat,
    ports:{
      "Kwinana (WA)":  { price:718.00, change:8.00,  pct:1.13  },
      "Port Adelaide":  { price:730.00, change:5.00,  pct:0.69  },
      "Melbourne":      { price:735.00, change:6.50,  pct:0.89  },
      "Geelong":        { price:732.00, change:5.50,  pct:0.76  },
    },
    grade:"Canola A (non-GM)",
    protein:"—",
    source:"Mecardo hook ready",
    sourceUrl:"https://mecardo.com.au/",
  },
  {
    commodity:"Feed Barley", code:"BAR", emoji:"🌿", color:C.eucalyptus,
    ports:{
      "Kwinana (WA)":  { price:285.00, change:-2.00, pct:-0.70 },
      "Port Adelaide":  { price:296.00, change:-1.00, pct:-0.34 },
      "Melbourne":      { price:301.00, change:0.50,  pct:0.17  },
      "Newcastle":      { price:298.00, change:1.00,  pct:0.34  },
    },
    grade:"Feed grade",
    protein:"—",
    source:"GIWA / GRDC",
    sourceUrl:"https://www.giwa.org.au/",
  },
  {
    commodity:"Malt Barley", code:"MALT", emoji:"🌿", color:C.eucalyptusLight,
    ports:{
      "Kwinana (WA)":  { price:340.00, change:2.00,  pct:0.59  },
      "Port Adelaide":  { price:352.00, change:1.50,  pct:0.43  },
      "Melbourne":      { price:358.00, change:2.50,  pct:0.70  },
    },
    grade:"Malt grade",
    protein:"11.5-12.5%",
    source:"Mecardo hook ready",
    sourceUrl:"https://mecardo.com.au/",
  },
  {
    commodity:"Sorghum", code:"SOR", emoji:"🌾", color:C.auGold,
    ports:{
      "Brisbane":       { price:278.00, change:3.50,  pct:1.27  },
      "Newcastle":      { price:282.00, change:2.50,  pct:0.89  },
    },
    grade:"No.1 Sorghum",
    protein:"—",
    source:"Grain Central",
    sourceUrl:"https://www.graincentral.com/",
  },
];

// PULSES (AUD/tonne)
const AU_PULSE_PRICES = [
  { commodity:"Chickpeas",  code:"CHICK", emoji:"🫛", price:620.00, change:8.00,  pct:1.31,  region:"QLD/NSW",   source:"Grain Central", url:"https://www.graincentral.com/" },
  { commodity:"Lentils",    code:"LENT",  emoji:"🫘", price:545.00, change:-5.00, pct:-0.91, region:"SA/VIC",    source:"Grain Central", url:"https://www.graincentral.com/" },
  { commodity:"Lupins",     code:"LUP",   emoji:"🌱", price:285.00, change:2.00,  pct:0.71,  region:"WA",        source:"GIWA",          url:"https://www.giwa.org.au/"      },
  { commodity:"Faba Beans", code:"FAB",   emoji:"🫛", price:365.00, change:4.00,  pct:1.11,  region:"SA/VIC/NSW",source:"Grain Central", url:"https://www.graincentral.com/" },
  { commodity:"Field Peas", code:"FP",    emoji:"🟢", price:320.00, change:-2.00, pct:-0.62, region:"SA/WA",     source:"Grain Central", url:"https://www.graincentral.com/" },
];

// LIVESTOCK INDICATORS (AUD cents/kg CW or AUD/head)
const AU_LIVESTOCK = [
  {
    name:"EYCI",
    fullName:"Eastern Young Cattle Indicator",
    emoji:"🐄",
    value:748.50,
    change:12.50,
    pct:1.70,
    unit:"¢/kg CW",
    color:C.eucalyptus,
    description:"Benchmark for young cattle across eastern Australia. Key price signal for backgrounders and feedlots.",
    fiveYrAvg:680.00,
    source:"MLA",
    sourceUrl:"https://www.mla.com.au/prices-markets/market-reports-prices/cattle/",
    trend:"up",
  },
  {
    name:"ESTLI",
    fullName:"Eastern States Trade Lamb Indicator",
    emoji:"🐑",
    value:682.00,
    change:-8.00,
    pct:-1.16,
    unit:"¢/kg CW",
    color:C.navy,
    description:"Benchmark for trade lambs (18-22kg CW) across eastern Australia. Key signal for processors and supermarkets.",
    fiveYrAvg:720.00,
    source:"MLA",
    sourceUrl:"https://www.mla.com.au/prices-markets/market-reports-prices/lamb/",
    trend:"down",
  },
  {
    name:"NFLI",
    fullName:"National Feeder/Restocker Lamb Indicator",
    emoji:"🐑",
    value:598.00,
    change:4.00,
    pct:0.67,
    unit:"¢/kg LW",
    color:C.navyLight,
    description:"Indicator for feeder and restocker lambs — reflects producer confidence in the outlook.",
    fiveYrAvg:560.00,
    source:"MLA",
    sourceUrl:"https://www.mla.com.au/prices-markets/market-reports-prices/lamb/",
    trend:"up",
  },
  {
    name:"Mutton",
    fullName:"National Mutton Indicator",
    emoji:"🐑",
    value:348.00,
    change:-6.00,
    pct:-1.69,
    unit:"¢/kg CW",
    color:C.wheatDark,
    description:"National benchmark for mutton. Heavily influenced by Chinese demand and sheep flock size.",
    fiveYrAvg:395.00,
    source:"MLA",
    sourceUrl:"https://www.mla.com.au/prices-markets/market-reports-prices/sheep-and-lamb/",
    trend:"down",
  },
  {
    name:"Heavy Steer",
    fullName:"Heavy Steer Indicator",
    emoji:"🐄",
    value:382.00,
    change:5.50,
    pct:1.46,
    unit:"¢/kg CW",
    color:C.eucalyptusLight,
    description:"Heavy finished cattle. Key signal for feedlot closeouts and direct-kill cattle.",
    fiveYrAvg:340.00,
    source:"MLA",
    sourceUrl:"https://www.mla.com.au/prices-markets/market-reports-prices/cattle/",
    trend:"up",
  },
  {
    name:"Cow",
    fullName:"Cow Indicator",
    emoji:"🐄",
    value:298.00,
    change:2.00,
    pct:0.67,
    unit:"¢/kg CW",
    color:C.wheat,
    description:"Manufacturing cow indicator. Reflects processor demand for grinding beef and export cow meat.",
    fiveYrAvg:245.00,
    source:"MLA",
    sourceUrl:"https://www.mla.com.au/prices-markets/market-reports-prices/cattle/",
    trend:"up",
  },
];

// WOOL (AUD cents/kg clean)
const AU_WOOL = {
  emi:{
    value:1168,
    change:18,
    pct:1.56,
    unit:"¢/kg clean",
    description:"Eastern Market Indicator — benchmark for Australian Merino wool. Set at weekly AWEX auction.",
    source:"AWEX",
    sourceUrl:"https://www.awex.com.au/market-information/",
    lastAuction:"Wed Apr 1, 2026",
    offeredBales:32480,
    passedIn:18.4,
  },
  micronPrices:[
    { micron:"16.5µ", price:2180, change:24,  note:"Ultra-fine — premium fashion" },
    { micron:"18.0µ", price:1820, change:18,  note:"Fine — luxury knitwear"       },
    { micron:"19.5µ", price:1480, change:12,  note:"Fine medium — mainstream"     },
    { micron:"21.0µ", price:1240, change:8,   note:"Medium — machine washable"    },
    { micron:"22.5µ", price:1080, change:6,   note:"Broad medium — outdoor"       },
    { micron:"24.0µ", price:920,  change:4,   note:"Broad — carpet/industrial"    },
    { micron:"28.0µ", price:720,  change:-2,  note:"Crossbred — blends"           },
    { micron:"30.0µ", price:580,  change:-4,  note:"Merino crossbred"             },
  ],
};

// COTTON
const AU_COTTON = {
  price:520.00,
  change:6.00,
  pct:1.17,
  unit:"AUD/bale",
  region:"QLD/NSW",
  source:"Cotton Australia",
  sourceUrl:"https://cottonaustralia.com.au/",
  note:"A1 Hi 3-6/32. Ginned bale ~227kg.",
};

// AU NEWS
const AU_NEWS = [
  { id:1,  time:"1h ago",  headline:"WA wheat harvest forecast revised down 8% on late-season dry finish across northern wheatbelt", tag:"Crop",      bullish:true,  source:"ABARES",          url:"https://www.agriculture.gov.au/abares/research-topics/agricultural-outlook", region:"WA"  },
  { id:2,  time:"2h ago",  headline:"EYCI surges to 748¢ as restocker demand intensifies following improved autumn rainfall outlook",  tag:"Livestock", bullish:true,  source:"MLA",             url:"https://www.mla.com.au/prices-markets/market-reports-prices/cattle/",         region:"QLD" },
  { id:3,  time:"3h ago",  headline:"Wool EMI lifts 18¢ at Sydney auction — strong Chinese buying underpins fine micron categories",   tag:"Wool",      bullish:true,  source:"AWEX",            url:"https://www.awex.com.au/market-information/",                                   region:"NSW" },
  { id:4,  time:"4h ago",  headline:"Canola prices firm on tight European supply — WA delivered port prices approaching $720/t",       tag:"Grains",    bullish:true,  source:"Grain Central",   url:"https://www.graincentral.com/",                                                 region:"WA"  },
  { id:5,  time:"5h ago",  headline:"ESTLI under pressure as lamb throughput increases at Ballarat and Bendigo saleyards",              tag:"Livestock", bullish:false, source:"MLA",             url:"https://www.mla.com.au/prices-markets/market-reports-prices/lamb/",             region:"VIC" },
  { id:6,  time:"6h ago",  headline:"ABARES quarterly crop report upgrades NSW winter crop estimate to 14.2 MMT on favourable subsoil moisture", tag:"ABARES", bullish:false, source:"ABARES",   url:"https://www.agriculture.gov.au/abares/research-topics/agricultural-outlook",    region:"NSW" },
  { id:7,  time:"8h ago",  headline:"China announces resumption of Australian barley imports — end of 5-year anti-dumping tariffs confirmed", tag:"Trade", bullish:true, source:"Grain Central", url:"https://www.graincentral.com/",                                                 region:"All" },
  { id:8,  time:"10h ago", headline:"QLD beef processors extend forward bookings on tight cattle supply — grid prices firm across board", tag:"Livestock",bullish:true,  source:"Weekly Times",    url:"https://www.weeklytimesnow.com.au/agribusiness",                                region:"QLD" },
  { id:9,  time:"12h ago", headline:"SA chickpea crop estimate revised up 12% following excellent growing season conditions",           tag:"Pulses",    bullish:false, source:"Grain Central",   url:"https://www.graincentral.com/",                                                 region:"SA"  },
  { id:10, time:"14h ago", headline:"Murray-Darling water allocations lifted to 98% — SA/VIC irrigated cropping conditions favourable",  tag:"Water",     bullish:true,  source:"MDBA",            url:"https://www.mdba.gov.au/",                                                      region:"SA"  },
];

// ABARES CROP FORECASTS (2025-26 season, MMT)
const ABARES_CROPS = [
  { crop:"Winter Wheat",    forecast:28.1,  prev:25.3, fiveYrAvg:26.4, unit:"MMT", trend:"up",   note:"Above average subsoil moisture heading into planting"      },
  { crop:"Winter Barley",   forecast:10.8,  prev:9.4,  fiveYrAvg:9.8,  unit:"MMT", trend:"up",   note:"Strong demand from China resumption supporting planted area" },
  { crop:"Canola",          forecast:5.8,   prev:5.1,  fiveYrAvg:4.9,  unit:"MMT", trend:"up",   note:"High prices incentivising growers to maximise area"          },
  { crop:"Sorghum",         forecast:2.1,   prev:2.4,  fiveYrAvg:2.2,  unit:"MMT", trend:"down", note:"QLD summer rainfall variable — La Niña watch adds uncertainty"},
  { crop:"Chickpeas",       forecast:1.05,  prev:0.88, fiveYrAvg:0.82, unit:"MMT", trend:"up",   note:"SA/VIC seasons excellent — QLD dry hampers north"            },
  { crop:"Cotton",          forecast:0.62,  prev:0.71, fiveYrAvg:0.58, unit:"MMT", trend:"down", note:"Water allocation uncertainty in NSW limiting planting"        },
];

// AU SEASONAL CALENDAR
const AU_SEASONAL = [
  { month:"Jan–Feb",  events:["Summer crop harvest (QLD sorghum, NSW cotton)","WA canola planting decisions","Wool auction season continues","Cattle drafting for autumn slaughter"] },
  { month:"Mar–Apr",  events:["Autumn break — critical for winter crop planting","WA dry sowing begins","Lamb throughput peaks (autumn mobs)","Water allocation announcements"] },
  { month:"May–Jun",  events:["Winter crop planting complete across SE Australia","WA crop establishment","Wool prices typically firm as clip finishes","Beef market: autumn store cattle"] },
  { month:"Jul–Aug",  events:["Crop condition assessment — ABARES winter crop report","Wool auctions peak volume","Lamb prices typically firm (winter supply tightens)","Cattle: feedlot placements"] },
  { month:"Sep–Oct",  events:["Spring crop development — critical rainfall window","WA harvest begins (early districts)","ABARES crop forecast updates","Store cattle prices firm"] },
  { month:"Nov–Dec",  events:["WA harvest peaks","Eastern states harvest begins","Wool clip commencement — new season prices","Summer heat stress risk for livestock","New season grain prices established"] },
];

// AU EXPORT DESTINATIONS (% of exports)
const AU_EXPORTS = {
  wheat: [
    {country:"Indonesia",   pct:18, note:"Largest customer — noodles & bread flour"},
    {country:"China",       pct:14, note:"Variable — policy driven"},
    {country:"Philippines", pct:12, note:"Stable — flour milling"},
    {country:"Vietnam",     pct:10, note:"Growing — feed and food"},
    {country:"Japan",       pct:8,  note:"Premium grades — noodle wheat"},
    {country:"Other",       pct:38, note:"SE Asia, Middle East, Africa"},
  ],
  beef: [
    {country:"Japan",       pct:28, note:"Premium chilled — Wagyu influence"},
    {country:"South Korea", pct:18, note:"Growing — all cuts"},
    {country:"USA",         pct:15, note:"Manufacturing beef — grinding"},
    {country:"China",       pct:14, note:"Variable — policy sensitive"},
    {country:"Other",       pct:25, note:"SE Asia, Middle East"},
  ],
  wool: [
    {country:"China",       pct:75, note:"Dominant buyer — top-making"},
    {country:"India",       pct:8,  note:"Growing — carpet/industrial"},
    {country:"Czech Rep.",  pct:4,  note:"Fine apparel processing"},
    {country:"Other",       pct:13, note:"Europe, Italy"},
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────
function Card({children,style={},...r}){ return <div style={{background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:4,...style}} {...r}>{children}</div>; }
function SectionHead({label,sub,action}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:3,height:16,background:C.auGold,borderRadius:2}}/>
        <div>
          <div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:"0.12em"}}>{label}</div>
          {sub&&<div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginTop:1}}>{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

function TrendPill({pct, size="sm"}){
  const up=pct>=0;
  return <span style={{fontSize:size==="lg"?12:10,padding:size==="lg"?"3px 10px":"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:700,color:up?C.eucalyptus:C.negative,background:up?C.eucalyptusPale:C.negativePale,border:`1px solid ${up?C.eucalyptus:C.negative}22`}}>{up?"+":""}{pct.toFixed(2)}%</span>;
}

function HookBadge({text}){
  return <div style={{padding:"6px 10px",background:C.offwhite,border:`1px dashed ${C.lightGrey}`,borderRadius:3,marginTop:8}}><span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>⚡ HOOK: {text}</span></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

// GRAIN PRICES
function AUGrainPrices(){
  const [activeGrain,setActiveGrain]=useState("APW1");
  const grain=AU_GRAIN_PRICES.find(g=>g.code===activeGrain)||AU_GRAIN_PRICES[0];
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="GRAIN PRICES — DELIVERED PORT (AUD/TONNE)" sub="Simulated · Mecardo API hook ready for live delivered prices"/>
      {/* Commodity selector */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {AU_GRAIN_PRICES.map(g=>(
          <button key={g.code} onClick={()=>setActiveGrain(g.code)} style={{background:activeGrain===g.code?g.color:C.white,color:activeGrain===g.code?C.white:C.charcoal,border:`1px solid ${activeGrain===g.code?g.color:C.lightGrey}`,borderRadius:3,padding:"6px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500,transition:"all 0.15s"}}>
            {g.emoji} {g.commodity}
          </button>
        ))}
      </div>
      {/* Port prices grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10,marginBottom:14}}>
        {Object.entries(grain.ports).map(([port,data])=>{
          const up=data.pct>=0;
          return (
            <Card key={port} style={{padding:14,borderTop:`3px solid ${grain.color}`}}>
              <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:6}}>{port}</div>
              <div style={{color:C.navy,fontSize:22,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:2}}>A${data.price.toFixed(2)}</div>
              <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:8}}>/tonne delivered</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:up?C.eucalyptus:C.negative,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{up?"+":""}{data.change.toFixed(2)}</span>
                <TrendPill pct={data.pct}/>
              </div>
            </Card>
          );
        })}
      </div>
      {/* Grain detail */}
      <Card style={{padding:14,background:C.offwhite,display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
        <div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>GRADE</div><div style={{color:C.charcoal,fontSize:12,fontWeight:600}}>{grain.grade}</div></div>
        <div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>PROTEIN SPEC</div><div style={{color:C.charcoal,fontSize:12,fontWeight:600}}>{grain.protein}</div></div>
        <div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>SOURCE</div><a href={grain.sourceUrl} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600,textDecoration:"none"}}>{grain.source} →</a></div>
        <div style={{marginLeft:"auto",padding:"6px 12px",background:C.auGoldPale,border:`1px solid ${C.auGold}`,borderRadius:3}}><span style={{color:C.auGold,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600}}>⚡ Mecardo API hook ready for live delivered prices by region</span></div>
      </Card>
    </div>
  );
}

// PULSES
function AUPulsePrices(){
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="PULSE PRICES (AUD/TONNE)" sub="Simulated · Grain Central / GRDC hook ready"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
        {AU_PULSE_PRICES.map(p=>{
          const up=p.pct>=0;
          return (
            <Card key={p.code} style={{padding:14,borderLeft:`3px solid ${up?C.eucalyptus:C.negative}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18}}>{p.emoji}</span><div><div style={{color:C.charcoal,fontSize:12,fontWeight:700}}>{p.commodity}</div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{p.region}</div></div></div>
                <TrendPill pct={p.pct}/>
              </div>
              <div style={{color:C.navy,fontSize:20,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:2}}>A${p.price.toFixed(0)}</div>
              <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:6}}>/tonne</div>
              <div style={{color:up?C.eucalyptus:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{up?"+":""}{p.change.toFixed(2)} t/day</div>
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",display:"block",marginTop:6,textDecoration:"none"}}>{p.source} →</a>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// LIVESTOCK INDICATORS
function AULivestockIndicators(){
  const [activeAnimal,setActiveAnimal]=useState("cattle");
  const cattle=AU_LIVESTOCK.filter(l=>l.emoji==="🐄");
  const sheep=AU_LIVESTOCK.filter(l=>l.emoji==="🐑");
  const displayed=activeAnimal==="cattle"?cattle:sheep;
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="LIVESTOCK INDICATORS" sub="MLA live data hook ready · Free via mla.com.au"/>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{id:"cattle",label:"🐄 Cattle"},{id:"sheep",label:"🐑 Sheep & Lamb"}].map(a=>(
          <button key={a.id} onClick={()=>setActiveAnimal(a.id)} style={{background:activeAnimal===a.id?C.eucalyptus:C.white,color:activeAnimal===a.id?C.white:C.charcoal,border:`1px solid ${activeAnimal===a.id?C.eucalyptus:C.lightGrey}`,borderRadius:3,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:500}}>{a.label}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:10}}>
        {displayed.map(l=>{
          const up=l.pct>=0; const vsAvg=((l.value-l.fiveYrAvg)/l.fiveYrAvg*100).toFixed(1);
          return (
            <Card key={l.name} style={{padding:16,borderTop:`3px solid ${l.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><div style={{color:C.charcoal,fontSize:14,fontWeight:700,marginBottom:2}}>{l.name}</div><div style={{color:C.wheatDark,fontSize:10}}>{l.fullName}</div></div>
                <TrendPill pct={l.pct} size="lg"/>
              </div>
              <div style={{color:C.navy,fontSize:28,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:2}}>{l.value.toFixed(0)}</div>
              <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:10}}>{l.unit}</div>
              <div style={{display:"flex",gap:12,marginBottom:10,paddingTop:10,borderTop:`1px solid ${C.lightGrey}`}}>
                <div><div style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>DAY CHANGE</div><div style={{color:up?C.eucalyptus:C.negative,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{up?"+":""}{l.change.toFixed(2)}</div></div>
                <div><div style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>5YR AVG</div><div style={{color:C.charcoal,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{l.fiveYrAvg.toFixed(0)}</div></div>
                <div><div style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>VS 5YR AVG</div><div style={{color:parseFloat(vsAvg)>=0?C.eucalyptus:C.negative,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{parseFloat(vsAvg)>=0?"+":""}{vsAvg}%</div></div>
              </div>
              <div style={{color:C.charcoal,fontSize:11,lineHeight:1.4,marginBottom:8}}>{l.description}</div>
              <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none"}}>Source: {l.source} →</a>
            </Card>
          );
        })}
      </div>
      <HookBadge text="MLA publishes all indicators free at mla.com.au — wire the fetch call to pull live daily updates with no API key required."/>
    </div>
  );
}

// WOOL
function AUWoolPanel(){
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="WOOL — AWEX AUCTION PRICES" sub="AWEX Eastern Market Indicator · Free via awex.com.au"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:14}}>
        {/* EMI Card */}
        <Card style={{padding:20,borderTop:`3px solid ${C.auGold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><div style={{color:C.charcoal,fontSize:15,fontWeight:700,marginBottom:2}}>EMI — Eastern Market Indicator</div><div style={{color:C.wheatDark,fontSize:11}}>AWEX weekly auction benchmark</div></div>
            <TrendPill pct={AU_WOOL.emi.pct} size="lg"/>
          </div>
          <div style={{color:C.navy,fontSize:32,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:2}}>{AU_WOOL.emi.value}</div>
          <div style={{color:C.wheatDark,fontSize:11,fontFamily:"'DM Mono',monospace",marginBottom:14}}>{AU_WOOL.emi.unit}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14,paddingTop:14,borderTop:`1px solid ${C.lightGrey}`}}>
            {[["LAST AUCTION",AU_WOOL.emi.lastAuction,C.charcoal],["BALES OFFERED",AU_WOOL.emi.offeredBales.toLocaleString(),C.navy],["PASSED IN",`${AU_WOOL.emi.passedIn}%`,AU_WOOL.emi.passedIn>25?C.negative:C.eucalyptus]].map(([l,v,c])=>(
              <div key={l}><div style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l}</div><div style={{color:c,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</div></div>
            ))}
          </div>
          <div style={{color:C.charcoal,fontSize:11,lineHeight:1.5,marginBottom:8}}>{AU_WOOL.emi.description}</div>
          <a href={AU_WOOL.emi.sourceUrl} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none"}}>Source: AWEX →</a>
        </Card>
        {/* Micron prices */}
        <Card style={{padding:20}}>
          <div style={{color:C.charcoal,fontSize:13,fontWeight:600,marginBottom:12}}>Micron Price Curve</div>
          {AU_WOOL.micronPrices.map(m=>{
            const up=m.change>=0;
            return (
              <div key={m.micron} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.lightGrey}`}}>
                <span style={{color:C.navy,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700,width:46,flexShrink:0}}>{m.micron}</span>
                <div style={{flex:1,height:4,background:C.lightGrey,borderRadius:2}}>
                  <div style={{height:"100%",width:`${(m.price/2200*100).toFixed(0)}%`,background:C.auGold,borderRadius:2}}/>
                </div>
                <span style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,width:50,textAlign:"right",flexShrink:0}}>{m.price}¢</span>
                <span style={{color:up?C.eucalyptus:C.negative,fontSize:10,fontFamily:"'DM Mono',monospace",width:36,textAlign:"right",flexShrink:0}}>{up?"+":""}{m.change}</span>
                <span style={{color:C.wheatDark,fontSize:9,width:120,flexShrink:0}}>{m.note}</span>
              </div>
            );
          })}
          <HookBadge text="AWEX publishes full auction results free each Wednesday — wire fetch to pull live micron schedule."/>
        </Card>
      </div>
    </div>
  );
}

// COTTON
function AUCottonPanel(){
  const up=AU_COTTON.pct>=0;
  return (
    <Card style={{padding:16,marginBottom:28,borderLeft:`3px solid ${C.auGold}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:24}}>🌿</span>
          <div>
            <div style={{color:C.charcoal,fontSize:13,fontWeight:700,marginBottom:2}}>Australian Cotton</div>
            <div style={{color:C.wheatDark,fontSize:11}}>{AU_COTTON.region} · {AU_COTTON.note}</div>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color:C.navy,fontSize:22,fontFamily:"'DM Mono',monospace",fontWeight:700}}>A${AU_COTTON.price.toFixed(0)}</div>
          <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{AU_COTTON.unit}</div>
          <TrendPill pct={AU_COTTON.pct}/>
        </div>
        <a href={AU_COTTON.sourceUrl} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none",marginLeft:20}}>Cotton Australia →</a>
      </div>
    </Card>
  );
}

// NEWS FEED
function AUNewsFeed(){
  const [regionFilter,setRegionFilter]=useState("All");
  const regions=["All","WA","SA","VIC","NSW","QLD"];
  const filtered=regionFilter==="All"?AU_NEWS:AU_NEWS.filter(n=>n.region===regionFilter||n.region==="All");
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="AUSTRALIAN AG NEWS" sub="Sources linked · Grain Central, MLA, ABARES, AWEX, Weekly Times"
        action={
          <div style={{display:"flex",gap:5}}>
            {regions.map(r=>(
              <button key={r} onClick={()=>setRegionFilter(r)} style={{background:regionFilter===r?C.charcoal:C.white,color:regionFilter===r?C.white:C.charcoal,border:`1px solid ${regionFilter===r?C.charcoal:C.lightGrey}`,borderRadius:2,padding:"3px 8px",cursor:"pointer",fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:500}}>{r}</button>
            ))}
          </div>
        }
      />
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {filtered.map(n=>(
          <Card key={n.id} style={{borderLeft:`4px solid ${n.bullish?C.eucalyptus:C.negative}`,padding:"10px 14px",transition:"box-shadow 0.15s",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:9,padding:"2px 6px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:n.bullish?C.eucalyptus:C.negative}}>{n.tag}</span>
                <span style={{fontSize:9,padding:"2px 6px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:500,color:C.navy,background:C.navyPale,border:`1px solid ${C.navy}22`}}>{n.region}</span>
                <span style={{color:C.lightGrey,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{n.time}</span>
              </div>
              <a href={n.url} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none",flexShrink:0}} onMouseEnter={e=>e.target.style.textDecoration="underline"} onMouseLeave={e=>e.target.style.textDecoration="none"}>{n.source} →</a>
            </div>
            <a href={n.url} target="_blank" rel="noopener noreferrer" style={{color:C.charcoal,fontSize:12,lineHeight:1.45,textDecoration:"none",display:"block",fontWeight:500}} onMouseEnter={e=>e.target.style.color=C.navy} onMouseLeave={e=>e.target.style.color=C.charcoal}>{n.headline}</a>
          </Card>
        ))}
        <HookBadge text="Wire Grain Central, Weekly Times, and MLA news feeds for live Australian Ag headlines. NewsAPI free tier covers most sources."/>
      </div>
    </div>
  );
}

// ABARES CROP FORECASTS
function AUCropForecasts(){
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="ABARES — CROP PRODUCTION FORECASTS" sub="2025–26 Australian winter crop season estimates"
        action={<a href="https://www.agriculture.gov.au/abares/research-topics/agricultural-outlook" target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none"}}>ABARES →</a>}
      />
      <Card style={{padding:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:6,marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.lightGrey}`}}>
          {["CROP","2025-26 FORECAST","PREV SEASON","5YR AVG","OUTLOOK"].map(h=>(
            <div key={h} style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em"}}>{h}</div>
          ))}
        </div>
        {ABARES_CROPS.map(r=>(
          <div key={r.crop} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",padding:"10px 0",borderBottom:`1px solid ${C.lightGrey}`,alignItems:"center"}}>
            <span style={{color:C.charcoal,fontSize:12,fontWeight:500}}>{r.crop}</span>
            <div>
              <span style={{color:C.navy,fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{r.forecast}</span>
              <span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}> {r.unit}</span>
            </div>
            <span style={{color:C.charcoal,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{r.prev}</span>
            <span style={{color:C.charcoal,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{r.fiveYrAvg}</span>
            <div>
              <span style={{color:r.trend==="up"?C.eucalyptus:C.negative,fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,marginRight:4}}>{r.trend==="up"?"▲ Above avg":"▼ Below avg"}</span>
              <div style={{color:C.wheatDark,fontSize:10,lineHeight:1.3,marginTop:2}}>{r.note}</div>
            </div>
          </div>
        ))}
        <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:8}}>
          Source: <a href="https://www.agriculture.gov.au/abares/research-topics/agricultural-outlook" target="_blank" rel="noopener noreferrer" style={{color:C.wheat}}>ABARES Agricultural Commodity Outlook →</a>
        </div>
      </Card>
    </div>
  );
}

// EXPORT DESTINATIONS
function AUExportDestinations(){
  const [activeCom,setActiveCom]=useState("wheat");
  const data=AU_EXPORTS[activeCom];
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="EXPORT MARKET DESTINATIONS" sub="Where Australian commodities go — key trading relationships"/>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {Object.keys(AU_EXPORTS).map(k=>(
          <button key={k} onClick={()=>setActiveCom(k)} style={{background:activeCom===k?C.navy:C.white,color:activeCom===k?C.white:C.charcoal,border:`1px solid ${activeCom===k?C.navy:C.lightGrey}`,borderRadius:3,padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace",textTransform:"capitalize"}}>{k}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Card style={{padding:16}}>
          {data.map((d,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{color:C.charcoal,fontSize:12,fontWeight:500}}>{d.country}</span>
                <span style={{color:C.navy,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{d.pct}%</span>
              </div>
              <div style={{height:5,background:C.lightGrey,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${d.pct}%`,background:i===0?C.auGold:i===1?C.navy:i===2?C.eucalyptus:C.navyLight,borderRadius:3}}/>
              </div>
              <div style={{color:C.wheatDark,fontSize:10,marginTop:2}}>{d.note}</div>
            </div>
          ))}
        </Card>
        <Card style={{padding:16,background:C.offwhite}}>
          <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:10}}>Why this matters for prices</div>
          {activeCom==="wheat"&&<div style={{color:C.charcoal,fontSize:12,lineHeight:1.65}}>Australia is the world's 4th largest wheat exporter. SE Asian buyers (Indonesia, Philippines, Vietnam) are price-sensitive and will switch to Black Sea or Canadian wheat if Australian prices are uncompetitive. The AUD/USD exchange rate directly affects this competitiveness — a weaker AUD makes Australian wheat cheaper for buyers settling in USD.</div>}
          {activeCom==="beef"&&<div style={{color:C.charcoal,fontSize:12,lineHeight:1.65}}>Japan and Korea pay premium prices for chilled Australian beef. These markets are relatively stable compared to China, which is the most volatile customer — prone to sudden policy changes affecting access. The US takes manufacturing beef for grinding, which is less price-sensitive but highly volume-driven.</div>}
          {activeCom==="wool"&&<div style={{color:C.charcoal,fontSize:12,lineHeight:1.65}}>China buys ~75% of Australian wool clip — making the Australian wool market almost entirely dependent on Chinese processing demand and consumer sentiment. When Chinese mills are running at full capacity and forward-buying, the EMI rises sharply. Any slowdown in Chinese apparel exports flows directly to softer wool prices within 6-8 weeks.</div>}
        </Card>
      </div>
    </div>
  );
}

// SEASONAL CALENDAR
function AUSeasonalCalendar(){
  const now=new Date(); const month=now.getMonth();
  const currentPeriod=month<=1?0:month<=3?1:month<=5?2:month<=7?3:month<=9?4:5;
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="AUSTRALIAN AG SEASONAL CALENDAR" sub="Key events and price drivers by time of year"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {AU_SEASONAL.map((s,i)=>(
          <Card key={i} style={{padding:14,border:`1px solid ${i===currentPeriod?C.auGold:C.lightGrey}`,borderTop:`3px solid ${i===currentPeriod?C.auGold:C.lightGrey}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{color:C.charcoal,fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{s.month}</div>
              {i===currentPeriod&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:700,color:C.auGold,background:C.auGoldPale,border:`1px solid ${C.auGold}`}}>NOW</span>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {s.events.map((ev,j)=>(
                <div key={j} style={{display:"flex",alignItems:"flex-start",gap:6}}>
                  <div style={{width:4,height:4,borderRadius:"50%",background:C.auGold,flexShrink:0,marginTop:5}}/>
                  <span style={{color:C.charcoal,fontSize:11,lineHeight:1.4}}>{ev}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// AU AI ANALYST
function AUAnalyst(){
  const [messages,setMessages]=useState([{role:"assistant",text:"G'day. I'm your Australian Ag market analyst. Ask me anything about domestic grain prices, livestock markets, wool, seasonal conditions, export dynamics, or how Australian markets relate to global commodity prices."}]);
  const [input,setInput]=useState(""); const [loading,setLoading]=useState(false); const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const sys=`You are an expert in Australian agricultural commodity markets. Deep expertise in: AU wheat, barley, canola, sorghum, chickpeas, lentils prices and export logistics; Australian beef and sheep/lamb markets (EYCI, ESTLI, MLA indicators); wool (EMI, micron pricing, AWEX auctions, China demand); ABARES crop reports; port basis relationships; AU seasonal patterns; AUD/USD effects on AU export competitiveness; domestic vs export price relationships; key trading companies (GrainCorp, Viterra, CBH, Elders, Nutrien Ag Solutions); relevant policy (Australian Grains Commission, MLA levies, EPIQ traceability).\n\nCurrent AU data snapshot: APW wheat Kwinana A$348.50/t, Canola Kwinana A$718/t, EYCI 748.50¢/kg CW, ESTLI 682¢/kg CW, Wool EMI 1168¢/kg clean. AUD/USD 0.6234 (weak — supportive of export competitiveness). ABARES 2025-26 winter crop forecast above average. China barley tariffs removed.\n\nUser is new to commodity trading, based in Australia. Be educational, direct, plain English. Explain the AU market mechanics and how they connect to global prices. 3-4 paragraphs max.`;
  const suggestions=["How does the AUD/USD affect WA wheat prices?","What drives the EYCI — how do I read it?","Explain the wool EMI and how it's set","Why did China's barley tariff removal matter so much?","How do AU wheat prices relate to Chicago wheat futures?","What's the difference between delivered port and farm gate prices?"];
  async function send(){
    if(!input.trim()||loading)return; const msg=input.trim(); setInput(""); setMessages(p=>[...p,{role:"user",text:msg}]); setLoading(true);
    try{const hist=messages.slice(1).map(m=>({role:m.role,content:m.text}));const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:sys,messages:[...hist,{role:"user",content:msg}]})});const data=await res.json();setMessages(p=>[...p,{role:"assistant",text:data.content?.map(b=>b.text||"").join("")||"Couldn't get a response."}]);}catch{setMessages(p=>[...p,{role:"assistant",text:"Connection error."}]);}
    setLoading(false);
  }
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="AU AG ANALYST" sub="Ask about Australian markets — grain, livestock, wool, exports, seasonals"/>
      <Card style={{height:420,display:"flex",flexDirection:"column"}}>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"88%",background:m.role==="user"?C.navy:C.white,border:`1px solid ${m.role==="user"?C.navy:C.lightGrey}`,borderRadius:4,padding:"10px 14px",color:m.role==="user"?C.eggshell:C.charcoal,fontSize:13,lineHeight:1.65}}>
                {m.role==="assistant"&&<div style={{color:C.auGold,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:5,fontWeight:700,letterSpacing:"0.12em"}}>🦘 AU AG ANALYST</div>}
                {m.text}
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex"}}><div style={{background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:4,padding:"10px 14px",color:C.wheatDark,fontSize:12,fontFamily:"'DM Mono',monospace"}}><span style={{animation:"blink 1s infinite"}}>▋</span> Analysing AU markets...</div></div>}
          <div ref={endRef}/>
        </div>
        {messages.length<=2&&<div style={{padding:"0 14px 10px",display:"flex",flexWrap:"wrap",gap:5}}>{suggestions.map((s,i)=><button key={i} onClick={()=>setInput(s)} style={{background:C.eggshell,border:`1px solid ${C.lightGrey}`,borderRadius:2,color:C.charcoal,fontSize:11,padding:"4px 9px",cursor:"pointer"}} onMouseEnter={e=>{e.target.style.borderColor=C.auGold;e.target.style.color=C.auGold;}} onMouseLeave={e=>{e.target.style.borderColor=C.lightGrey;e.target.style.color=C.charcoal;}}>{s}</button>)}</div>}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${C.lightGrey}`,display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about AU grain prices, livestock indicators, wool, export markets..." style={{flex:1,background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:3,padding:"9px 12px",color:C.charcoal,fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.auGold} onBlur={e=>e.target.style.borderColor=C.lightGrey}/>
          <button onClick={send} disabled={loading} style={{background:loading?C.lightGrey:C.eucalyptus,border:"none",borderRadius:3,padding:"9px 16px",cursor:loading?"not-allowed":"pointer",color:C.white,fontWeight:700,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{loading?"...":"ASK →"}</button>
        </div>
      </Card>
    </div>
  );
}

// DATA COST SUMMARY
function AUDataCosts(){
  const costs=[
    {source:"MLA — EYCI, ESTLI, livestock indicators",       cost:"Free",          notes:"Published daily at mla.com.au — just wire the fetch",              url:"https://www.mla.com.au/prices-markets/"},
    {source:"AWEX — Wool EMI, micron prices",                 cost:"Free",          notes:"Published every Wednesday after auction at awex.com.au",            url:"https://www.awex.com.au/market-information/"},
    {source:"ABARES — Crop forecasts, production estimates",  cost:"Free",          notes:"Quarterly outlook reports, government open data",                    url:"https://www.agriculture.gov.au/abares"},
    {source:"GRDC — Grain research, basis data",              cost:"Free",          notes:"Some delivered price surveys published periodically",                url:"https://grdc.com.au/"},
    {source:"Grain Central — AU Ag news",                     cost:"Free (scrape)", notes:"Leading AU grain news source, scrapeable or via NewsAPI",            url:"https://www.graincentral.com/"},
    {source:"Weekly Times — Livestock & general Ag news",     cost:"Free (scrape)", notes:"VIC/national Ag news, good livestock coverage",                     url:"https://www.weeklytimesnow.com.au/agribusiness"},
    {source:"Mecardo — Delivered grain prices by region",     cost:"~$200–500/mo",  notes:"Best API for clean AU grain delivered prices — worth it at scale",    url:"https://mecardo.com.au/"},
    {source:"GIWA — WA grain prices",                         cost:"Free",          notes:"Grain Industry WA, publishes WA delivered prices weekly",            url:"https://www.giwa.org.au/"},
    {source:"Cotton Australia — Cotton prices",               cost:"Free",          notes:"Weekly price reports published by Cotton Australia",                 url:"https://cottonaustralia.com.au/"},
  ];
  return (
    <div style={{marginBottom:28}}>
      <SectionHead label="AU DATA SOURCES & COSTS" sub="Full breakdown of what's free vs paid for domestic AU data"/>
      <Card style={{padding:16}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr auto",gap:8,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.lightGrey}`}}>
          {["SOURCE","COST","NOTES","LINK"].map(h=><div key={h} style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em"}}>{h}</div>)}
        </div>
        {costs.map((r,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr auto",gap:8,padding:"10px 0",borderBottom:`1px solid ${C.lightGrey}`,alignItems:"start"}}>
            <span style={{color:C.charcoal,fontSize:12}}>{r.source}</span>
            <span style={{color:r.cost==="Free"?C.eucalyptus:r.cost.startsWith("Free")?C.warning:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{r.cost}</span>
            <span style={{color:C.wheatDark,fontSize:11,lineHeight:1.4}}>{r.notes}</span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none",whiteSpace:"nowrap"}} onMouseEnter={e=>e.target.style.textDecoration="underline"} onMouseLeave={e=>e.target.style.textDecoration="none"}>Visit →</a>
          </div>
        ))}
        <div style={{marginTop:14,padding:"10px 14px",background:C.eucalyptusPale,border:`1px solid ${C.eucalyptus}33`,borderRadius:3}}>
          <div style={{color:C.eucalyptus,fontSize:11,fontWeight:600,marginBottom:4}}>Bottom line on AU data costs</div>
          <div style={{color:C.charcoal,fontSize:12,lineHeight:1.6}}>The majority of what you need — all MLA livestock indicators, AWEX wool prices, ABARES forecasts, and most news — is completely free. The only paid item worth considering is Mecardo (~$200/mo) if you want clean, structured AU grain delivered prices by region via API. Even without it, GIWA, Grain Central, and state grain council websites publish most of this data for free — it just needs manual scraping rather than a clean API call.</div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AUSTRALIA TAB COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AustraliaTab() {
  const [section,setSection]=useState("overview");
  const SECTIONS=[
    {id:"overview",  label:"OVERVIEW",        emoji:"🏠"},
    {id:"grains",    label:"GRAINS",           emoji:"🌾"},
    {id:"livestock", label:"LIVESTOCK",        emoji:"🐄"},
    {id:"wool",      label:"WOOL",             emoji:"🐑"},
    {id:"news",      label:"AU NEWS",          emoji:"📰"},
    {id:"forecasts", label:"ABARES FORECASTS", emoji:"📊"},
    {id:"exports",   label:"EXPORT MARKETS",   emoji:"🚢"},
    {id:"seasonal",  label:"SEASONAL CALENDAR",emoji:"📅"},
    {id:"analyst",   label:"AU AI ANALYST",    emoji:"🦘"},
    {id:"datacosts", label:"DATA COSTS",       emoji:"💰"},
  ];

  return (
    <div>
      {/* AU Header banner */}
      <div style={{background:`linear-gradient(135deg, ${C.eucalyptus} 0%, ${C.navy} 100%)`,borderRadius:6,padding:"18px 22px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <span style={{fontSize:28}}>🦘</span>
            <div>
              <div style={{color:C.wheat,fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em"}}>AUSTRALIA</div>
              <div style={{color:"rgba(255,255,255,0.7)",fontSize:11,fontFamily:"'DM Mono',monospace"}}>Domestic Ag Intelligence — Grains · Livestock · Wool · Cotton</div>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,auto)",gap:"6px 24px",textAlign:"right"}}>
          {[["APW Wheat (Kwinana)","A$348.50/t","🌾"],["EYCI","748.50¢/kg","🐄"],["ESTLI","682¢/kg","🐑"],["Wool EMI","1168¢/kg","🧶"]].map(([l,v,e])=>(
            <div key={l}>
              <div style={{color:"rgba(255,255,255,0.55)",fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l}</div>
              <div style={{color:C.wheat,fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{e} {v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:4,padding:"4px 8px",marginBottom:20,display:"flex",gap:2,flexWrap:"wrap"}}>
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{background:section===s.id?C.eggshell:"none",color:section===s.id?C.charcoal:C.wheatDark,border:`1px solid ${section===s.id?C.lightGrey:"transparent"}`,borderRadius:3,padding:"6px 12px",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:section===s.id?600:400,transition:"all 0.15s",whiteSpace:"nowrap"}}
          onMouseEnter={e=>{if(section!==s.id){e.target.style.color=C.charcoal;}}}
          onMouseLeave={e=>{if(section!==s.id){e.target.style.color=C.wheatDark;}}}
          >{s.emoji} {s.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{animation:"fadeIn 0.2s ease"}}>
        {section==="overview"&&(
          <div>
            <AUGrainPrices/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
              <div>
                <SectionHead label="LIVESTOCK SNAPSHOT" sub="MLA indicators"/>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {AU_LIVESTOCK.map(l=>{const up=l.pct>=0;return(
                    <Card key={l.name} style={{padding:"10px 14px",borderLeft:`3px solid ${up?C.eucalyptus:C.negative}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:14}}>{l.emoji}</span><span style={{color:C.charcoal,fontSize:12,fontWeight:600}}>{l.name}</span></div><div style={{color:C.wheatDark,fontSize:10}}>{l.fullName}</div></div>
                      <div style={{textAlign:"right"}}><div style={{color:C.navy,fontSize:15,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{l.value.toFixed(0)}</div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:3}}>{l.unit}</div><TrendPill pct={l.pct}/></div>
                    </Card>
                  );})}
                </div>
              </div>
              <div>
                <SectionHead label="WOOL + COTTON SNAPSHOT"/>
                <Card style={{padding:16,marginBottom:10,borderTop:`3px solid ${C.auGold}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{color:C.charcoal,fontSize:13,fontWeight:700,marginBottom:2}}>Wool EMI</div><div style={{color:C.wheatDark,fontSize:10}}>Eastern Market Indicator</div></div>
                    <div style={{textAlign:"right"}}><div style={{color:C.navy,fontSize:24,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{AU_WOOL.emi.value}</div><div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:4}}>¢/kg clean</div><TrendPill pct={AU_WOOL.emi.pct}/></div>
                  </div>
                </Card>
                <Card style={{padding:12,borderLeft:`3px solid ${C.auGold}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><span style={{fontSize:18}}>🌿</span><span style={{color:C.charcoal,fontSize:12,fontWeight:600,marginLeft:8}}>Cotton ({AU_COTTON.region})</span></div>
                  <div style={{textAlign:"right"}}><div style={{color:C.navy,fontSize:15,fontFamily:"'DM Mono',monospace",fontWeight:700}}>A${AU_COTTON.price.toFixed(0)}</div><div style={{color:C.wheatDark,fontSize:9,marginBottom:3}}>{AU_COTTON.unit}</div><TrendPill pct={AU_COTTON.pct}/></div>
                </Card>
                <div style={{marginTop:14}}>
                  <SectionHead label="LATEST AU NEWS"/>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {AU_NEWS.slice(0,4).map(n=>(
                      <Card key={n.id} style={{padding:"8px 12px",borderLeft:`3px solid ${n.bullish?C.eucalyptus:C.negative}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:9,padding:"1px 5px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:n.bullish?C.eucalyptus:C.negative}}>{n.tag}</span><span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{n.time}</span></div>
                        <a href={n.url} target="_blank" rel="noopener noreferrer" style={{color:C.charcoal,fontSize:11,lineHeight:1.35,textDecoration:"none",display:"block"}}>{n.headline}</a>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <AUSeasonalCalendar/>
          </div>
        )}
        {section==="grains"    && <div><AUGrainPrices/><AUPulsePrices/><AUCottonPanel/></div>}
        {section==="livestock" && <AULivestockIndicators/>}
        {section==="wool"      && <AUWoolPanel/>}
        {section==="news"      && <AUNewsFeed/>}
        {section==="forecasts" && <AUCropForecasts/>}
        {section==="exports"   && <AUExportDestinations/>}
        {section==="seasonal"  && <AUSeasonalCalendar/>}
        {section==="analyst"   && <AUAnalyst/>}
        {section==="datacosts" && <AUDataCosts/>}
      </div>
    </div>
  );
}
