import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import IntelligenceFeed from "./IntelligenceFeed";
import AustraliaTab from "./AustraliaTab";
import AutoTrader from "./AutoTrader";

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR SYSTEM
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
};

// ─────────────────────────────────────────────────────────────────────────────
// API HOOKS — drop keys here when subscriptions are ready
// ─────────────────────────────────────────────────────────────────────────────
const API = {
  barchart: null,   // barchart.com/ondemand — futures prices
  newsapi:  null,   // newsapi.org — live Ag headlines
  polygon:  null,   // polygon.io — equity prices
  fred:     null,   // fred.stlouisfed.org — currency rates (free)
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const COMMODITIES = [
  { symbol:"ZC", name:"Corn",        unit:"¢/bu",  emoji:"🌽", color:C.wheat,           sector:"Grains"    },
  { symbol:"ZW", name:"Wheat",       unit:"¢/bu",  emoji:"🌾", color:C.navy,            sector:"Grains"    },
  { symbol:"ZS", name:"Soybeans",    unit:"¢/bu",  emoji:"🫘", color:C.eucalyptus,      sector:"Oilseeds"  },
  { symbol:"ZM", name:"Soy Meal",    unit:"$/ton", emoji:"🌱", color:C.eucalyptusLight, sector:"Oilseeds"  },
  { symbol:"LE", name:"Live Cattle", unit:"¢/lb",  emoji:"🐄", color:C.navyLight,       sector:"Livestock" },
  { symbol:"HE", name:"Lean Hogs",   unit:"¢/lb",  emoji:"🐖", color:C.wheatDark,       sector:"Livestock" },
];

const PRICES = {
  ZC:{ price:478.25,  change:3.75,   pct:0.79,  high:481.00,  low:472.50, vol:"142,340", open:474.50 },
  ZW:{ price:592.50,  change:-8.25,  pct:-1.37, high:601.00,  low:589.75, vol:"98,210",  open:600.75 },
  ZS:{ price:1087.75, change:12.50,  pct:1.16,  high:1091.25, low:1074.00,vol:"215,670", open:1075.25},
  ZM:{ price:312.40,  change:4.20,   pct:1.36,  high:314.10,  low:308.50, vol:"67,890",  open:308.20 },
  LE:{ price:184.325, change:0.875,  pct:0.48,  high:185.100, low:183.200,vol:"34,120",  open:183.450},
  HE:{ price:91.275,  change:-1.225, pct:-1.32, high:92.750,  low:90.800, vol:"28,450",  open:92.500 },
};

const SIGNALS = {
  ZC:{ overall:"BULLISH", score:68, vars:[
    {name:"WASDE Supply/Demand",signal:"BULLISH",weight:25,note:"S/U 13.4% — tightest in 4 years, falling"},
    {name:"Weather / Crop Stress",signal:"BULLISH",weight:20,note:"Corn Belt soil moisture 15% below normal"},
    {name:"Fund Positioning (COT)",signal:"BULLISH",weight:15,note:"Managed money net long +42,340 contracts"},
    {name:"Export Demand",signal:"BEARISH",weight:20,note:"China cancelled 3 cargoes — demand risk"},
    {name:"Seasonal Tendency",signal:"NEUTRAL",weight:10,note:"Typically flat late March / early April"},
    {name:"Currency (DXY)",signal:"BULLISH",weight:10,note:"Soft USD supportive of US corn exports"},
  ]},
  ZW:{ overall:"BULLISH", score:74, vars:[
    {name:"WASDE Supply/Demand",signal:"BULLISH",weight:25,note:"Global S/U 30.1% and declining"},
    {name:"Weather / Crop Stress",signal:"BULLISH",weight:20,note:"D2-D3 drought across KS, OK, TX wheat belt"},
    {name:"Fund Positioning (COT)",signal:"BEARISH",weight:15,note:"Funds net short -18,920 — squeeze potential"},
    {name:"Export Demand",signal:"BULLISH",weight:20,note:"Black Sea disruptions lifting US wheat"},
    {name:"Seasonal Tendency",signal:"BULLISH",weight:10,note:"Wheat rallies Mar–May on weather uncertainty"},
    {name:"Currency (DXY)",signal:"BULLISH",weight:10,note:"Soft USD supports US export competitiveness"},
  ]},
  ZS:{ overall:"NEUTRAL", score:52, vars:[
    {name:"WASDE Supply/Demand",signal:"BEARISH",weight:25,note:"Brazil crop 169.5 MMT — record supply"},
    {name:"Weather / Crop Stress",signal:"BULLISH",weight:20,note:"ARG pampas drying — second crop risk"},
    {name:"Fund Positioning (COT)",signal:"BULLISH",weight:15,note:"Managed money net long +87,210"},
    {name:"Export Demand",signal:"NEUTRAL",weight:20,note:"US export pace on track despite Brazil"},
    {name:"Seasonal Tendency",signal:"BEARISH",weight:10,note:"Brazil harvest pressure typical Mar–May"},
    {name:"Currency (BRL)",signal:"BEARISH",weight:10,note:"Weak BRL incentivising heavy Brazilian selling"},
  ]},
  ZM:{ overall:"NEUTRAL", score:55, vars:[
    {name:"WASDE Supply/Demand",signal:"NEUTRAL",weight:25,note:"Crush margins firm but large soy supply"},
    {name:"ARG Meal Supply",signal:"BEARISH",weight:20,note:"Argentina largest global meal exporter"},
    {name:"Fund Positioning (COT)",signal:"BULLISH",weight:15,note:"Funds modestly long — supportive backdrop"},
    {name:"Export Demand",signal:"BULLISH",weight:20,note:"US meal export sales ahead of last year"},
    {name:"Seasonal Tendency",signal:"NEUTRAL",weight:10,note:"Mixed seasonal — follows soy with a lag"},
    {name:"Currency (ARS)",signal:"BEARISH",weight:10,note:"Weak ARS incentivises Argentine meal selling"},
  ]},
  LE:{ overall:"BULLISH", score:78, vars:[
    {name:"Supply (Cattle on Feed)",signal:"BULLISH",weight:30,note:"Marketings tight — near-term supply light"},
    {name:"Demand (Grilling Season)",signal:"BULLISH",weight:20,note:"Seasonal grilling demand building Apr–Jun"},
    {name:"Fund Positioning (COT)",signal:"BULLISH",weight:15,note:"Funds near record net long +112,400"},
    {name:"Feed Costs (Corn)",signal:"NEUTRAL",weight:15,note:"Corn firm — feeding margins slightly compressed"},
    {name:"Seasonal Tendency",signal:"BULLISH",weight:10,note:"Cattle historically bullish spring into summer"},
    {name:"Cold Storage",signal:"BULLISH",weight:10,note:"Beef stocks below 5-yr average this week"},
  ]},
  HE:{ overall:"BEARISH", score:38, vars:[
    {name:"Supply (Hogs & Pigs)",signal:"BEARISH",weight:30,note:"Placements up 4.2% YoY — growing supply"},
    {name:"Demand (Export)",signal:"BULLISH",weight:20,note:"Export inspections 3-week high, Asian demand"},
    {name:"Fund Positioning (COT)",signal:"NEUTRAL",weight:15,note:"Funds near neutral — no clear directional bias"},
    {name:"Feed Costs",signal:"BEARISH",weight:15,note:"Corn/soy firm — packer margins compressed"},
    {name:"Seasonal Tendency",signal:"BEARISH",weight:10,note:"Hogs seasonally weak late-Q1 into early Q2"},
    {name:"Cold Storage (Pork)",signal:"BEARISH",weight:10,note:"Pork stocks above 5-yr average — supply heavy"},
  ]},
};

const NEWS = [
  {id:1,time:"2h ago", headline:"USDA raises Brazil soybean crop estimate to record 169.5 MMT",tag:"USDA",bullish:true, source:"USDA WASDE",url:"https://www.usda.gov/oce/commodity/wasde/",commodity:"ZS",hot:true},
  {id:2,time:"3h ago", headline:"Persistent drought deepens across Kansas winter wheat belt ahead of critical spring green-up",tag:"Weather",bullish:true, source:"USDA Crop Progress",url:"https://www.nass.usda.gov/Publications/National_Crop_Progress/",commodity:"ZW",hot:true},
  {id:3,time:"4h ago", headline:"China cancels 3 US corn cargoes amid escalating trade tension",tag:"Trade",bullish:false,source:"Reuters Ag",url:"https://www.reuters.com/business/commodities/",commodity:"ZC",hot:false},
  {id:4,time:"5h ago", headline:"Cattle on Feed placements up 4.2% year-over-year, above pre-report expectations",tag:"USDA",bullish:false,source:"USDA NASS",url:"https://www.nass.usda.gov/",commodity:"LE",hot:false},
  {id:5,time:"6h ago", headline:"Fertiliser prices retreat on softening natural gas — input cost relief for corn growers",tag:"Inputs",bullish:true, source:"Farm Futures",url:"https://www.farmfutures.com/markets",commodity:"ZC",hot:false},
  {id:6,time:"8h ago", headline:"Black Sea corridor tensions resurface — Ukraine reports major grain infrastructure strikes",tag:"Geopolitical",bullish:true, source:"Reuters Ag",url:"https://www.reuters.com/business/commodities/",commodity:"ZW",hot:true},
  {id:7,time:"9h ago", headline:"Argentina soy harvest 38% complete, pace running ahead of year-ago levels",tag:"Crop",bullish:false,source:"Buenos Aires Grain Exch",url:"https://www.bolsadecereales.com/ingles",commodity:"ZS",hot:false},
  {id:8,time:"11h ago",headline:"US pork export inspections reach 3-week high on robust South-East Asian demand",tag:"Exports",bullish:true, source:"USDA AMS",url:"https://www.ams.usda.gov/market-news/livestock-poultry-grain",commodity:"HE",hot:false},
  {id:9,time:"13h ago",headline:"ADM quarterly earnings miss — crush margins compressed by record South American supply",tag:"Ag Finance",bullish:false,source:"ADM Investor Relations",url:"https://www.adm.com/investors",commodity:"ZS",hot:false},
  {id:10,time:"15h ago",headline:"NOAA upgrades La Niña watch — 60% probability developing by June–August",tag:"ENSO",bullish:true, source:"NOAA CPC",url:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/",commodity:"ZW",hot:true},
];

const WEATHER_LOCATIONS = [
  {region:"US Corn Belt",      severity:"moderate",detail:"Soil moisture 15% below normal across IA, IL, IN",icon:"☀️",impact:"Bullish corn",  lat:42,  lng:-93},
  {region:"US Plains (Wheat)", severity:"severe",  detail:"Extreme drought KS, OK, TX panhandle — worsening",icon:"🔥",impact:"Bullish wheat", lat:38,  lng:-98},
  {region:"Brazil Mato Grosso",severity:"normal",  detail:"Good rains supporting second-crop corn",          icon:"🌧️",impact:"Bearish corn",  lat:-13, lng:-56},
  {region:"Argentina Pampas",  severity:"moderate",detail:"Below-normal rainfall forecast next 10 days",       icon:"🌤️",impact:"Bullish soy",  lat:-34, lng:-63},
  {region:"Black Sea",         severity:"mild",    detail:"Late frost risk for Ukraine winter wheat",           icon:"❄️",impact:"Bullish wheat", lat:49,  lng:32},
  {region:"Australia WA",      severity:"normal",  detail:"Good subsoil moisture ahead of winter planting",     icon:"✅",impact:"Neutral",       lat:-30, lng:118},
];

// Used as static fallback and for the home page summary widget
const WEATHER_DATA = WEATHER_LOCATIONS.map(loc=>({
  ...loc,
  condition:loc.detail,
  temp:null, precip:null, wind:null,
}));

const CURRENCIES_META = [
  // Major
  {pair:"EUR/USD", name:"Euro",               fredId:"DEXUSEU",  group:"Major",
   relevance:"EU is a major wheat competitor. Strong EUR makes EU exports expensive, helping US wheat compete in global markets.",
   affects:"Wheat · Corn", upIsBullish:true},
  {pair:"GBP/USD", name:"British Pound",      fredId:"DEXUSUK",  group:"Major",
   relevance:"UK is a key wheat importer and re-exporter. Strong GBP raises buying power for USD-priced grain.",
   affects:"Wheat", upIsBullish:true},
  {pair:"USD/JPY", name:"Japanese Yen",       fredId:"DEXJPUS",  group:"Major",
   relevance:"Japan is a premium beef and wheat buyer. Rising USD/JPY weakens the yen, increasing import costs and reducing demand.",
   affects:"Wheat · Beef", upIsBullish:false},
  {pair:"AUD/USD", name:"Australian Dollar",  fredId:"DEXUSAL",  group:"Major",
   relevance:"Australia is a major wheat and beef exporter. Weak AUD makes Australian exports cheaper, competing directly with US.",
   affects:"Wheat · Beef", upIsBullish:true},
  {pair:"NZD/USD", name:"New Zealand Dollar", fredId:"DEXUSNZ",  group:"Major",
   relevance:"NZ is the global dairy benchmark. Weak NZD makes NZ dairy more competitive, pressuring US dairy exports.",
   affects:"Dairy", upIsBullish:true},
  {pair:"USD/CAD", name:"Canadian Dollar",    fredId:"DEXCAUS",  group:"Major",
   relevance:"Canada is a major wheat and canola competitor. Rising USD/CAD weakens CAD, making Canadian exports cheaper globally.",
   affects:"Wheat · Canola", upIsBullish:false},
  {pair:"DXY",     name:"US Dollar Index",    fredId:"DTWEXBGS", group:"Major",
   relevance:"Master signal for all US Ag exports. Strong DXY makes every US commodity more expensive for global buyers.",
   affects:"All commodities", upIsBullish:false},
  // South America
  {pair:"USD/BRL", name:"Brazilian Real",     fredId:"DEXBZUS",  group:"South America",
   relevance:"Most critical for soybeans. Rising USD/BRL weakens BRL — Brazilian farmers earn more local currency per tonne sold, flooding world markets.",
   affects:"Soybeans · Corn", upIsBullish:false},
  {pair:"USD/ARS", name:"Argentine Peso",     fredId:"DEXARGE",  group:"South America",
   relevance:"Argentina is the world's largest soy meal exporter. Chronic ARS weakness drives relentless farmer selling and bearish global meal supply.",
   affects:"Soy Meal · Soybeans", upIsBullish:false},
  {pair:"USD/MXN", name:"Mexican Peso",       fredId:"DEXMXUS",  group:"South America",
   relevance:"Mexico is the #1 customer for US corn. Rising USD/MXN weakens MXN, reducing Mexican purchasing power for US corn imports.",
   affects:"Corn", upIsBullish:false},
  // Asia Pacific
  {pair:"USD/CNY", name:"Chinese Yuan",       fredId:"DEXCHUS",  group:"Asia Pacific",
   relevance:"China is the world's largest Ag importer. Rising USD/CNY weakens yuan — Chinese buyers pay more in domestic terms, may cut back across all commodities.",
   affects:"Soybeans · Corn · Pork", upIsBullish:false},
  {pair:"USD/INR", name:"Indian Rupee",       fredId:"DEXINUS",  group:"Asia Pacific",
   relevance:"India is a major pulse, cotton and vegetable oil buyer. Weak INR raises USD-priced import costs, may shift India toward domestic production.",
   affects:"Pulses · Cotton", upIsBullish:false},
  {pair:"USD/IDR", name:"Indonesian Rupiah",  fredId:"DEXIDUS",  group:"Asia Pacific",
   relevance:"Indonesia is one of the world's largest wheat importers. Weak IDR makes USD-priced wheat expensive, suppressing import demand.",
   affects:"Wheat", upIsBullish:false},
  {pair:"USD/MYR", name:"Malaysian Ringgit",  fredId:"DEXMAUS",  group:"Asia Pacific",
   relevance:"Malaysia is the #2 global palm oil producer. Weak MYR makes palm oil exports cheap, competing directly with US soybean oil.",
   affects:"Soybean Oil", upIsBullish:false},
  {pair:"USD/THB", name:"Thai Baht",          fredId:"DEXTHUS",  group:"Asia Pacific",
   relevance:"Thailand is a major rice and sugar exporter competing with US products across Asian and African markets.",
   affects:"Rice · Sugar", upIsBullish:false},
  // Other
  {pair:"USD/ZAR", name:"South African Rand", fredId:"DEXSFUS",  group:"Other",
   relevance:"South Africa is a major white maize producer. Weak ZAR makes SA maize exports cheap, displacing US corn in African markets.",
   affects:"Corn", upIsBullish:false},
];

// Used as static fallback and for the home page summary widget
const CURRENCIES_DATA = CURRENCIES_META.map(m=>({
  ...m, value:null, change:null, pct:null, live:false,
}));

// ─────────────────────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWeatherData() {
  const results = await Promise.all(
    WEATHER_LOCATIONS.map(loc =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,precipitation,windspeed_10m&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`
      ).then(r => r.json()).catch(() => null)
    )
  );
  return WEATHER_LOCATIONS.map((loc, i) => {
    const data = results[i];
    const cur = data?.current;
    const temp = cur?.temperature_2m ?? null;
    const precip = cur?.precipitation ?? null;
    const wind = cur?.windspeed_10m ?? null;
    let condition = loc.detail;
    if (temp !== null) {
      condition = `${temp}°C · ${precip}mm precip · ${wind}km/h wind`;
    }
    return { ...loc, condition, temp, precip, wind };
  });
}

let _prevERRates = null;

async function fetchCurrenciesData() {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!r.ok) return null;
    const data = await r.json();
    const rates = data.rates;
    if (!rates) return null;

    const calcDXY = (rt) => 50.14348112
      * Math.pow(rt.EUR || 1, 0.576)
      * Math.pow(rt.JPY || 1, 0.136)
      * Math.pow(rt.GBP || 1, 0.119)
      * Math.pow(rt.CAD || 1, 0.091)
      * Math.pow(rt.SEK || 1, 0.042)
      * Math.pow(rt.CHF || 1, 0.036);

    const getVal = (pair, rt) => {
      switch (pair) {
        case "DXY":     return calcDXY(rt);
        case "EUR/USD": return rt.EUR ? 1 / rt.EUR : null;
        case "GBP/USD": return rt.GBP ? 1 / rt.GBP : null;
        case "AUD/USD": return rt.AUD ? 1 / rt.AUD : null;
        case "NZD/USD": return rt.NZD ? 1 / rt.NZD : null;
        case "USD/JPY": return rt.JPY || null;
        case "USD/CAD": return rt.CAD || null;
        case "USD/BRL": return rt.BRL || null;
        case "USD/ARS": return rt.ARS || null;
        case "USD/MXN": return rt.MXN || null;
        case "USD/CNY": return rt.CNY || null;
        case "USD/INR": return rt.INR || null;
        case "USD/IDR": return rt.IDR || null;
        case "USD/MYR": return rt.MYR || null;
        case "USD/THB": return rt.THB || null;
        case "USD/ZAR": return rt.ZAR || null;
        default: return null;
      }
    };

    const prev = _prevERRates;
    _prevERRates = rates;

    return CURRENCIES_META.map(m => {
      const value = getVal(m.pair, rates);
      const prevValue = prev ? getVal(m.pair, prev) : null;
      const change = value != null && prevValue != null ? value - prevValue : null;
      const pct = change != null && prevValue ? (change / prevValue) * 100 : null;
      return { ...m, value: value != null ? parseFloat(value.toFixed(4)) : null, change, pct, live: value != null };
    });
  } catch {
    return null;
  }
}

const WASDE_DATA = {
  corn:    {global_prod:1219.0,us_prod:389.7,us_exports:62.2,global_stocks:284.2,stur:13.4,prev_stur:14.1,trend:"down"},
  wheat:   {global_prod:789.4, us_prod:50.1, us_exports:21.0,global_stocks:258.1,stur:30.1,prev_stur:31.2,trend:"down"},
  soybeans:{global_prod:423.5, us_prod:117.9,us_exports:50.3,global_stocks:121.4,stur:24.8,prev_stur:23.1,trend:"up"},
};

const COT_HISTORY = {
  labels:["Oct","Nov","Dec","Jan","Feb","Mar"],
  corn:    [28000,35000,42000,55000,48000,42340],
  wheat:   [-5000,-12000,-18000,-22000,-20000,-18920],
  soybeans:[65000,72000,80000,90000,85000,87210],
  cattle:  [95000,100000,108000,115000,112000,112400],
};

const SEASONAL_DATA = {
  ZC:[100,99,98,97,97,98,99,100,101,102,103,104,105,106,107,107,106,105,104,102,100,99,98,97,97,98,99,100,101,102,103,104,106,107,108,108,107,106,104,102,100,99,98,97,96,97,98,99,100,101,102,103],
  ZW:[105,104,103,102,101,100,99,98,97,96,96,97,98,99,100,101,102,103,104,105,106,107,107,106,105,104,103,102,101,100,99,98,97,96,96,97,98,99,100,101,102,103,104,105,106,107,107,106,105,104,103,102],
  ZS:[98,98,99,100,101,102,103,104,105,106,107,107,106,105,104,103,102,101,100,99,98,97,97,98,99,100,101,102,103,104,105,106,107,107,106,105,104,103,102,100,99,98,97,96,96,97,98,99,100,101,102,103],
  LE:[102,103,104,105,105,104,103,102,101,100,99,98,97,97,98,99,100,101,102,103,104,105,105,104,103,102,101,100,99,98,97,96,96,97,98,99,100,101,102,103,104,105,105,104,103,102,101,100,99,98,97,96],
};

const REPORT_CALENDAR = [
  {date:"Today 11:00am CT",name:"USDA Weekly Export Inspections",  importance:"high",    url:"https://www.ams.usda.gov/market-news/grain-transportation",                         countdown:"In 2h 15m"},
  {date:"Thu Apr 3",        name:"USDA Weekly Crop Progress",        importance:"medium",  url:"https://www.nass.usda.gov/Publications/National_Crop_Progress/",                   countdown:"In 2 days"},
  {date:"Fri Apr 4",        name:"CFTC COT Report",                  importance:"high",    url:"https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm",                countdown:"In 3 days"},
  {date:"Tue Apr 8",        name:"USDA WASDE Supply & Demand",       importance:"critical",url:"https://www.usda.gov/oce/commodity/wasde/",                                        countdown:"In 8 days"},
  {date:"Fri Apr 11",       name:"USDA Cattle on Feed",              importance:"high",    url:"https://www.nass.usda.gov/Publications/Todays_Reports/",                           countdown:"In 11 days"},
  {date:"Mon Apr 14",       name:"USDA Weekly Export Sales",         importance:"medium",  url:"https://apps.fas.usda.gov/export-sales/esrd1.html",                                countdown:"In 14 days"},
  {date:"Fri Apr 25",       name:"USDA Hogs & Pigs",                 importance:"high",    url:"https://www.nass.usda.gov/Publications/Todays_Reports/",                           countdown:"In 25 days"},
];

const AG_EQUITIES = [
  {ticker:"ADM",name:"Archer-Daniels-Midland",sector:"Grain",    price:47.82, pct:-1.40,mktCap:"$23.4B",desc:"World's largest grain merchandiser and processor.",agLink:"ADM earnings reflect crush margins and grain handling volumes — a proxy for Ag trade flows.",url:"https://www.adm.com/investors"},
  {ticker:"BG", name:"Bunge Global",           sector:"Grain",    price:82.14, pct:1.52, mktCap:"$11.2B",desc:"Major grain trader and oilseed processor with dominant Brazil presence.",agLink:"Bunge's Brazil operations make it a direct play on South American soy and corn export flows.",url:"https://www.bunge.com/investors"},
  {ticker:"NTR",name:"Nutrien",                sector:"Fertiliser",price:54.60,pct:0.81, mktCap:"$27.1B",desc:"World's largest producer of potash and major nitrogen fertiliser producer.",agLink:"Fertiliser prices directly affect farmer input costs and planted acreage decisions.",url:"https://www.nutrien.com/investors"},
  {ticker:"MOS",name:"The Mosaic Company",     sector:"Fertiliser",price:24.15,pct:-1.27,mktCap:"$8.6B", desc:"Major potash and phosphate producer — key crop nutrients.",agLink:"Mosaic pricing signals input cost trends for grain producers worldwide.",url:"https://www.mosaicco.com/investors"},
  {ticker:"DE", name:"Deere & Company",        sector:"Machinery", price:442.30,pct:0.87,mktCap:"$122.8B",desc:"World's leading agricultural equipment manufacturer.",agLink:"Deere equipment sales reflect farmer confidence and income. Strong farm economics → machinery investment.",url:"https://www.deere.com/en/our-company/investor-relations/"},
  {ticker:"CNHI",name:"CNH Industrial",        sector:"Machinery", price:12.84,pct:-0.93,mktCap:"$16.5B",desc:"Makes Case IH and New Holland agricultural equipment globally.",agLink:"European and Southern Hemisphere ag machinery — indicator of global farmer confidence outside US.",url:"https://www.cnhindustrial.com/en-us/investors"},
  {ticker:"CF", name:"CF Industries",          sector:"Fertiliser",price:78.90,pct:1.41, mktCap:"$14.7B",desc:"Largest North American nitrogen fertiliser producer.",agLink:"Natural gas is the primary input for nitrogen fertilisers — CF trades on gas prices and corn planting demand.",url:"https://www.cfindustries.com/investors"},
  {ticker:"FMC",name:"FMC Corporation",        sector:"Chemicals",  price:58.30,pct:-1.52,mktCap:"$7.3B", desc:"Agricultural chemicals and crop protection products.",agLink:"Pesticide and herbicide demand reflects planted acreage intentions — a leading indicator of the season.",url:"https://www.fmc.com/en/investors"},
];

const EDU_MODULES = [
  {id:"basics",   title:"Commodity Futures — The Basics",      emoji:"📚",level:"Beginner",     duration:"15 min",
   sections:[
    {heading:"What is a futures contract?",content:"A futures contract is a legally binding agreement to buy or sell a commodity at a predetermined price on a specific future date. When you buy a corn futures contract, you're agreeing to take delivery of 5,000 bushels of corn at the contract price on the delivery date — though most traders close positions before delivery ever happens.\n\nFutures trade on exchanges (CME Group for most Ag commodities) and are standardised — each contract has a fixed size, quality specification, and delivery location. This standardisation is what makes them liquid and tradeable."},
    {heading:"Long vs Short",content:"Going LONG means you buy a contract — you profit if prices rise. Going SHORT means you sell a contract you don't own — you profit if prices fall. Both are equally valid strategies. Farmers typically go short to lock in prices for their crop before harvest (hedging). Speculators go long or short based on their market view."},
    {heading:"Margin and leverage",content:"Futures require only a small margin deposit (typically 3–8% of contract value) to control the full contract. This creates leverage — a $500 margin deposit might control $15,000 worth of corn. Leverage amplifies both gains and losses. This is why position sizing and risk management are critical before entering any futures trade."},
   ]},
  {id:"supplydem",title:"Reading Supply & Demand",               emoji:"⚖️",level:"Beginner",     duration:"12 min",
   sections:[
    {heading:"The stocks-to-use ratio — the most important number",content:"The stocks-to-use (S/U) ratio is ending stocks divided by total use, expressed as a percentage. It tells you how many months of supply exist at the end of the marketing year. A low S/U ratio means tight stocks — the market has little buffer against a supply disruption, so prices tend to be high and volatile.\n\nHistorically, corn below 10% S/U is very tight and bullish. Above 15% is comfortable. The current 13.4% is drawing down — a bullish signal."},
    {heading:"How to read the WASDE",content:"The WASDE is released monthly (usually the second Tuesday). Focus on: (1) Global ending stocks. (2) US production estimate. (3) Export projections. (4) The 'changes from last month' column — markets have already priced the absolute level, it's the changes that matter.\n\nThe WASDE is the single most important scheduled data release in grain markets. Always know when it's coming."},
    {heading:"Supply vs demand shocks",content:"Supply shocks (drought, flood, frost) are typically fast-moving and violent — markets reprice quickly when crop estimates change. Demand shocks (China buying, trade policy) can be more gradual but sustained. The best trades often come when both supply AND demand signals align — what traders call 'confluence'."},
   ]},
  {id:"weather",  title:"Weather & Crop Development",            emoji:"🌦️",level:"Intermediate", duration:"18 min",
   sections:[
    {heading:"Why weather is the ultimate wildcard",content:"Unlike supply/demand data which updates monthly, weather changes daily — and a single week of stress at a critical crop development stage can cut yields by 20-30%. This is why the most violent price moves in grain markets happen during the summer weather market (June–August for US crops)."},
    {heading:"Critical growing periods by commodity",content:"CORN: Planting (Apr–May) — slow planting = bullish. Pollination (mid-Jul) — heat or drought at this stage destroys yield potential. This is the highest-risk weather window in all commodity markets.\n\nWHEAT: Winter wheat green-up (Mar–Apr). Grain fill (May–Jun) — hot and dry cuts protein and yield. Harvest (Jun–Jul) — rain at harvest lowers quality.\n\nSOYBEANS: Planting (May–Jun). Pod fill (Aug). Brazilian second crop (Feb–Mar) now equally critical.\n\nLIVE CATTLE: Weather affects feed costs (drought = higher corn/hay = higher feeding costs) and summer pasture conditions."},
    {heading:"El Niño and La Niña",content:"LA NIÑA typically means: drier than normal in Brazil and Argentina (bullish soy/corn), drier in the US Southern Plains (bullish wheat), wetter in northern Australia.\n\nEL NIÑO typically means: wetter in South America (bearish — large crops), drier in Southeast Asia, variable in the US.\n\nThe current La Niña watch (60% probability by Jun–Aug) is a meaningful development to track closely."},
   ]},
  {id:"cot",      title:"Understanding the COT Report",          emoji:"📊",level:"Intermediate", duration:"10 min",
   sections:[
    {heading:"What is the COT and why does it matter?",content:"The Commitments of Traders (COT) report is published every Friday by the CFTC. It shows aggregate net positions held by different categories of traders as of the previous Tuesday. For commodity traders, it's the most important sentiment and positioning tool available."},
    {heading:"The three trader categories",content:"COMMERCIALS (hedgers): Farmers, grain companies, processors who hedge real physical exposure. They're the 'smart money' in terms of understanding physical fundamentals.\n\nMANAGED MONEY (funds): Hedge funds, CTAs who trade for profit. They trend-follow and hold large positions. When they're extremely long or short, it often precedes a reversal.\n\nNON-COMMERCIAL / SPECS: Smaller speculators — generally less informative."},
    {heading:"How to use COT as a beginner",content:"Watch for EXTREME net short positioning by managed money. When funds are at or near record net short, there's not much selling left — but a lot of buying that has to happen when they cover. This creates asymmetric upside risk.\n\nConversely, record net long positioning means funds are crowded into a bull trade — vulnerable to any negative news. The COT is a contrarian tool, not a momentum tool."},
   ]},
  {id:"trading101",title:"How to Actually Start Trading",        emoji:"🚀",level:"Beginner",     duration:"20 min",
   sections:[
    {heading:"Paper trading first — always",content:"Before putting real money on the line, spend at least 3 months paper trading. Log every trade in your journal: your thesis, entry, target, stop loss, and result. The goal isn't just to make money on paper — it's to build and test your analytical process."},
    {heading:"Brokers for commodity futures in Australia",content:"As an Australian retail trader, your main options:\n\n• Interactive Brokers — best for Australians accessing CME futures directly. Low commissions, excellent platform.\n• Saxo Bank — good for commodity CFDs if you want futures exposure without full contract sizes.\n• CMC Markets — commodity CFDs with competitive spreads.\n\nNote: Full CME corn futures = 5,000 bushels ≈ $24,000 notional. Mini futures (1/5 size) are available."},
    {heading:"Risk management — the one thing that keeps you in the game",content:"Never risk more than 1–2% of your trading capital on a single trade. If you have $10,000, your maximum loss per trade is $100–$200. Always set a stop loss BEFORE entering a trade. Know your exit before your entry.\n\nPre-trade checklist: (1) WASDE/S/U ratio (2) Weather conditions (3) COT positioning (4) Seasonal tendency (5) Your thesis in one sentence (6) Where am I wrong? — define your stop."},
   ]},
];

// Generate simulated OHLC chart data
function generateOHLC(basePrice, days=90, volatility=0.012) {
  const data = [];
  let price = basePrice * 0.88;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now); date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.47) * volatility;
    const open = price;
    price = price * (1 + change);
    const high = Math.max(open, price) * (1 + Math.random() * 0.005);
    const low  = Math.min(open, price) * (1 - Math.random() * 0.005);
    data.push({ date, open, high, low, close:price, vol:Math.floor(Math.random()*200000+50000) });
  }
  return data;
}

// Generate backtesting signals from OHLC data
function generateSignals(ohlc) {
  const signals = [];
  for (let i = 20; i < ohlc.length - 1; i++) {
    const ma10 = ohlc.slice(i-10,i).reduce((s,d)=>s+d.close,0)/10;
    const ma20 = ohlc.slice(i-20,i).reduce((s,d)=>s+d.close,0)/20;
    const prev_ma10 = ohlc.slice(i-11,i-1).reduce((s,d)=>s+d.close,0)/10;
    const prev_ma20 = ohlc.slice(i-21,i-1).reduce((s,d)=>s+d.close,0)/20;
    if (prev_ma10 <= prev_ma20 && ma10 > ma20) signals.push({i, type:"BUY",  price:ohlc[i+1].open, date:ohlc[i+1].date});
    if (prev_ma10 >= prev_ma20 && ma10 < ma20) signals.push({i, type:"SELL", price:ohlc[i+1].open, date:ohlc[i+1].date});
  }
  return signals;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Card({children,style={},...r}){ return <div style={{background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:4,display:"flex",flexDirection:"column",...style}} {...r}>{children}</div>; }
function SectionHead({label,sub,action}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div>
          <span style={{background:"#2F4F3E",color:"#ffffff",padding:"4px 12px",borderRadius:3,fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.12em",fontWeight:600,display:"inline-block"}}>{label}</span>
          {sub&&<div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginTop:1}}>{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
function SignalPill({signal,size="sm"}){
  const cfg={BULLISH:{bg:C.eucalyptusPale,c:C.eucalyptus},BEARISH:{bg:C.negativePale,c:C.negative},NEUTRAL:{bg:C.warningPale,c:C.warning}}[signal]||{bg:C.eggshell,c:C.charcoal};
  return <span style={{fontSize:size==="lg"?11:9,padding:size==="lg"?"3px 10px":"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:"0.06em",color:cfg.c,background:cfg.bg,border:`1px solid ${cfg.c}22`}}>{signal}</span>;
}
function ImpBadge({level}){
  const cfg={critical:{c:"#e67e22",bg:"#fef0e0"},high:{c:C.eucalyptus,bg:C.eucalyptusPale},medium:{c:C.navy,bg:C.navyPale}}[level]||{c:C.charcoal,bg:C.eggshell};
  return <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:700,color:cfg.c,background:cfg.bg,border:`1px solid ${cfg.c}33`}}>{level.toUpperCase()}</span>;
}
function ScoreBar({score}){
  const color=score>=65?C.eucalyptus:score>=45?C.warning:C.negative;
  return <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:5,background:C.lightGrey,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${score}%`,background:color,borderRadius:3,transition:"width 0.6s ease"}}/></div><span style={{color,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:700,minWidth:28}}>{score}</span></div>;
}
function Ticker(){
  const items=COMMODITIES.map(c=>{const p=PRICES[c.symbol];return `${c.emoji}  ${c.name}  ${p.price.toFixed(2)}  ${p.pct>0?"▲":"▼"} ${Math.abs(p.pct).toFixed(2)}%`;});
  const text=[...items,...items].join("          ·          ");
  return <div style={{background:C.navy,padding:"8px 0",overflow:"hidden",borderBottom:`1px solid ${C.navyLight}`}}><div style={{display:"inline-block",whiteSpace:"nowrap",animation:"ticker 60s linear infinite",fontSize:11,color:C.wheat,fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em"}}>{text}</div></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDLESTICK CHART
// ─────────────────────────────────────────────────────────────────────────────
function CandlestickChart({data, signals=[], showSignals=true, height=220}){
  if(!data||data.length<2) return null;
  const W=800, H=height, PAD={t:10,b:30,l:10,r:10};
  const visible=data.slice(-60);
  const prices=visible.flatMap(d=>[d.high,d.low]);
  const minP=Math.min(...prices), maxP=Math.max(...prices);
  const range=maxP-minP||1;
  const cw=(W-PAD.l-PAD.r)/visible.length;
  const py=v=>PAD.t+(1-(v-minP)/range)*(H-PAD.t-PAD.b);
  const px=i=>PAD.l+(i+0.5)*cw;
  const visibleSignals=signals.filter(s=>s.i>=data.length-60);
  const ma10=visible.map((_,i)=>i<9?null:visible.slice(i-9,i+1).reduce((s,d)=>s+d.close,0)/10);
  const ma20=visible.map((_,i)=>i<19?null:visible.slice(i-19,i+1).reduce((s,d)=>s+d.close,0)/20);
  const ma10Path=ma10.map((v,i)=>v?`${i===ma10.findIndex(x=>x!==null)?"M":"L"}${px(i)},${py(v)}`:"").filter(Boolean).join(" ");
  const ma20Path=ma20.map((v,i)=>v?`${i===ma20.findIndex(x=>x!==null)?"M":"L"}${px(i)},${py(v)}`:"").filter(Boolean).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height,display:"block"}} preserveAspectRatio="none">
      {/* Grid lines */}
      {[0,0.25,0.5,0.75,1].map(f=>{
        const y=PAD.t+f*(H-PAD.t-PAD.b);
        const price=(minP+range*(1-f)).toFixed(2);
        return <g key={f}><line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke={C.lightGrey} strokeWidth="0.5"/><text x={W-PAD.r} y={y-2} fill={C.wheatDark} fontSize="7" textAnchor="end" fontFamily="monospace">{price}</text></g>;
      })}
      {/* MA lines */}
      <path d={ma10Path} fill="none" stroke={C.wheat} strokeWidth="1.2" strokeLinecap="round"/>
      <path d={ma20Path} fill="none" stroke={C.navy} strokeWidth="1.2" strokeDasharray="4,2" strokeLinecap="round"/>
      {/* Candles */}
      {visible.map((d,i)=>{
        const up=d.close>=d.open;
        const col=up?C.eucalyptus:C.negative;
        const bodyTop=py(Math.max(d.open,d.close));
        const bodyBot=py(Math.min(d.open,d.close));
        const bodyH=Math.max(bodyBot-bodyTop,1);
        return (
          <g key={i}>
            <line x1={px(i)} y1={py(d.high)} x2={px(i)} y2={py(d.low)} stroke={col} strokeWidth="0.8"/>
            <rect x={px(i)-cw*0.35} y={bodyTop} width={cw*0.7} height={bodyH} fill={col} opacity="0.85"/>
          </g>
        );
      })}
      {/* Signal markers */}
      {showSignals && visibleSignals.map((s,idx)=>{
        const relI=s.i-(data.length-visible.length);
        if(relI<0||relI>=visible.length) return null;
        const x=px(relI), y=s.type==="BUY"?py(visible[relI].low)+12:py(visible[relI].high)-12;
        return <g key={idx}><circle cx={x} cy={y} r="5" fill={s.type==="BUY"?C.eucalyptus:C.negative}/><text x={x} y={y+3} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">{s.type==="BUY"?"B":"S"}</text></g>;
      })}
      {/* Legend */}
      <rect x={PAD.l} y={PAD.t} width={180} height={16} fill="white" opacity="0.85"/>
      <line x1={PAD.l+4} y1={PAD.t+8} x2={PAD.l+20} y2={PAD.t+8} stroke={C.wheat} strokeWidth="1.5"/>
      <text x={PAD.l+24} y={PAD.t+11} fill={C.charcoal} fontSize="7" fontFamily="monospace">MA10</text>
      <line x1={PAD.l+54} y1={PAD.t+8} x2={PAD.l+70} y2={PAD.t+8} stroke={C.navy} strokeWidth="1.5" strokeDasharray="3,2"/>
      <text x={PAD.l+74} y={PAD.t+11} fill={C.charcoal} fontSize="7" fontFamily="monospace">MA20</text>
      {showSignals&&<><circle cx={PAD.l+108} cy={PAD.t+8} r="4" fill={C.eucalyptus}/><text x={PAD.l+115} y={PAD.t+11} fill={C.charcoal} fontSize="7" fontFamily="monospace">BUY</text><circle cx={PAD.l+142} cy={PAD.t+8} r="4" fill={C.negative}/><text x={PAD.l+149} y={PAD.t+11} fill={C.charcoal} fontSize="7" fontFamily="monospace">SELL</text></>}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE CHARTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function PriceCharts(){
  const [activeSym,setActiveSym]=useState("ZC");
  const [range,setRange]=useState(90);
  const [showSignals,setShowSignals]=useState(false);
  const comm=COMMODITIES.find(c=>c.symbol===activeSym);
  const p=PRICES[activeSym];
  const up=p.pct>=0;
  const ohlc=useMemo(()=>generateOHLC(p.price,range),[activeSym,range]);
  const signals=useMemo(()=>generateSignals(ohlc),[ohlc]);
  const buys=signals.filter(s=>s.type==="BUY");
  const sells=signals.filter(s=>s.type==="SELL");
  const pnlTrades=[];
  for(let i=0;i<buys.length;i++){
    const entry=buys[i];
    const exit=sells.find(s=>s.i>entry.i);
    if(exit) pnlTrades.push({entry:entry.price,exit:exit.price,pnl:exit.price-entry.price,pct:(exit.price-entry.price)/entry.price*100,win:exit.price>entry.price});
  }
  return (
    <div>
      <SectionHead label="PRICE CHARTS" sub="Candlestick with MA10 / MA20 overlays · 60-day view"/>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {COMMODITIES.map(c=>(
          <button key={c.symbol} onClick={()=>setActiveSym(c.symbol)} style={{background:activeSym===c.symbol?c.color:C.white,color:activeSym===c.symbol?C.white:C.charcoal,border:`1px solid ${activeSym===c.symbol?c.color:C.lightGrey}`,borderRadius:3,padding:"6px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500,transition:"all 0.15s"}}>
            {c.emoji} {c.name}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          {[30,60,90].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{background:range===r?C.charcoal:C.white,color:range===r?C.white:C.charcoal,border:`1px solid ${range===r?C.charcoal:C.lightGrey}`,borderRadius:2,padding:"5px 10px",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{r}D</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:20,marginBottom:18}}>
        <Card style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>{comm?.emoji}</span>
              <div>
                <span style={{color:C.charcoal,fontSize:16,fontWeight:700}}>{comm?.name}</span>
                <span style={{color:C.wheatDark,fontSize:11,fontFamily:"'DM Mono',monospace",marginLeft:10}}>{comm?.unit}</span>
              </div>
              <SignalPill signal={SIGNALS[activeSym]?.overall}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:C.charcoal}}>
                <input type="checkbox" checked={showSignals} onChange={e=>setShowSignals(e.target.checked)} style={{accentColor:C.eucalyptus}}/>
                Show MA signals
              </label>
            </div>
          </div>
          <CandlestickChart data={ohlc} signals={signals} showSignals={showSignals} height={240}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
            <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{range} days ago</span>
            <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>Today</span>
          </div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:160}}>
          {[["PRICE",p.price.toFixed(2),C.navy],["CHANGE",`${up?"+":""}${p.change.toFixed(2)}`,up?C.eucalyptus:C.negative],["PCT",`${up?"+":""}${p.pct.toFixed(2)}%`,up?C.eucalyptus:C.negative],["HIGH",p.high.toFixed(2),C.charcoal],["LOW",p.low.toFixed(2),C.charcoal],["VOLUME",p.vol,C.charcoal]].map(([l,v,c])=>(
            <Card key={l} style={{padding:"10px 14px"}}>
              <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:3}}>{l}</div>
              <div style={{color:c,fontSize:15,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{v}</div>
            </Card>
          ))}
        </div>
      </div>
      <Card style={{padding:14,background:C.offwhite}}>
        <div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:6}}>READING THE CHART</div>
        <div style={{color:C.charcoal,fontSize:12,lineHeight:1.6}}>
          Green candles = price closed higher than it opened. Red candles = closed lower. The wicks show the high and low for the day. The MA10 (gold line) and MA20 (navy dashed) are moving averages — when MA10 crosses above MA20, it's a short-term bullish signal (shown as B markers when 'Show MA signals' is ticked). These are simple trend-following signals — not recommendations. Use alongside fundamentals and the scorecard.
        </div>
      </Card>
      <div style={{marginTop:10,padding:"8px 12px",background:C.eggshell,border:`1px dashed ${C.lightGrey}`,borderRadius:3}}>
        <span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>⚡ HOOK: Add Barchart API key for real OHLC historical data and live intraday charts.</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKTESTING TAB
// ─────────────────────────────────────────────────────────────────────────────
function Backtesting(){
  const [sym,setSym]=useState("ZC");
  const [strategy,setStrategy]=useState("ma_cross");
  const [ran,setRan]=useState(false);
  const [results,setResults]=useState(null);
  const [loading,setLoading]=useState(false);
  const [aiAnalysis,setAiAnalysis]=useState("");
  const comm=COMMODITIES.find(c=>c.symbol===sym);
  const STRATEGIES=[
    {id:"ma_cross",name:"MA Crossover (10/20)",desc:"Buy when 10-day MA crosses above 20-day MA. Sell when it crosses below. A classic trend-following system."},
    {id:"seasonal",name:"Seasonal Tendency",desc:"Buy in the seasonal low period, sell at the seasonal high. Based on 10-year average price patterns."},
    {id:"cot_extreme",name:"COT Extreme Reversal",desc:"Buy when managed money net short is at 52-week extreme. Sell when net long is at extreme. A contrarian system."},
  ];

  function runBacktest(){
    setLoading(true); setAiAnalysis(""); setRan(false);
    setTimeout(()=>{
      const ohlc=generateOHLC(PRICES[sym].price,365,0.014);
      const signals=strategy==="ma_cross"?generateSignals(ohlc):
        strategy==="seasonal"?ohlc.map((_,i)=>i===15?{i,type:"BUY",price:ohlc[i].open}:i===35?{i,type:"SELL",price:ohlc[i].open}:null).filter(Boolean):
        [{i:20,type:"BUY",price:ohlc[20].open},{i:50,type:"SELL",price:ohlc[50].open},{i:70,type:"BUY",price:ohlc[70].open},{i:100,type:"SELL",price:ohlc[100].open}];
      const buys=signals.filter(s=>s.type==="BUY");
      const sells=signals.filter(s=>s.type==="SELL");
      const trades=[];
      for(let i=0;i<buys.length;i++){
        const entry=buys[i];
        const exit=sells.find(s=>s.i>entry.i);
        if(exit){
          const pnl=exit.price-entry.price;
          const contractSize={ZC:5000,ZW:5000,ZS:5000,ZM:100,LE:400,HE:400}[sym]||1000;
          trades.push({entry:entry.price,exit:exit.price,rawPnl:pnl,pnlDollar:pnl*contractSize/100,pct:(pnl/entry.price*100),win:pnl>0,entryDate:entry.date,exitDate:exit.date});
        }
      }
      const wins=trades.filter(t=>t.win).length;
      const totalPnl=trades.reduce((s,t)=>s+t.pnlDollar,0);
      const avgWin=trades.filter(t=>t.win).reduce((s,t)=>s+t.pnlDollar,0)/(wins||1);
      const avgLoss=trades.filter(t=>!t.win).reduce((s,t)=>s+t.pnlDollar,0)/((trades.length-wins)||1);
      setResults({trades,wins,losses:trades.length-wins,total:trades.length,winRate:wins/trades.length*100,totalPnl,avgWin,avgLoss,profitFactor:Math.abs(avgWin/(avgLoss||1)),ohlc,signals});
      setRan(true); setLoading(false);
    },800);
  }

  async function getAIAnalysis(){
    if(!results) return;
    setAiAnalysis("loading");
    const strat=STRATEGIES.find(s=>s.id===strategy);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:"You are a commodity trading coach analysing backtesting results for a new trader. Be educational, honest about limitations, and provide actionable insights. 3-4 paragraphs max.",messages:[{role:"user",content:`Analyse these backtesting results for ${comm?.name} using the ${strat?.name} strategy:\n\nTotal trades: ${results.total}\nWin rate: ${results.winRate.toFixed(1)}%\nTotal P&L (simulated): $${results.totalPnl.toFixed(0)}\nAvg winning trade: $${results.avgWin.toFixed(0)}\nAvg losing trade: $${results.avgLoss.toFixed(0)}\nProfit factor: ${results.profitFactor.toFixed(2)}\n\nProvide: what these results suggest about the strategy, key limitations of backtesting, how to interpret the profit factor, and what additional analysis a new trader should do before trading this strategy live.`}]})});
      const data=await res.json();
      setAiAnalysis(data.content?.map(b=>b.text||"").join("")||"Could not get analysis.");
    }catch{setAiAnalysis("Connection error.");}
  }

  return (
    <div>
      <SectionHead label="BACKTESTING ENGINE" sub="Test model signals against historical price data — simulated OHLC"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        <div>
          <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:6}}>SELECT COMMODITY</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {COMMODITIES.map(c=>(
              <button key={c.symbol} onClick={()=>setSym(c.symbol)} style={{background:sym===c.symbol?c.color:C.white,color:sym===c.symbol?C.white:C.charcoal,border:`1px solid ${sym===c.symbol?c.color:C.lightGrey}`,borderRadius:3,padding:"6px 12px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500}}>
                {c.emoji} {c.symbol}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:6}}>SELECT STRATEGY</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {STRATEGIES.map(s=>(
              <button key={s.id} onClick={()=>setStrategy(s.id)} style={{background:strategy===s.id?C.navy:C.white,color:strategy===s.id?C.white:C.charcoal,border:`1px solid ${strategy===s.id?C.navy:C.lightGrey}`,borderRadius:3,padding:"8px 12px",cursor:"pointer",fontSize:11,textAlign:"left",transition:"all 0.15s"}}>
                <div style={{fontWeight:600,marginBottom:2}}>{s.name}</div>
                <div style={{fontSize:10,opacity:0.8,lineHeight:1.3}}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <button onClick={runBacktest} disabled={loading} style={{background:loading?C.lightGrey:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"14px",cursor:loading?"not-allowed":"pointer",fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:"0.05em"}}>
            {loading?"RUNNING...":"▶ RUN BACKTEST"}
          </button>
          <div style={{marginTop:10,color:C.wheatDark,fontSize:10,lineHeight:1.5}}>
            Tests the strategy against 365 days of simulated price data for {comm?.name}. Results are for education only — simulated data, not live historical prices.
          </div>
        </div>
      </div>

      {ran&&results&&(
        <div style={{animation:"fadeIn 0.3s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20,alignItems:"stretch"}}>
            {[
              {l:"TOTAL TRADES",   v:results.total,           c:C.navy},
              {l:"WIN RATE",       v:`${results.winRate.toFixed(1)}%`, c:results.winRate>=50?C.eucalyptus:C.negative},
              {l:"TOTAL SIM P&L",  v:`${results.totalPnl>=0?"+":""}$${Math.abs(results.totalPnl).toFixed(0)}`, c:results.totalPnl>=0?C.eucalyptus:C.negative},
              {l:"AVG WIN",        v:`+$${results.avgWin.toFixed(0)}`, c:C.eucalyptus},
              {l:"PROFIT FACTOR",  v:results.profitFactor.toFixed(2),  c:results.profitFactor>=1.5?C.eucalyptus:results.profitFactor>=1?C.warning:C.negative},
            ].map((s,i)=>(
              <Card key={i} style={{padding:14}}>
                <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",marginBottom:5}}>{s.l}</div>
                <div style={{color:s.c,fontSize:20,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{s.v}</div>
              </Card>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
            <Card style={{padding:16}}>
              <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:10}}>Price Chart with Signals (Last 60 days)</div>
              <CandlestickChart data={results.ohlc} signals={results.signals} showSignals={true} height={200}/>
            </Card>
            <Card style={{padding:14,overflowY:"auto",maxHeight:260}}>
              <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:10}}>Trade Log</div>
              {results.trades.slice(-12).map((t,i)=>(
                <div key={i} style={{padding:"6px 0",borderBottom:`1px solid ${C.lightGrey}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:C.charcoal,fontSize:10,fontFamily:"'DM Mono',monospace"}}>
                      B {t.entry.toFixed(2)} → S {t.exit.toFixed(2)}
                    </div>
                    <div style={{color:C.wheatDark,fontSize:9}}>{t.entryDate?.toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</div>
                  </div>
                  <span style={{color:t.win?C.eucalyptus:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700}}>
                    {t.win?"+":"-"}${Math.abs(t.pnlDollar).toFixed(0)}
                  </span>
                </div>
              ))}
            </Card>
          </div>
          <div style={{marginBottom:16}}>
            {!aiAnalysis&&<button onClick={getAIAnalysis} style={{background:C.navy,color:C.white,border:"none",borderRadius:3,padding:"10px 18px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>◆ GET AI ANALYSIS OF RESULTS</button>}
            {aiAnalysis==="loading"&&<div style={{color:C.wheatDark,fontSize:12,fontFamily:"'DM Mono',monospace"}}><span style={{animation:"blink 1s infinite"}}>▋</span> Analysing results...</div>}
            {aiAnalysis&&aiAnalysis!=="loading"&&(
              <Card style={{padding:16,borderLeft:`4px solid ${C.wheat}`}}>
                <div style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:8,letterSpacing:"0.12em"}}>◆ AI BACKTEST ANALYSIS</div>
                <div style={{color:C.charcoal,fontSize:13,lineHeight:1.7,fontFamily:"'Lora',serif"}}>{aiAnalysis}</div>
              </Card>
            )}
          </div>
          <Card style={{padding:14,background:C.warningPale,border:`1px solid ${C.warning}33`}}>
            <div style={{color:C.warning,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:4}}>⚠ BACKTESTING LIMITATIONS</div>
            <div style={{color:C.charcoal,fontSize:12,lineHeight:1.6}}>These results use simulated price data, not real historical prices. Backtesting has known limitations: overfitting, look-ahead bias, and the fact that past performance does not predict future results. Use this tool to understand how a strategy works conceptually — not to make live trading decisions. When Barchart API is connected, this module will test against real historical futures data.</div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI ANALYST CHAT
// ─────────────────────────────────────────────────────────────────────────────
function AIAnalyst(){
  const [messages,setMessages]=useState([{role:"assistant",text:"G'day. I'm your Muster Ag analyst — I have full context of your dashboard data. Ask me anything about what's moving markets, how to interpret reports, what a price move means, or where to start as a new commodity trader."}]);
  const [input,setInput]=useState(""); const [loading,setLoading]=useState(false); const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const priceCtx=COMMODITIES.map(c=>{const p=PRICES[c.symbol];return `${c.name}: ${p.price.toFixed(2)}${c.unit} (${p.pct>0?"+":""}${p.pct.toFixed(2)}%)`;}).join(", ");
  const sys=`You are Muster's embedded agricultural commodity market analyst. The user is new to commodity trading, based in Australia.\n\nCurrent market data: ${priceCtx}\nDXY 104.23 soft, BRL 5.0821 weak, La Niña watch issued.\nWASDE: Corn S/U 13.4%↓, Wheat 30.1%↓, Soy 24.8%↑.\nCOT: Corn +42,340 long, Wheat -18,920 short, Soybeans +87,210 long, Cattle +112,400 near-record long.\n\nBe educational, direct, plain English. Explain the WHY. 3-5 paragraphs max. Never give formal financial advice but explain what data implies.`;
  const suggestions=["What's the bull case for wheat right now?","Why does a weak USD help grain prices?","Explain ending stocks-to-use ratio","How do I read the COT report?","What does La Niña mean for my commodities?","Where does a beginner start in commodity trading?"];
  async function send(){
    if(!input.trim()||loading) return;
    const msg=input.trim(); setInput(""); setMessages(p=>[...p,{role:"user",text:msg}]); setLoading(true);
    try{
      const hist=messages.slice(1).map(m=>({role:m.role,content:m.text}));
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:[...hist,{role:"user",content:msg}]})});
      const data=await res.json();
      setMessages(p=>[...p,{role:"assistant",text:data.content?.map(b=>b.text||"").join("")||"Couldn't get a response."}]);
    }catch{setMessages(p=>[...p,{role:"assistant",text:"Connection error."}]);}
    setLoading(false);
  }
  return (
    <div style={{height:"calc(100vh-250px)",minHeight:500,display:"flex",flexDirection:"column"}}>
      <SectionHead label="AI MARKET ANALYST" sub="Powered by Claude · Full market context loaded"/>
      <Card style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"88%",background:m.role==="user"?C.navy:C.white,border:`1px solid ${m.role==="user"?C.navy:C.lightGrey}`,borderRadius:4,padding:"12px 16px",color:m.role==="user"?C.eggshell:C.charcoal,fontSize:13,lineHeight:1.65,fontFamily:m.role==="assistant"?"'Lora',serif":"'IBM Plex Sans',sans-serif"}}>
                {m.role==="assistant"&&<div style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:6,fontWeight:700,letterSpacing:"0.12em"}}>◆ MUSTER ANALYST</div>}
                {m.text}
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex"}}><div style={{background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:4,padding:"12px 16px",color:C.wheatDark,fontSize:12,fontFamily:"'DM Mono',monospace"}}><span style={{animation:"blink 1s infinite"}}>▋</span> Analysing...</div></div>}
          <div ref={endRef}/>
        </div>
        {messages.length<=2&&<div style={{padding:"0 16px 10px",display:"flex",flexWrap:"wrap",gap:6}}>{suggestions.map((s,i)=><button key={i} onClick={()=>setInput(s)} style={{background:C.eggshell,border:`1px solid ${C.lightGrey}`,borderRadius:2,color:C.charcoal,fontSize:11,padding:"5px 10px",cursor:"pointer"}} onMouseEnter={e=>{e.target.style.borderColor=C.eucalyptus;e.target.style.color=C.eucalyptus;}} onMouseLeave={e=>{e.target.style.borderColor=C.lightGrey;e.target.style.color=C.charcoal;}}>{s}</button>)}</div>}
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.lightGrey}`,display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about markets, reports, strategy, or how things work..." style={{flex:1,background:C.white,border:`1px solid ${C.lightGrey}`,borderRadius:3,padding:"10px 14px",color:C.charcoal,fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.eucalyptus} onBlur={e=>e.target.style.borderColor=C.lightGrey}/>
          <button onClick={send} disabled={loading} style={{background:loading?C.lightGrey:C.eucalyptus,border:"none",borderRadius:3,padding:"10px 18px",cursor:loading?"not-allowed":"pointer",color:C.white,fontWeight:700,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{loading?"...":"ASK →"}</button>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE
// ─────────────────────────────────────────────────────────────────────────────
function HomePage(){
  const [brief,setBrief]=useState("");
  const [briefLoading,setBriefLoading]=useState(false);
  const [briefDone,setBriefDone]=useState(false);
  async function genBrief(){
    setBriefLoading(true); setBrief("");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:"You are Muster's Ag market analyst writing a concise morning briefing for a commodity trader in Australia. Be direct, sharp, and educational. Cover the 3–4 most important things happening in Ag markets today. Reference actual data. Max 4 short paragraphs. Plain English.",messages:[{role:"user",content:`Write today's Ag market morning brief (${new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}) based on: Corn +0.79% (478.25¢), Wheat -1.37% (592.50¢), Soybeans +1.16% (1087.75¢), Live Cattle +0.48% (184.325¢), Lean Hogs -1.32% (91.275¢). Key stories: Plains drought worsening D2/D3, China cancelled 3 corn cargoes, USDA raised Brazil soy estimate to 169.5 MMT, La Niña watch issued by NOAA, Cattle placements above expectations. DXY soft at 104.23. Next WASDE: Tuesday Apr 8.`}]})});
      const data=await res.json();
      setBrief(data.content?.map(b=>b.text||"").join("")||"Could not generate brief.");
      setBriefDone(true);
    }catch{setBrief("Connection error.");}
    setBriefLoading(false);
  }
  const sectors=["Grains","Oilseeds","Livestock"];
  const alertRegions=WEATHER_DATA.filter(w=>w.severity==="severe"||w.severity==="moderate").slice(0,3);
  const homeCurrencies=CURRENCIES_DATA.filter(c=>["DXY","USD/BRL","AUD/USD"].includes(c.pair));
  return (
    <div style={{maxWidth:1400,margin:"0 auto"}}>

      {/* Morning Brief */}
      <Card style={{padding:24,borderLeft:`4px solid ${C.wheat}`,marginBottom:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:brief||briefLoading?16:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>☀️</span>
            <div>
              <div style={{color:C.charcoal,fontSize:15,fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>Morning Market Brief</div>
              <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:2}}>{new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
            </div>
          </div>
          <button onClick={genBrief} disabled={briefLoading} style={{background:briefLoading?C.lightGrey:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"9px 18px",cursor:briefLoading?"not-allowed":"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:"0.05em",flexShrink:0}}>
            {briefLoading?"GENERATING…":briefDone?"↺ REFRESH":"GENERATE BRIEF →"}
          </button>
        </div>
        {briefLoading&&<div style={{color:C.wheatDark,fontSize:12,fontFamily:"'DM Mono',monospace"}}><span style={{animation:"blink 1s infinite"}}>▋</span> Analysing today's markets…</div>}
        {brief&&<div style={{color:C.charcoal,fontSize:13,lineHeight:1.8,fontFamily:"'Lora',serif"}}>{brief}</div>}
        {!brief&&!briefLoading&&<div style={{color:C.wheatDark,fontSize:12,fontFamily:"'IBM Plex Sans',sans-serif"}}>Get an AI-generated summary of what's moving Ag markets today — grains, livestock, weather, and what to watch.</div>}
      </Card>

      {/* Futures Prices */}
      <div style={{marginBottom:28}}>
        <SectionHead label="FUTURES PRICES — CME GROUP" sub="Simulated · Barchart API hook ready"/>
        {sectors.map(sector=>(
          <div key={sector} style={{marginBottom:14}}>
            <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.14em",marginBottom:8}}>{sector.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${COMMODITIES.filter(c=>c.sector===sector).length},1fr)`,gap:10,alignItems:"stretch"}}>
              {COMMODITIES.filter(c=>c.sector===sector).map(c=>{
                const p=PRICES[c.symbol]; const up=p.pct>=0; const sig=SIGNALS[c.symbol];
                return (
                  <Card key={c.symbol} style={{padding:16,borderTop:`3px solid ${c.color}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18}}>{c.emoji}</span><div><div style={{color:C.charcoal,fontSize:12,fontWeight:700}}>{c.name}</div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{c.symbol}</div></div></div>
                      <SignalPill signal={sig.overall}/>
                    </div>
                    <div style={{color:C.navy,fontSize:23,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:1}}>{p.price.toFixed(2)}</div>
                    <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:10}}>{c.unit}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{color:up?C.eucalyptus:C.negative,fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{up?"+":""}{p.pct.toFixed(2)}%</span>
                      <span style={{color:up?C.eucalyptus:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{up?"+":""}{p.change.toFixed(2)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>H {p.high.toFixed(2)}</span>
                      <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>L {p.low.toFixed(2)}</span>
                      <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>V {p.vol}</span>
                    </div>
                    <div style={{height:3,background:C.lightGrey,borderRadius:2,position:"relative"}}>
                      <div style={{position:"absolute",left:`${Math.max(0,Math.min(100,((p.price-p.low)/(p.high-p.low)*100)))}%`,transform:"translateX(-50%)",width:7,height:7,borderRadius:"50%",background:c.color,top:-2}}/>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Scorecard strip */}
      <div style={{marginBottom:28}}>
        <SectionHead label="SIGNAL SCORECARD" sub="Multi-variable model · 6 commodities"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,alignItems:"stretch"}}>
          {COMMODITIES.map(c=>{
            const s=SIGNALS[c.symbol]; const sc=s.score>=65?C.eucalyptus:s.score>=45?C.warning:C.negative;
            return (
              <Card key={c.symbol} style={{padding:14,textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:6}}>{c.emoji}</div>
                <div style={{color:C.charcoal,fontSize:11,fontWeight:600,marginBottom:8}}>{c.name}</div>
                <SignalPill signal={s.overall}/>
                <div style={{marginTop:10,height:4,background:C.lightGrey,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${s.score}%`,background:sc,borderRadius:2}}/></div>
                <div style={{color:sc,fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700,marginTop:5}}>{s.score}</div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom: News + Sidebar */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20,alignItems:"start"}}>

        {/* Top 5 news */}
        <div style={{display:"flex",flexDirection:"column",alignSelf:"stretch"}}>
          <SectionHead label="TOP STORIES" sub="Click headline to read full article"/>
          <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
            {NEWS.slice(0,5).map(n=>(
              <Card key={n.id} style={{borderLeft:`3px solid ${n.bullish?C.eucalyptus:C.negative}`,padding:"13px 16px",display:"flex",flexDirection:"column",flex:1}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:n.bullish?C.eucalyptus:C.negative,flexShrink:0}}>{n.tag}</span>
                  {n.hot&&<span style={{color:C.warning,fontSize:10}}>🔥</span>}
                  <span style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{n.time}</span>
                </div>
                <a href={n.url} target="_blank" rel="noopener noreferrer"
                  style={{color:C.charcoal,fontSize:13,lineHeight:1.55,textDecoration:"none",display:"block",fontFamily:"'Lora',serif",fontWeight:500,flex:1}}
                  onMouseEnter={e=>e.target.style.color=C.eucalyptus}
                  onMouseLeave={e=>e.target.style.color=C.charcoal}>{n.headline}</a>
                <a href={n.url} target="_blank" rel="noopener noreferrer"
                  style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",textDecoration:"none",marginTop:"auto",paddingTop:8,alignSelf:"flex-end"}}
                  onMouseEnter={e=>e.target.style.textDecoration="underline"}
                  onMouseLeave={e=>e.target.style.textDecoration="none"}>{n.source} →</a>
              </Card>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:16,position:"sticky",top:0,maxHeight:"calc(100vh - 160px)",overflowY:"auto"}}>

          {/* Upcoming reports */}
          <div>
            <SectionHead label="UPCOMING REPORTS"/>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {REPORT_CALENDAR.slice(0,4).map((r,i)=>(
                <Card key={i} style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderLeft:`3px solid ${i===0?C.eucalyptus:C.lightGrey}`}}>
                  <div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      style={{color:C.charcoal,fontSize:12,fontWeight:600,textDecoration:"none"}}
                      onMouseEnter={e=>e.target.style.color=C.eucalyptus}
                      onMouseLeave={e=>e.target.style.color=C.charcoal}>{r.name}</a>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                      <ImpBadge level={r.importance}/>
                      <span style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{r.date}</span>
                    </div>
                  </div>
                  <span style={{color:i===0?C.eucalyptus:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:i===0?700:400,flexShrink:0,marginLeft:8}}>{r.countdown}</span>
                </Card>
              ))}
            </div>
          </div>

          {/* Weather alerts — severe & moderate only */}
          <div>
            <SectionHead label="WEATHER ALERTS" sub="Severe & moderate regions"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>
              {alertRegions.length===0&&(
                <Card style={{padding:"10px 14px"}}>
                  <span style={{color:C.eucalyptus,fontSize:11,fontFamily:"'DM Mono',monospace"}}>✓ No severe or moderate alerts</span>
                </Card>
              )}
              {alertRegions.map((w,i)=>{
                const col=w.severity==="severe"?C.negative:C.warning;
                const bull=w.impact.toLowerCase().startsWith("bull");
                return (
                  <Card key={i} style={{padding:"10px 14px",borderLeft:`3px solid ${col}`,display:"flex",flexDirection:"column",minHeight:120}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <span style={{fontSize:16,flexShrink:0}}>{w.icon}</span>
                      <span style={{color:C.charcoal,fontSize:11,fontWeight:600}}>{w.region}</span>
                      <span style={{color:col,fontSize:8,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:"0.06em"}}>{w.severity.toUpperCase()}</span>
                    </div>
                    <div style={{color:C.charcoal,fontSize:10,lineHeight:1.35,flex:1}}>{w.detail}</div>
                    <span style={{color:bull?C.eucalyptus:C.negative,fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:600,marginTop:8}}>{w.impact}</span>
                  </Card>
                );
              })}
              <Card style={{padding:"8px 14px",background:C.navyPale,border:`1px solid ${C.navy}22`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:C.navy,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600}}>ENSO: La Niña Watch</div>
                    <div style={{color:C.charcoal,fontSize:10,marginTop:1}}>ONI −0.4°C · 60% chance Jun–Aug</div>
                  </div>
                  <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/" target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",textDecoration:"none"}}>NOAA →</a>
                </div>
              </Card>
            </div>
          </div>

          {/* 3-currency strip */}
          <div>
            <SectionHead label="KEY CURRENCIES" sub="DXY · BRL · AUD"/>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {homeCurrencies.map((c,i)=>{
                const hasData=c.value!=null;
                const moveIsGood=c.pct!=null&&((c.pct>0&&c.upIsBullish)||(c.pct<0&&!c.upIsBullish));
                const moveColor=c.pct==null?C.wheatDark:moveIsGood?C.eucalyptus:C.negative;
                return (
                  <Card key={i} style={{padding:"11px 14px",display:"flex",flexDirection:"column",justifyContent:"space-between",borderLeft:`3px solid ${hasData?(moveIsGood?C.eucalyptus:C.negative):C.lightGrey}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div>
                        <div style={{color:C.charcoal,fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{c.pair}</div>
                        <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginTop:1}}>{c.name}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:C.charcoal,fontSize:15,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{hasData?c.value:"—"}</div>
                        {c.pct!=null&&<div style={{color:moveColor,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{c.pct>=0?"+":""}{c.pct.toFixed(2)}%</div>}
                      </div>
                    </div>
                    <div style={{fontSize:10,fontFamily:"'IBM Plex Sans',sans-serif",color:C.charcoal,lineHeight:1.4}}>{(c.relevance||'').split('.')[0]}.</div>
                  </Card>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLY & DEMAND TAB
// ─────────────────────────────────────────────────────────────────────────────
function SupplyDemand(){
  const [active,setActive]=useState("corn");
  const d=WASDE_DATA[active];
  return (
    <div>
      <SectionHead label="SUPPLY & DEMAND — WASDE BALANCE SHEETS" sub="USDA World Agricultural Supply and Demand Estimates"/>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {Object.keys(WASDE_DATA).map(k=><button key={k} onClick={()=>setActive(k)} style={{background:active===k?C.eucalyptus:C.white,color:active===k?C.white:C.charcoal,border:`1px solid ${active===k?C.eucalyptus:C.lightGrey}`,borderRadius:3,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace",textTransform:"capitalize"}}>{k}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Card style={{padding:20}}>
          <div style={{color:C.charcoal,fontSize:14,fontWeight:700,marginBottom:16,textTransform:"capitalize"}}>{active} — Global Balance Sheet (Mar 2026)</div>
          {[["Global Production",`${d.global_prod} MMT`,null],["US Production",`${d.us_prod} MMT`,null],["US Exports",`${d.us_exports} MMT`,null],["Global Ending Stocks",`${d.global_stocks} MMT`,null],["Stocks-to-Use Ratio",`${d.stur}%`,d.trend==="down"?"▼ Tightening — BULLISH":"▲ Building — BEARISH"],["Previous S/U Ratio",`${d.prev_stur}%`,null]].map(([l,v,n])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",padding:"9px 0",borderBottom:`1px solid ${C.lightGrey}`}}>
              <span style={{color:C.charcoal,fontSize:12}}>{l}</span>
              <div style={{textAlign:"right"}}>
                <span style={{color:C.navy,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</span>
                {n&&<div style={{color:d.trend==="down"?C.eucalyptus:C.negative,fontSize:9,fontFamily:"'DM Mono',monospace",marginTop:2}}>{n}</div>}
              </div>
            </div>
          ))}
          <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:10}}>Source: <a href="https://www.usda.gov/oce/commodity/wasde/" target="_blank" rel="noopener noreferrer" style={{color:C.wheat}}>USDA WASDE March 2026 →</a></div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:16}}>
            <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:8}}>What does this mean for prices?</div>
            <div style={{color:C.charcoal,fontSize:12,lineHeight:1.65,fontFamily:"'Lora',serif"}}>{d.trend==="down"?`A falling stocks-to-use ratio (${d.prev_stur}% → ${d.stur}%) means global supply is being drawn down faster than it's replenished. Tighter supplies generally support or lift prices — the market needs to ration demand.`:`A rising stocks-to-use ratio (${d.prev_stur}% → ${d.stur}%) means supply is growing relative to demand. Building stocks tend to cap or push down prices — plenty of supply available.`}</div>
          </Card>
          <Card style={{padding:16}}>
            <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:8}}>Export Pace vs USDA Target</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.charcoal,fontSize:12}}>Inspections YTD</span><span style={{color:C.navy,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{(d.us_exports*0.72).toFixed(1)} MMT</span></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.charcoal,fontSize:12}}>USDA Annual Target</span><span style={{color:C.navy,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{d.us_exports} MMT</span></div>
            <div style={{height:8,background:C.lightGrey,borderRadius:4}}><div style={{height:"100%",width:"72%",background:C.eucalyptus,borderRadius:4}}/></div>
            <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:4}}>72% of target with ~28 weeks remaining — on pace</div>
            <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:8}}><a href="https://apps.fas.usda.gov/export-sales/esrd1.html" target="_blank" rel="noopener noreferrer" style={{color:C.wheat}}>USDA Export Sales →</a></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASONALS TAB (simple)
// ─────────────────────────────────────────────────────────────────────────────
function Seasonals(){
  const [activeSym,setActiveSym]=useState("ZC");
  const avg=SEASONAL_DATA[activeSym]||SEASONAL_DATA.ZC;
  const cur=avg.map((v,i)=>v+(Math.sin(i*0.4)*4)+(i>20?-5:3));
  const comm=COMMODITIES.find(c=>c.symbol===activeSym);
  const W=700,H=180,PAD={t:10,b:24,l:8,r:8};
  const allV=[...avg,...cur]; const minV=Math.min(...allV)-1; const maxV=Math.max(...allV)+1;
  const px=i=>PAD.l+(i/(avg.length-1))*(W-PAD.l-PAD.r);
  const py=v=>PAD.t+(1-(v-minV)/(maxV-minV))*(H-PAD.t-PAD.b);
  const path1=cur.map((v,i)=>`${i===0?"M":"L"}${px(i)},${py(v)}`).join(" ");
  const path2=avg.map((v,i)=>`${i===0?"M":"L"}${px(i)},${py(v)}`).join(" ");
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div>
      <SectionHead label="SEASONAL TENDENCY CHARTS" sub="Current year vs 10-year average — weekly price index (rebased to 100)"/>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {Object.keys(SEASONAL_DATA).map(sym=>{const c=COMMODITIES.find(x=>x.symbol===sym); return <button key={sym} onClick={()=>setActiveSym(sym)} style={{background:activeSym===sym?C.navy:C.white,color:activeSym===sym?C.white:C.charcoal,border:`1px solid ${activeSym===sym?C.navy:C.lightGrey}`,borderRadius:3,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace"}}>{c?.emoji} {c?.name||sym}</button>; })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18}}>
        <Card style={{padding:20}}>
          <div style={{color:C.charcoal,fontSize:13,fontWeight:700,marginBottom:14}}>{comm?.name} — Seasonal Price Tendency</div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}} preserveAspectRatio="none">
            {[0,0.25,0.5,0.75,1].map(f=><line key={f} x1={PAD.l} y1={PAD.t+f*(H-PAD.t-PAD.b)} x2={W-PAD.r} y2={PAD.t+f*(H-PAD.t-PAD.b)} stroke={C.lightGrey} strokeWidth="0.5"/>)}
            <path d={path2} fill="none" stroke={C.wheat} strokeWidth="1.5" strokeDasharray="5,3"/>
            <path d={path1} fill="none" stroke={C.navy} strokeWidth="2"/>
            <rect x={PAD.l} y={PAD.t} width={140} height={16} fill="white" opacity="0.9"/>
            <line x1={PAD.l+4} y1={PAD.t+8} x2={PAD.l+18} y2={PAD.t+8} stroke={C.navy} strokeWidth="2"/><text x={PAD.l+22} y={PAD.t+11} fill={C.charcoal} fontSize="7" fontFamily="monospace">2026</text>
            <line x1={PAD.l+58} y1={PAD.t+8} x2={PAD.l+72} y2={PAD.t+8} stroke={C.wheat} strokeWidth="1.5" strokeDasharray="4,2"/><text x={PAD.l+76} y={PAD.t+11} fill={C.charcoal} fontSize="7" fontFamily="monospace">10yr Avg</text>
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
            {months.map(m=><span key={m} style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{m}</span>)}
          </div>
        </Card>
        <Card style={{padding:16,background:C.offwhite}}>
          <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:8}}>Seasonal Context</div>
          <div style={{color:C.charcoal,fontSize:12,lineHeight:1.65,fontFamily:"'Lora',serif"}}>
            {activeSym==="ZC"&&"Corn typically bottoms around harvest (Oct–Nov) and rallies into summer as weather uncertainty builds. The critical weather window (pollination) is Jun–Jul — this is where the biggest seasonal volatility occurs."}
            {activeSym==="ZW"&&"Wheat seasonally peaks in late spring/early summer ahead of Northern Hemisphere harvest, then declines through July. Plains drought currently supporting a rally above the seasonal average."}
            {activeSym==="ZS"&&"Soybeans typically rally from Jan through July on Southern Hemisphere uncertainty, then soften into US harvest. Brazilian crop condition (Jan–Mar) and US planting progress (May–Jun) are the two most important seasonal catalysts."}
            {activeSym==="LE"&&"Live cattle exhibit a strong seasonal pattern tied to grilling demand (Apr–Sep). Current tight supply conditions are supporting a rally above the seasonal average."}
          </div>
          <div style={{marginTop:12,color:C.charcoal,fontSize:11,lineHeight:1.6}}>Seasonal patterns reflect typical supply/demand rhythms. When current year deviates significantly from the average, it signals unusual fundamental conditions — a weather event, policy change, or demand shock.</div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COT CHARTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function COTCharts(){
  const [active,setActive]=useState("corn");
  const data=COT_HISTORY[active]; const latest=data[data.length-1]; const prev=data[data.length-2]; const change=latest-prev;
  const max=Math.max(...data.map(Math.abs));
  return (
    <div>
      <SectionHead label="COT — COMMITMENTS OF TRADERS" sub="CFTC managed money net positions — 6 month history"/>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {["corn","wheat","soybeans","cattle"].map(k=><button key={k} onClick={()=>setActive(k)} style={{background:active===k?C.navy:C.white,color:active===k?C.white:C.charcoal,border:`1px solid ${active===k?C.navy:C.lightGrey}`,borderRadius:3,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace",textTransform:"capitalize"}}>{k}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18}}>
        <Card style={{padding:20}}>
          <div style={{color:C.charcoal,fontSize:13,fontWeight:700,marginBottom:4,textTransform:"capitalize"}}>{active} — Managed Money Net Position</div>
          <div style={{color:C.wheatDark,fontSize:11,marginBottom:16}}>Positive = net long (funds betting on higher prices) · Negative = net short</div>
          {COT_HISTORY.labels.map((lbl,i)=>{
            const val=data[i]; const up=val>=0; const pct=(Math.abs(val)/max)*100;
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                <span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",width:28,flexShrink:0}}>{lbl}</span>
                <div style={{flex:1,height:14,background:C.lightGrey,borderRadius:2,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",[up?"left":"right"]:0,width:`${pct/2}%`,height:"100%",background:up?C.eucalyptus:C.negative,borderRadius:2}}/>
                </div>
                <span style={{color:up?C.eucalyptus:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace",width:80,textAlign:"right",flexShrink:0,fontWeight:600}}>{up?"+":""}{val.toLocaleString()}</span>
              </div>
            );
          })}
          <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:12}}>Source: <a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener noreferrer" style={{color:C.wheat}}>CFTC COT Report →</a></div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:14}}>
            <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:10}}>Current Snapshot</div>
            {[["Latest Net Position",`${latest>0?"+":""}${latest.toLocaleString()} contracts`,latest>0?C.eucalyptus:C.negative],["Week-on-Week",`${change>0?"+":""}${change.toLocaleString()}`,change>0?C.eucalyptus:C.negative],["Fund Bias",latest>0?"NET LONG":"NET SHORT",latest>0?C.eucalyptus:C.negative],["Extreme?",Math.abs(latest)>100000?"YES ⚠":"No",Math.abs(latest)>100000?C.negative:C.charcoal]].map(([l,v,c])=>(
              <div key={l} style={{padding:"7px 0",borderBottom:`1px solid ${C.lightGrey}`}}>
                <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l}</div>
                <div style={{color:c||C.charcoal,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</div>
              </div>
            ))}
          </Card>
          <Card style={{padding:14,background:C.offwhite}}>
            <div style={{color:C.charcoal,fontSize:11,fontWeight:600,marginBottom:6}}>Reading the COT</div>
            <div style={{color:C.charcoal,fontSize:11,lineHeight:1.6}}>When managed money builds extreme net short positions, it often precedes a reversal — funds need to exit, and their unwinding drives price moves in the opposite direction. The COT is a contrarian tool.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORECARD TAB
// ─────────────────────────────────────────────────────────────────────────────
function Scorecard(){
  const [active,setActive]=useState("ZW");
  const data=SIGNALS[active]; const comm=COMMODITIES.find(c=>c.symbol===active);
  return (
    <div>
      <SectionHead label="COMMODITY SCORECARD" sub="Multi-variable signal model — weighted across all key drivers"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22,alignItems:"stretch"}}>
        {COMMODITIES.map(c=>{const d=SIGNALS[c.symbol]; const isActive=active===c.symbol; return (
          <Card key={c.symbol} onClick={()=>setActive(c.symbol)} style={{padding:14,cursor:"pointer",border:`2px solid ${isActive?C.eucalyptus:C.lightGrey}`,transition:"all 0.2s",boxShadow:isActive?"0 2px 12px rgba(47,79,62,0.15)":"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>{c.emoji}</span><span style={{color:C.charcoal,fontSize:13,fontWeight:600}}>{c.name}</span></div><SignalPill signal={d.overall} size="lg"/></div>
            <ScoreBar score={d.score}/>
            <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginTop:4}}>Score: {d.score}/100</div>
          </Card>
        );})}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18}}>
        <Card style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:26}}>{comm?.emoji}</span><div><div style={{color:C.charcoal,fontSize:15,fontWeight:700}}>{comm?.name} Scorecard</div><div style={{color:C.wheatDark,fontSize:11,fontFamily:"'DM Mono',monospace"}}>Current: {PRICES[active]?.price.toFixed(2)} {comm?.unit}</div></div></div>
            <SignalPill signal={data.overall} size="lg"/>
          </div>
          <div style={{marginBottom:14}}><div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:6}}>COMPOSITE SCORE</div><ScoreBar score={data.score}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{color:C.negative,fontSize:9,fontFamily:"'DM Mono',monospace"}}>0 — BEARISH</span><span style={{color:C.warning,fontSize:9,fontFamily:"'DM Mono',monospace"}}>50 — NEUTRAL</span><span style={{color:C.eucalyptus,fontSize:9,fontFamily:"'DM Mono',monospace"}}>100 — BULLISH</span></div></div>
          {data.vars.map((v,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"9px 0",borderBottom:`1px solid ${C.lightGrey}`}}>
              <SignalPill signal={v.signal}/>
              <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{color:C.charcoal,fontSize:12,fontWeight:500}}>{v.name}</span><span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{v.weight}%</span></div><div style={{color:C.charcoal,fontSize:11,lineHeight:1.35}}>{v.note}</div></div>
            </div>
          ))}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:14}}>
            <div style={{color:C.charcoal,fontSize:12,fontWeight:600,marginBottom:10}}>Signal Summary</div>
            {["BULLISH","NEUTRAL","BEARISH"].map(sig=>{
              const count=data.vars.filter(v=>v.signal===sig).length; const totalW=data.vars.filter(v=>v.signal===sig).reduce((s,v)=>s+v.weight,0);
              const cfg={BULLISH:{c:C.eucalyptus,bg:C.eucalyptusPale},NEUTRAL:{c:C.warning,bg:C.warningPale},BEARISH:{c:C.negative,bg:C.negativePale}}[sig];
              return <div key={sig} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:cfg.bg,borderRadius:3,marginBottom:5}}><span style={{color:cfg.c,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{sig}</span><span style={{color:cfg.c,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{count} vars · {totalW}%</span></div>;
            })}
          </Card>
          <Card style={{padding:14,background:C.offwhite}}>
            <div style={{color:C.charcoal,fontSize:11,fontWeight:600,marginBottom:6}}>How it works</div>
            <div style={{color:C.charcoal,fontSize:11,lineHeight:1.6}}>Each variable is scored BULLISH, NEUTRAL, or BEARISH based on current data, then weighted by its typical market importance. The composite score reflects the balance of evidence — not a recommendation.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO TRACKER
// ─────────────────────────────────────────────────────────────────────────────
function Portfolio(){
  const defaultPos=[
    {id:1,commodity:"ZW",direction:"LONG", contracts:2,entryPrice:584.25,stopLoss:570.00,target:615.00,entryDate:"Mar 20",thesis:"Plains drought + fund short squeeze setup",status:"open"},
    {id:2,commodity:"LE",direction:"LONG", contracts:1,entryPrice:182.50,stopLoss:178.00,target:192.00,entryDate:"Mar 25",thesis:"Tight supply + seasonal grilling demand",status:"open"},
    {id:3,commodity:"ZC",direction:"SHORT",contracts:1,entryPrice:485.00,stopLoss:495.00,target:462.00,entryDate:"Mar 28",thesis:"China demand risk + harvest pressure",status:"open"},
    {id:4,commodity:"ZS",direction:"LONG", contracts:2,entryPrice:1072.00,stopLoss:1055.00,target:1110.00,entryDate:"Mar 15",thesis:"ARG weather risk + fund support",status:"closed",closePrice:1087.75,closePnl:3150},
  ];
  const [positions,setPositions]=useState(defaultPos);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({commodity:"ZC",direction:"LONG",contracts:1,entryPrice:"",stopLoss:"",target:"",thesis:""});
  function calcPnL(pos){const cur=PRICES[pos.commodity]?.price||pos.entryPrice;const cs={ZC:5000,ZW:5000,ZS:5000,ZM:100,LE:400,HE:400}[pos.commodity]||1000;const diff=pos.direction==="LONG"?cur-pos.entryPrice:pos.entryPrice-cur;return diff*cs*pos.contracts/100;}
  function calcRR(pos){if(!pos.target||!pos.stopLoss)return"—";const r=Math.abs(pos.entryPrice-pos.stopLoss);const rw=Math.abs(pos.target-pos.entryPrice);return r>0?(rw/r).toFixed(1)+":1":"—";}
  function add(){if(!form.entryPrice)return;setPositions(p=>[...p,{...form,id:Date.now(),entryDate:"Today",status:"open",contracts:parseInt(form.contracts)||1,entryPrice:parseFloat(form.entryPrice),stopLoss:parseFloat(form.stopLoss)||0,target:parseFloat(form.target)||0}]);setForm({commodity:"ZC",direction:"LONG",contracts:1,entryPrice:"",stopLoss:"",target:"",thesis:""});setShowAdd(false);}
  function close(id){setPositions(p=>p.map(x=>x.id===id?{...x,status:"closed",closePrice:PRICES[x.commodity]?.price,closePnl:calcPnL(x)}:x));}
  const open=positions.filter(p=>p.status==="open"); const closed=positions.filter(p=>p.status==="closed");
  const totalOpenPnL=open.reduce((s,p)=>s+calcPnL(p),0); const totalClosedPnL=closed.reduce((s,p)=>s+(p.closePnl||0),0);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <SectionHead label="PORTFOLIO TRACKER" sub="Track open positions against model signals · Simulated P&L"/>
        <button onClick={()=>setShowAdd(!showAdd)} style={{background:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"7px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:18}}>+ NEW POSITION</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20,alignItems:"stretch"}}>
        {[{l:"OPEN POSITIONS",v:open.length,c:C.navy},{l:"OPEN P&L (SIM)",v:`${totalOpenPnL>=0?"+":""}$${Math.abs(totalOpenPnL).toFixed(0)}`,c:totalOpenPnL>=0?C.eucalyptus:C.negative},{l:"CLOSED P&L (SIM)",v:`${totalClosedPnL>=0?"+":""}$${Math.abs(totalClosedPnL).toFixed(0)}`,c:totalClosedPnL>=0?C.eucalyptus:C.negative},{l:"WIN RATE",v:closed.length>0?`${Math.round(closed.filter(p=>p.closePnl>0).length/closed.length*100)}%`:"—",c:C.charcoal}].map((s,i)=>(
          <Card key={i} style={{padding:14}}><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",marginBottom:5}}>{s.l}</div><div style={{color:s.c,fontSize:22,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{s.v}</div></Card>
        ))}
      </div>
      {showAdd&&(
        <Card style={{padding:18,marginBottom:16,border:`1px solid ${C.wheat}`,background:C.wheatPale}}>
          <div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:12}}>LOG NEW POSITION</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
            {[{l:"Commodity",el:<select value={form.commodity} onChange={e=>setForm(p=>({...p,commodity:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{COMMODITIES.map(c=><option key={c.symbol} value={c.symbol}>{c.emoji} {c.name}</option>)}</select>},
              {l:"Direction",el:<select value={form.direction} onChange={e=>setForm(p=>({...p,direction:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}><option>LONG</option><option>SHORT</option></select>},
              {l:"Contracts",el:<input type="number" value={form.contracts} onChange={e=>setForm(p=>({...p,contracts:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>},
              {l:"Entry Price",el:<input type="number" placeholder="e.g. 478.25" value={form.entryPrice} onChange={e=>setForm(p=>({...p,entryPrice:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>},
              {l:"Stop Loss", el:<input type="number" placeholder="e.g. 465.00" value={form.stopLoss} onChange={e=>setForm(p=>({...p,stopLoss:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>},
              {l:"Target",    el:<input type="number" placeholder="e.g. 500.00" value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>},
            ].map(({l,el},i)=><div key={i}><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{l.toUpperCase()}</div>{el}</div>)}
          </div>
          <div style={{marginBottom:10}}><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:4}}>TRADE THESIS</div><textarea value={form.thesis} onChange={e=>setForm(p=>({...p,thesis:e.target.value}))} rows={2} placeholder="Why are you taking this trade?" style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,color:C.charcoal,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:8}}><button onClick={add} style={{background:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"8px 16px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>SAVE</button><button onClick={()=>setShowAdd(false)} style={{background:C.white,color:C.charcoal,border:`1px solid ${C.lightGrey}`,borderRadius:3,padding:"8px 16px",cursor:"pointer",fontSize:11}}>CANCEL</button></div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {open.map(pos=>{
          const pnl=calcPnL(pos); const up=pnl>=0; const cur=PRICES[pos.commodity]?.price||pos.entryPrice; const comm=COMMODITIES.find(c=>c.symbol===pos.commodity); const sig=SIGNALS[pos.commodity]; const aligned=(pos.direction==="LONG"&&sig?.overall==="BULLISH")||(pos.direction==="SHORT"&&sig?.overall==="BEARISH");
          return (
            <Card key={pos.id} style={{borderLeft:`4px solid ${up?C.eucalyptus:C.negative}`,padding:18}}>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:14,alignItems:"start"}}>
                <span style={{fontSize:26}}>{comm?.emoji}</span>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{color:C.charcoal,fontSize:14,fontWeight:700}}>{comm?.name}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:pos.direction==="LONG"?C.eucalyptus:C.negative}}>{pos.direction}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",color:C.navy,background:C.navyPale,border:`1px solid ${C.navy}`}}>{pos.contracts} contract{pos.contracts>1?"s":""}</span>
                    <SignalPill signal={sig?.overall}/>
                    {aligned?<span style={{color:C.eucalyptus,fontSize:9,fontFamily:"'DM Mono',monospace"}}>✓ model aligned</span>:<span style={{color:C.warning,fontSize:9,fontFamily:"'DM Mono',monospace"}}>⚠ vs model signal</span>}
                  </div>
                  <div style={{display:"flex",gap:16,marginBottom:8}}>
                    {[["ENTRY",pos.entryPrice.toFixed(2),C.charcoal],["CURRENT",cur.toFixed(2),up?C.eucalyptus:C.negative],["STOP",pos.stopLoss.toFixed(2),C.negative],["TARGET",pos.target.toFixed(2),C.eucalyptus],["R:R",calcRR(pos),C.navy]].map(([l,v,c])=>(
                      <div key={l}><div style={{color:C.lightGrey,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:1}}>{l}</div><div style={{color:c,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</div></div>
                    ))}
                  </div>
                  {pos.thesis&&<div style={{color:C.charcoal,fontSize:12,fontStyle:"italic",padding:"6px 10px",background:C.eggshell,borderRadius:2,borderLeft:`2px solid ${C.wheat}`,fontFamily:"'Lora',serif"}}>"{pos.thesis}"</div>}
                  <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:5}}>Entered {pos.entryDate}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:2}}>SIM P&L</div>
                  <div style={{color:up?C.eucalyptus:C.negative,fontSize:20,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{up?"+":"-"}${Math.abs(pnl).toFixed(0)}</div>
                  <div style={{color:up?C.eucalyptus:C.negative,fontSize:11,fontFamily:"'DM Mono',monospace",marginBottom:10}}>{up?"+":""}{((cur-pos.entryPrice)/pos.entryPrice*100).toFixed(2)}%</div>
                  <button onClick={()=>close(pos.id)} style={{background:C.eggshell,color:C.charcoal,border:`1px solid ${C.lightGrey}`,borderRadius:2,padding:"5px 12px",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace"}}>CLOSE</button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {closed.length>0&&(
        <div>
          <SectionHead label="CLOSED POSITIONS"/>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {closed.map(pos=>{const comm=COMMODITIES.find(c=>c.symbol===pos.commodity);const win=(pos.closePnl||0)>=0;return(
              <Card key={pos.id} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,opacity:0.85}}>
                <span style={{fontSize:20}}>{comm?.emoji}</span>
                <div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}><span style={{color:C.charcoal,fontSize:13,fontWeight:600}}>{comm?.name}</span><span style={{fontSize:9,padding:"2px 6px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:pos.direction==="LONG"?C.eucalyptus:C.negative}}>{pos.direction}</span><span style={{color:C.wheatDark,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{pos.entryDate}</span></div><div style={{color:C.charcoal,fontSize:11,fontStyle:"italic"}}>{pos.thesis}</div></div>
                <div style={{textAlign:"right"}}><div style={{color:win?C.eucalyptus:C.negative,fontSize:16,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{win?"+":"-"}${Math.abs(pos.closePnl||0).toFixed(0)}</div><div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>@ {pos.closePrice?.toFixed(2)}</div></div>
              </Card>
            );})}
          </div>
        </div>
      )}
      <div style={{marginTop:14,padding:10,background:C.eggshell,border:`1px dashed ${C.lightGrey}`,borderRadius:3}}><span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>⚡ HOOK: Connect Interactive Brokers or Saxo API for real positions and live P&L.</span></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AG EQUITIES TAB
// ─────────────────────────────────────────────────────────────────────────────
function AgEquities(){
  const [sector,setSector]=useState("All");
  const sectors=["All",...new Set(AG_EQUITIES.map(e=>e.sector))];
  const filtered=sector==="All"?AG_EQUITIES:AG_EQUITIES.filter(e=>e.sector===sector);
  return (
    <div>
      <SectionHead label="AG FINANCE & EQUITIES" sub="Agribusiness watchlist — grain merchants, fertiliser, machinery, chemicals"/>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {sectors.map(s=><button key={s} onClick={()=>setSector(s)} style={{background:sector===s?C.navy:C.white,color:sector===s?C.white:C.charcoal,border:`1px solid ${sector===s?C.navy:C.lightGrey}`,borderRadius:3,padding:"6px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace"}}>{s}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12,marginBottom:22,alignItems:"stretch"}}>
        {filtered.map(eq=>{const up=eq.pct>=0;return(
          <Card key={eq.ticker} style={{padding:18,transition:"box-shadow 0.2s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{color:C.navy,fontSize:15,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{eq.ticker}</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.navy,background:C.navyPale,border:`1px solid ${C.navy}`}}>{eq.sector}</span></div><div style={{color:C.charcoal,fontSize:12}}>{eq.name}</div></div>
              <div style={{textAlign:"right"}}><div style={{color:C.charcoal,fontSize:18,fontFamily:"'DM Mono',monospace",fontWeight:700}}>${eq.price}</div><div style={{color:up?C.eucalyptus:C.negative,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{up?"+":""}{eq.pct.toFixed(2)}%</div><div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{eq.mktCap}</div></div>
            </div>
            <div style={{color:C.charcoal,fontSize:12,lineHeight:1.5,marginBottom:8}}>{eq.desc}</div>
            <div style={{padding:"7px 10px",background:C.eucalyptusPale,borderRadius:2,borderLeft:`3px solid ${C.eucalyptus}`,marginBottom:8}}><div style={{color:C.eucalyptus,fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:2}}>AG MARKET LINK</div><div style={{color:C.charcoal,fontSize:11,lineHeight:1.4}}>{eq.agLink}</div></div>
            <a href={eq.url} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none"}} onMouseEnter={e=>e.target.style.textDecoration="underline"} onMouseLeave={e=>e.target.style.textDecoration="none"}>Investor relations →</a>
          </Card>
        );})}
      </div>
      <div style={{padding:10,background:C.offwhite,border:`1px dashed ${C.lightGrey}`,borderRadius:3}}><span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>⚡ HOOK: Add Polygon.io or Alpha Vantage key for live equity prices, real-time quotes, and earnings calendar.</span></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDUCATION CENTRE
// ─────────────────────────────────────────────────────────────────────────────
function Education(){
  const [activeMod,setActiveMod]=useState(null);
  const [activeSec,setActiveSec]=useState(0);
  const [aiQ,setAiQ]=useState(""); const [aiA,setAiA]=useState(""); const [aiLoading,setAiLoading]=useState(false);
  const levelColor={Beginner:C.eucalyptus,Intermediate:C.warning,Advanced:C.navy};
  async function askAI(){
    if(!aiQ.trim()||aiLoading)return; setAiLoading(true); setAiA("");
    try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:700,system:"You are an agricultural commodity trading educator. The student is new to commodity trading and based in Australia. Give clear, educational answers using real market examples. 3-4 paragraphs max. Reference Australian context where relevant (Interactive Brokers AU, ASX-listed Ag stocks, ABARE, AU wheat exports).",messages:[{role:"user",content:aiQ}]})});const data=await res.json();setAiA(data.content?.map(b=>b.text||"").join("")||"Couldn't get a response.");}catch{setAiA("Connection error.");}
    setAiLoading(false);
  }
  if(activeMod){
    const mod=EDU_MODULES.find(m=>m.id===activeMod);
    if(!mod) return <div style={{color:C.wheatDark,padding:20}}>Module not found.</div>;
    const sec=mod.sections[activeSec]||mod.sections[0];
    if(!sec) return <div style={{color:C.wheatDark,padding:20}}>Section not found.</div>;
    return (
      <div>
        <button onClick={()=>{setActiveMod(null);setActiveSec(0);}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.eucalyptus,cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace",marginBottom:16,padding:0}}>← Back to modules</button>
        <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:18}}>
          <Card style={{padding:12,height:"fit-content"}}>
            <div style={{color:C.charcoal,fontSize:12,fontWeight:700,marginBottom:4}}>{mod.emoji} {mod.title}</div>
            <div style={{display:"flex",gap:5,marginBottom:12}}><span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:levelColor[mod.level]||C.navy}}>{mod.level}</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",color:C.charcoal,background:C.eggshell,border:`1px solid ${C.lightGrey}`}}>{mod.duration}</span></div>
            {mod.sections.map((s,i)=><button key={i} onClick={()=>setActiveSec(i)} style={{background:activeSec===i?C.eucalyptusPale:"none",border:`1px solid ${activeSec===i?C.eucalyptus:C.lightGrey}`,borderRadius:3,padding:"7px 9px",cursor:"pointer",textAlign:"left",color:activeSec===i?C.eucalyptus:C.charcoal,fontSize:11,width:"100%",marginBottom:4}}>{i+1}. {s.heading}</button>)}
          </Card>
          <div>
            <Card style={{padding:22,marginBottom:14}}>
              <div style={{color:C.charcoal,fontSize:16,fontWeight:700,marginBottom:14}}>{sec.heading}</div>
              {(sec.content||'').split("\n\n").map((p,i)=><p key={i} style={{color:C.charcoal,fontSize:13,lineHeight:1.75,marginBottom:12,fontFamily:"'Lora',serif"}}>{p}</p>)}
            </Card>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <button onClick={()=>setActiveSec(s=>Math.max(0,s-1))} disabled={activeSec===0} style={{background:C.white,color:C.charcoal,border:`1px solid ${C.lightGrey}`,borderRadius:3,padding:"8px 16px",cursor:activeSec===0?"not-allowed":"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",opacity:activeSec===0?0.4:1}}>← PREVIOUS</button>
              <button onClick={()=>setActiveSec(s=>Math.min(mod.sections.length-1,s+1))} disabled={activeSec===mod.sections.length-1} style={{background:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"8px 16px",cursor:activeSec===mod.sections.length-1?"not-allowed":"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",opacity:activeSec===mod.sections.length-1?0.4:1}}>NEXT →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <SectionHead label="EDUCATION CENTRE" sub="Structured learning for new commodity traders"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginBottom:26,alignItems:"stretch"}}>
        {EDU_MODULES.map(mod=>(
          <Card key={mod.id} onClick={()=>{setActiveMod(mod.id);setActiveSec(0);}} style={{padding:18,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)";e.currentTarget.style.borderColor=C.eucalyptus;}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.lightGrey;}}>
            <div style={{fontSize:26,marginBottom:8}}>{mod.emoji}</div>
            <div style={{color:C.charcoal,fontSize:13,fontWeight:700,marginBottom:6}}>{mod.title}</div>
            <div style={{display:"flex",gap:6,marginBottom:8}}><span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:levelColor[mod.level]||C.navy}}>{mod.level}</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",color:C.charcoal,background:C.eggshell,border:`1px solid ${C.lightGrey}`}}>{mod.duration}</span></div>
            <div style={{color:C.charcoal,fontSize:11,lineHeight:1.5}}>{mod.sections.length} sections</div>
          </Card>
        ))}
      </div>
      <Card style={{padding:20}}>
        <SectionHead label="ASK THE AI TUTOR" sub="Plain-English explanations of any commodity market concept"/>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={aiQ} onChange={e=>setAiQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} placeholder="e.g. What is basis? How does a crush margin work? What is contango?" style={{flex:1,padding:"10px 14px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:13,color:C.charcoal,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.eucalyptus} onBlur={e=>e.target.style.borderColor=C.lightGrey}/>
          <button onClick={askAI} disabled={aiLoading} style={{background:aiLoading?C.lightGrey:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"10px 18px",cursor:aiLoading?"not-allowed":"pointer",fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{aiLoading?"...":"EXPLAIN →"}</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {["What is basis?","How does a crush margin work?","What is contango vs backwardation?","Explain open interest","What is a limit move?","How do I read a futures quote?"].map((q,i)=>(
            <button key={i} onClick={()=>setAiQ(q)} style={{background:C.eggshell,border:`1px solid ${C.lightGrey}`,borderRadius:2,color:C.charcoal,fontSize:11,padding:"4px 10px",cursor:"pointer"}} onMouseEnter={e=>{e.target.style.borderColor=C.eucalyptus;e.target.style.color=C.eucalyptus;}} onMouseLeave={e=>{e.target.style.borderColor=C.lightGrey;e.target.style.color=C.charcoal;}}>{q}</button>
          ))}
        </div>
        {aiLoading&&<div style={{color:C.wheatDark,fontSize:12,fontFamily:"'DM Mono',monospace"}}><span style={{animation:"blink 1s infinite"}}>▋</span> Composing explanation...</div>}
        {aiA&&<Card style={{padding:16,background:C.eggshell}}><div style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:8,letterSpacing:"0.12em"}}>◆ MUSTER TUTOR</div><div style={{color:C.charcoal,fontSize:13,lineHeight:1.7,fontFamily:"'Lora',serif"}}>{aiA}</div></Card>}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADE JOURNAL
// ─────────────────────────────────────────────────────────────────────────────
function TradeJournal(){
  const defaultEntries=[
    {id:1,date:"Mar 28 2026",commodity:"ZW",direction:"LONG",result:"open",pnl:null,preAnalysis:"Plains drought getting worse — D2/D3 across KS. Fund positioning extreme short. Any weather headline should squeeze. Seasonal supportive. Entry on pullback to 584 resistance-turned-support.",postAnalysis:"",tags:["Weather","COT Squeeze","Seasonal"]},
    {id:2,date:"Mar 15 2026",commodity:"ZS",direction:"LONG",result:"win", pnl:3150,preAnalysis:"ARG weather deteriorating — second crop pampas dry. Fund long building. Brazil crop large but already priced. Tight US basis suggesting demand firm.",postAnalysis:"Thesis played out. ARG weather got worse, triggered a sharp move. Key lesson: the ARG weather story was the catalyst, not the Brazil supply — important to know WHICH driver is moving prices.",tags:["Weather","Fundamental","Brazil/ARG"]},
    {id:3,date:"Feb 20 2026",commodity:"ZC",direction:"SHORT",result:"loss",pnl:-1200,preAnalysis:"China demand weak post-holiday. DXY firm. WASDE bearish corn. Expecting continued pressure lower.",postAnalysis:"Wrong on timing — stopped out by a weather scare that turned out to be nothing. Lesson: even when fundamentals are bearish, short-covering rallies can be violent. Need wider stops or smaller size near potential weather catalyst periods.",tags:["Macro","Mistake","Sizing"]},
  ];
  const [entries,setEntries]=useState(defaultEntries);
  const [showAdd,setShowAdd]=useState(false);
  const [activeEntry,setActiveEntry]=useState(null);
  const [form,setForm]=useState({date:"",commodity:"ZC",direction:"LONG",result:"open",pnl:"",preAnalysis:"",postAnalysis:"",tags:""});
  const [aiReview,setAiReview]=useState(""); const [aiLoading,setAiLoading]=useState(false);
  const [filterTag,setFilterTag]=useState("All");
  const allTags=[...new Set(entries.flatMap(e=>e.tags))];
  const filtered=entries.filter(e=>filterTag==="All"||e.tags.includes(filterTag));
  function add(){setEntries(p=>[...p,{...form,id:Date.now(),pnl:form.pnl?parseFloat(form.pnl):null,tags:(form.tags||'').split(",").map(t=>t.trim()).filter(Boolean),date:form.date||new Date().toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}]);setForm({date:"",commodity:"ZC",direction:"LONG",result:"open",pnl:"",preAnalysis:"",postAnalysis:"",tags:""});setShowAdd(false);}
  async function getReview(entry){
    setAiReview("loading"); setAiLoading(true);
    const comm=COMMODITIES.find(c=>c.symbol===entry.commodity);
    try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:"You are a commodity trading coach reviewing a student's trade journal entry. The student is new to commodity trading. Give constructive, educational feedback on their analysis and thinking. Be specific and actionable. 3 paragraphs max.",messages:[{role:"user",content:`Review this trade: ${comm?.name} ${entry.direction}, Result: ${entry.result}${entry.pnl?` ($${entry.pnl})`:""}.\n\nPre-trade: ${entry.preAnalysis}\n\nPost-trade: ${entry.postAnalysis||"None written."}\n\nReview the quality of thinking, what was done well, and what could be improved.`}]})});const data=await res.json();setAiReview(data.content?.map(b=>b.text||"").join("")||"Couldn't get response.");}catch{setAiReview("Connection error.");}
    setAiLoading(false);
  }
  const wins=entries.filter(e=>e.result==="win").length; const losses=entries.filter(e=>e.result==="loss").length;
  const totalPnl=entries.reduce((s,e)=>s+(e.pnl||0),0);
  const rColor={win:C.eucalyptus,loss:C.negative,open:C.navy}; const rBg={win:C.eucalyptusPale,loss:C.negativePale,open:C.navyPale};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <SectionHead label="TRADE JOURNAL" sub="Log your thinking · Track your calls · Learn from every trade"/>
        <button onClick={()=>setShowAdd(!showAdd)} style={{background:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"7px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:18}}>+ NEW ENTRY</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20,alignItems:"stretch"}}>
        {[{l:"TOTAL TRADES",v:entries.length,c:C.navy},{l:"WIN RATE",v:entries.filter(e=>e.result!=="open").length>0?`${Math.round(wins/(wins+losses)*100)}%`:"—",c:C.eucalyptus},{l:"TOTAL SIM P&L",v:`${totalPnl>=0?"+":""}$${Math.abs(totalPnl).toLocaleString()}`,c:totalPnl>=0?C.eucalyptus:C.negative},{l:"OPEN TRADES",v:entries.filter(e=>e.result==="open").length,c:C.wheat}].map((s,i)=>(
          <Card key={i} style={{padding:14}}><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",marginBottom:5}}>{s.l}</div><div style={{color:s.c,fontSize:22,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{s.v}</div></Card>
        ))}
      </div>
      {showAdd&&(
        <Card style={{padding:18,marginBottom:16,border:`1px solid ${C.wheat}`,background:C.wheatPale}}>
          <div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:12}}>NEW JOURNAL ENTRY</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
            {[{l:"Commodity",el:<select value={form.commodity} onChange={e=>setForm(p=>({...p,commodity:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{COMMODITIES.map(c=><option key={c.symbol} value={c.symbol}>{c.emoji} {c.name}</option>)}</select>},{l:"Direction",el:<select value={form.direction} onChange={e=>setForm(p=>({...p,direction:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}><option>LONG</option><option>SHORT</option></select>},{l:"Result",el:<select value={form.result} onChange={e=>setForm(p=>({...p,result:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace"}}><option value="open">Open</option><option value="win">Win</option><option value="loss">Loss</option></select>}].map(({l,el},i)=><div key={i}><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{l.toUpperCase()}</div>{el}</div>)}
          </div>
          <div style={{marginBottom:10}}><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:4}}>PRE-TRADE ANALYSIS — why are you taking this trade?</div><textarea value={form.preAnalysis} onChange={e=>setForm(p=>({...p,preAnalysis:e.target.value}))} rows={3} placeholder="Describe the fundamental setup, technical picture, and catalyst you're expecting..." style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,color:C.charcoal,resize:"vertical"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:4}}>P&L (leave blank if open)</div><input type="number" placeholder="e.g. 1500 or -800" value={form.pnl} onChange={e=>setForm(p=>({...p,pnl:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace",color:C.charcoal}}/></div>
            <div><div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",marginBottom:4}}>TAGS (comma separated)</div><input type="text" placeholder="Weather, COT, Mistake, Sizing..." value={form.tags} onChange={e=>setForm(p=>({...p,tags:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace",color:C.charcoal}}/></div>
          </div>
          <div style={{display:"flex",gap:8}}><button onClick={add} style={{background:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"8px 16px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>SAVE ENTRY</button><button onClick={()=>setShowAdd(false)} style={{background:C.white,color:C.charcoal,border:`1px solid ${C.lightGrey}`,borderRadius:3,padding:"8px 16px",cursor:"pointer",fontSize:11}}>CANCEL</button></div>
        </Card>
      )}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["All",...allTags].map(tag=><button key={tag} onClick={()=>setFilterTag(tag)} style={{background:filterTag===tag?C.charcoal:C.white,color:filterTag===tag?C.white:C.charcoal,border:`1px solid ${filterTag===tag?C.charcoal:C.lightGrey}`,borderRadius:2,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{tag}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(entry=>{
          const comm=COMMODITIES.find(c=>c.symbol===entry.commodity); const isActive=activeEntry===entry.id;
          return (
            <Card key={entry.id} style={{overflow:"hidden"}}>
              <div style={{padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer"}} onClick={()=>setActiveEntry(isActive?null:entry.id)}>
                <span style={{fontSize:20,flexShrink:0}}>{comm?.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{color:C.charcoal,fontSize:13,fontWeight:700}}>{comm?.name}</span>
                    <span style={{fontSize:9,padding:"2px 6px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:entry.direction==="LONG"?C.eucalyptus:C.negative}}>{entry.direction}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,background:rBg[entry.result],color:rColor[entry.result]}}>{entry.result.toUpperCase()}</span>
                    {entry.pnl!==null&&<span style={{color:entry.pnl>=0?C.eucalyptus:C.negative,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{entry.pnl>=0?"+":""}${Math.abs(entry.pnl).toLocaleString()}</span>}
                    <span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{entry.date}</span>
                  </div>
                  <div style={{color:C.charcoal,fontSize:12,lineHeight:1.45}}>{entry.preAnalysis.length>120?entry.preAnalysis.slice(0,120)+"...":entry.preAnalysis}</div>
                  <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>{entry.tags.map(t=><span key={t} style={{fontSize:9,padding:"2px 6px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.charcoal,background:C.eggshell,border:`1px solid ${C.lightGrey}`}}>{t}</span>)}</div>
                </div>
                <span style={{color:C.lightGrey,fontSize:12}}>{isActive?"▲":"▼"}</span>
              </div>
              {isActive&&(
                <div style={{borderTop:`1px solid ${C.lightGrey}`,padding:16,background:C.offwhite}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                    <div><div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:5}}>PRE-TRADE ANALYSIS</div><div style={{color:C.charcoal,fontSize:12,lineHeight:1.65,fontFamily:"'Lora',serif"}}>{entry.preAnalysis}</div></div>
                    <div><div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:5}}>POST-TRADE NOTES</div>{entry.postAnalysis?<div style={{color:C.charcoal,fontSize:12,lineHeight:1.65,fontFamily:"'Lora',serif"}}>{entry.postAnalysis}</div>:<div style={{color:C.lightGrey,fontSize:12,fontStyle:"italic",fontFamily:"'Lora',serif"}}>No post-trade notes yet.</div>}</div>
                  </div>
                  <button onClick={()=>getReview(entry)} disabled={aiLoading} style={{background:C.navy,color:C.white,border:"none",borderRadius:3,padding:"7px 14px",cursor:aiLoading?"not-allowed":"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:10}}>{aiLoading?"REVIEWING...":"◆ GET AI COACHING REVIEW"}</button>
                  {aiReview&&aiReview!=="loading"&&<Card style={{padding:14,background:C.eggshell}}><div style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,marginBottom:6,letterSpacing:"0.12em"}}>◆ AI COACHING REVIEW</div><div style={{color:C.charcoal,fontSize:13,lineHeight:1.7,fontFamily:"'Lora',serif"}}>{aiReview}</div></Card>}
                  {aiLoading&&<div style={{color:C.wheatDark,fontSize:12,fontFamily:"'DM Mono',monospace"}}><span style={{animation:"blink 1s infinite"}}>▋</span> Reviewing your trade...</div>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function Alerts(){
  const [alerts,setAlerts]=useState([
    {id:1,type:"price",  commodity:"ZW",condition:"above",value:600,  active:true, label:"Wheat above 600¢"},
    {id:2,type:"price",  commodity:"ZC",condition:"below",value:460,  active:true, label:"Corn below 460¢"},
    {id:3,type:"report", name:"WASDE",  date:"Apr 8",     active:true, label:"WASDE report — Apr 8"},
    {id:4,type:"weather",region:"US Plains",severity:"severe",active:true,label:"US Plains drought severe"},
  ]);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({commodity:"ZC",condition:"above",value:""});
  function add(){if(!form.value)return;const c=COMMODITIES.find(c=>c.symbol===form.commodity);setAlerts(p=>[...p,{id:Date.now(),type:"price",commodity:form.commodity,condition:form.condition,value:parseFloat(form.value),active:true,label:`${c?.name} ${form.condition} ${form.value}`}]);setForm({commodity:"ZC",condition:"above",value:""});setShowAdd(false);}
  function toggle(id){setAlerts(p=>p.map(a=>a.id===id?{...a,active:!a.active}:a));}
  function remove(id){setAlerts(p=>p.filter(a=>a.id!==id));}
  const typeColor={price:C.navy,report:"#e67e22",weather:C.eucalyptus};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <SectionHead label="ALERTS ENGINE" sub="Price levels · Report countdowns · Weather flags"/>
        <button onClick={()=>setShowAdd(!showAdd)} style={{background:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"7px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:18}}>+ ADD ALERT</button>
      </div>
      {showAdd&&(
        <Card style={{padding:16,marginBottom:14,border:`1px solid ${C.wheat}`,background:C.wheatPale}}>
          <div style={{color:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:10}}>NEW PRICE ALERT</div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <select value={form.commodity} onChange={e=>setForm(p=>({...p,commodity:e.target.value}))} style={{padding:"7px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace",color:C.charcoal}}>{COMMODITIES.map(c=><option key={c.symbol} value={c.symbol}>{c.emoji} {c.name}</option>)}</select>
            <select value={form.condition} onChange={e=>setForm(p=>({...p,condition:e.target.value}))} style={{padding:"7px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,fontFamily:"'DM Mono',monospace",color:C.charcoal}}><option value="above">rises above</option><option value="below">falls below</option></select>
            <input type="number" placeholder="Price level" value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} style={{padding:"7px 10px",border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:12,width:120,fontFamily:"'DM Mono',monospace",color:C.charcoal}}/>
            <button onClick={add} style={{background:C.eucalyptus,color:C.white,border:"none",borderRadius:3,padding:"7px 14px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>SAVE</button>
            <button onClick={()=>setShowAdd(false)} style={{background:C.white,color:C.charcoal,border:`1px solid ${C.lightGrey}`,borderRadius:3,padding:"7px 14px",cursor:"pointer",fontSize:11}}>CANCEL</button>
          </div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {alerts.map(a=>(
          <Card key={a.id} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,opacity:a.active?1:0.5}}>
            <div style={{width:3,height:36,background:typeColor[a.type]||C.navy,borderRadius:2,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{fontSize:9,padding:"2px 7px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.white,background:typeColor[a.type]||C.navy}}>{a.type.toUpperCase()}</span><span style={{color:C.charcoal,fontSize:13}}>{a.label}</span></div>
              <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{a.active?"Monitoring...":"Paused"}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>toggle(a.id)} style={{background:a.active?C.eucalyptusPale:C.lightGrey,color:a.active?C.eucalyptus:C.charcoal,border:`1px solid ${a.active?C.eucalyptus:C.lightGrey}`,borderRadius:2,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{a.active?"PAUSE":"RESUME"}</button>
              <button onClick={()=>remove(a.id)} style={{background:C.negativePale,color:C.negative,border:`1px solid ${C.negative}`,borderRadius:2,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace"}}>✕</button>
            </div>
          </Card>
        ))}
      </div>
      <div style={{padding:10,background:C.eggshell,border:`1px dashed ${C.lightGrey}`,borderRadius:3}}><span style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace"}}>⚡ HOOK: When Barchart API key is added, price alerts will check live prices every 60s and trigger browser notifications.</span></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER + CURRENCIES + REPORTS (full tabs)
// ─────────────────────────────────────────────────────────────────────────────
function WeatherTab(){
  const [weatherData,setWeatherData]=useState(WEATHER_DATA);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetchWeatherData().then(data=>{setWeatherData(data);setLoading(false);}).catch(()=>setLoading(false));
  },[]);
  return (
    <div>
      <SectionHead label="GLOBAL AG WEATHER MONITOR" sub={loading?"Loading live data from Open-Meteo…":"Live data · Open-Meteo · Updates every 5 min"}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10,marginBottom:20,alignItems:"stretch"}}>
        {weatherData.map((w,i)=>{const col=w.severity==="severe"?C.negative:w.severity==="moderate"?C.warning:C.eucalyptus; return(
          <Card key={i} style={{borderLeft:`4px solid ${col}`,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:22}}>{w.icon}</span><span style={{fontSize:9,padding:"2px 8px",borderRadius:2,fontFamily:"'DM Mono',monospace",fontWeight:700,color:col,background:C.eggshell,border:`1px solid ${col}`}}>{w.severity.toUpperCase()}</span></div>
            <div style={{color:C.charcoal,fontSize:14,fontWeight:600,marginBottom:3}}>{w.region}</div>
            <div style={{color:C.wheat,fontSize:12,fontWeight:500,marginBottom:6}}>{w.condition}</div>
            <div style={{color:C.charcoal,fontSize:11,lineHeight:1.5,marginBottom:8}}>{w.detail}</div>
            <a href={`https://www.windy.com/?${w.lat},${w.lng},6`} target="_blank" rel="noopener noreferrer" style={{color:C.eucalyptus,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none"}} onMouseEnter={e=>e.target.style.textDecoration="underline"} onMouseLeave={e=>e.target.style.textDecoration="none"}>View on Windy →</a>
          </Card>
        );})}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Card style={{padding:18}}>
          <SectionHead label="ENSO STATUS — EL NIÑO / LA NIÑA"/>
          {[{l:"Current Phase",v:"Neutral / Transitioning",n:"La Niña watch issued by NOAA"},{l:"ONI Index",v:"−0.4°C",n:"Just below La Niña threshold (−0.5°C)"},{l:"Jun–Aug Forecast",v:"La Niña likely (60%)",n:"Bearish Brazil · Bullish US Plains wheat"},{l:"Ag Impact",v:"Watch Brazilian rainfall",n:"La Niña = drier Brazil = bullish soy/corn"}].map((s,i)=>(
            <div key={i} style={{borderLeft:`3px solid ${C.eucalyptus}`,paddingLeft:12,marginBottom:12}}>
              <div style={{color:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:3}}>{s.l}</div>
              <div style={{color:C.charcoal,fontSize:13,fontWeight:600,marginBottom:2}}>{s.v}</div>
              <div style={{color:C.charcoal,fontSize:11}}>{s.n}</div>
            </div>
          ))}
          <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/" target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none"}}>NOAA CPC ENSO Advisory →</a>
        </Card>
        <Card style={{padding:18}}>
          <SectionHead label="US DROUGHT MONITOR"/>
          <div style={{color:C.charcoal,fontSize:12,lineHeight:1.6,marginBottom:12}}>Published every Thursday. The most important weekly weather data point for grain traders. D2–D3 drought across the winter wheat belt is a key bullish driver for Chicago wheat currently.</div>
          {[{cat:"D0 — Abnormally Dry",pct:24,col:"#f5e642"},{cat:"D1 — Moderate Drought",pct:18,col:"#f5a742"},{cat:"D2 — Severe Drought",pct:12,col:"#e07020"},{cat:"D3 — Extreme Drought",pct:7,col:"#c03000"},{cat:"D4 — Exceptional",pct:2,col:"#700000"}].map(d=>(
            <div key={d.cat} style={{marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:C.charcoal,fontSize:11}}>{d.cat}</span><span style={{color:C.navy,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{d.pct}% of US wheat area</span></div>
              <div style={{height:5,background:C.lightGrey,borderRadius:2}}><div style={{height:"100%",width:`${d.pct*3}%`,background:d.col,borderRadius:2}}/></div>
            </div>
          ))}
          <a href="https://droughtmonitor.unl.edu/" target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none",marginTop:8,display:"block"}}>US Drought Monitor →</a>
        </Card>
      </div>
    </div>
  );
}

function CurrenciesTab(){
  const [currData,setCurrData]=useState(CURRENCIES_DATA);
  const [loading,setLoading]=useState(true);
  const anyLive=currData.some(c=>c.live);

  useEffect(()=>{
    let cancelled=false;
    function load(){
      fetchCurrenciesData().then(data=>{if(!cancelled){if(data)setCurrData(data);setLoading(false);}}).catch(()=>{if(!cancelled)setLoading(false);});
    }
    load();
    const iv=setInterval(load,300000);
    return()=>{cancelled=true;clearInterval(iv);};
  },[]);

  const GROUPS=["Major","South America","Asia Pacific","Other"];

  function CurrCard({c}){
    const hasData=c.value!==null;
    // Is the current move bullish or bearish for US Ag?
    const moveIsGood=c.pct!=null&&((c.pct>0&&c.upIsBullish)||(c.pct<0&&!c.upIsBullish));
    const moveColor=c.pct==null?C.wheatDark:moveIsGood?C.eucalyptus:C.negative;
    const accentColor=moveIsGood?C.eucalyptus:C.negative;
    const bgPale=moveIsGood?C.eucalyptusPale:c.pct==null?"#f7f5f0":C.negativePale;

    // Format display value — JPY/IDR/ARS bigger numbers get fewer decimals
    const fmt=v=>{
      if(v==null) return "—";
      if(v>=100) return v.toFixed(2);
      if(v>=10)  return v.toFixed(3);
      return v.toFixed(4);
    };

    return (
      <Card style={{borderTop:`3px solid ${hasData?accentColor:C.lightGrey}`,padding:16,display:"flex",flexDirection:"column",gap:0}}>
        {/* Header row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div>
            <div style={{color:C.wheatDark,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",marginBottom:2}}>{c.name}</div>
            <div style={{color:C.charcoal,fontSize:15,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:"0.1em"}}>{c.pair}</div>
          </div>
          <span style={{fontSize:8,fontFamily:"'DM Mono',monospace",padding:"2px 6px",borderRadius:2,fontWeight:600,letterSpacing:"0.06em",
            background:c.live?"#e8f4ee":"#f0f0f0",color:c.live?C.eucalyptus:"#999"}}>
            {c.live?"● LIVE":"○ SIM"}
          </span>
        </div>

        {/* Rate */}
        <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:8}}>
          <span style={{color:C.charcoal,fontSize:26,fontFamily:"'DM Mono',monospace",fontWeight:700,lineHeight:1}}>{fmt(c.value)}</span>
          {c.pct!=null&&(
            <span style={{color:moveColor,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600}}>
              {c.pct>=0?"+":""}{c.pct.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Change */}
        {c.change!=null&&(
          <div style={{color:moveColor,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:10}}>
            {c.change>=0?"+":""}{c.change.toFixed(4)} day change
          </div>
        )}

        {/* Relevance */}
        <div style={{fontSize:11,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:1.55,color:C.charcoal,padding:"8px 10px",background:bgPale,borderLeft:`3px solid ${hasData?accentColor:C.lightGrey}`,borderRadius:2,marginBottom:8,flex:1}}>
          {c.relevance}
        </div>

        {/* Affects + source */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:C.wheatDark,letterSpacing:"0.05em"}}>{c.affects}</span>
          <a href={`https://fred.stlouisfed.org/series/${c.fredId}`} target="_blank" rel="noopener noreferrer"
            style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace",textDecoration:"none"}}
            onMouseEnter={e=>e.target.style.textDecoration="underline"}
            onMouseLeave={e=>e.target.style.textDecoration="none"}>
            FRED →
          </a>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <SectionHead label="CURRENCIES & AG EXPORT IMPACT"
          sub={loading?"Fetching FRED data…":anyLive?"Live rates from FRED · Updates every 5 min":"Simulated — FRED unavailable (CORS)"}/>
        {!loading&&(
          <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",padding:"3px 9px",borderRadius:2,
            background:anyLive?"#e8f4ee":"#f0f0f0",color:anyLive?C.eucalyptus:"#999",fontWeight:600,letterSpacing:"0.06em",flexShrink:0,marginTop:2}}>
            {anyLive?"● FRED LIVE":"○ SIMULATED"}
          </span>
        )}
      </div>

      {loading&&(
        <div style={{color:C.wheatDark,fontSize:12,fontFamily:"'DM Mono',monospace",padding:"32px 0",textAlign:"center"}}>
          Fetching 16 currency pairs from FRED…
        </div>
      )}

      {!loading&&GROUPS.map(group=>{
        const cards=currData.filter(c=>c.group===group);
        if(!cards.length) return null;
        return (
          <div key={group} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:"0.12em",color:C.wheatDark}}>{group.toUpperCase()}</span>
              <div style={{flex:1,height:1,background:C.lightGrey}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10,alignItems:"stretch"}}>
              {cards.map((c,i)=><CurrCard key={i} c={c}/>)}
            </div>
          </div>
        );
      })}

      {!loading&&(
        <Card style={{padding:20,marginTop:8}}>
          <SectionHead label="HOW CURRENCIES MOVE AG MARKETS"/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:18}}>
            {[
              {t:"Strong DXY → Bearish All US Grains",d:"US exports become more expensive for every foreign buyer. Demand shifts to Brazil, Argentina and EU — reducing US market share. Watch DXY weekly: sustained moves above 105 meaningfully hurt export competitiveness."},
              {t:"Weak BRL → Brazil Flooding Markets",d:"Brazilian farmers receive more reais per tonne sold. This incentivises aggressive selling. The most important single currency relationship for soybean traders — Brazil ships over 50% of world soy."},
              {t:"Weak ARS → Argentine Meal Pressure",d:"Argentina is the world's largest meal exporter. Chronic peso devaluation forces farmer selling. 'Soy dollar' programs that compel grain selling are highly bearish global soy meal."},
              {t:"Weak CNY → China Buys Less",d:"China is the #1 buyer of US soybeans. When yuan weakens against USD, US prices rise in yuan terms. China may delay purchases, cancel cargoes or shift to Brazil. Watch USD/CNY closely around WASDE."},
              {t:"Weak Importer Currencies → Demand Destruction",d:"Rising USD/IDR, USD/INR, USD/THB all raise the local cost of USD-priced grain. Sustained weakness reduces import budgets across the Asia-Pacific, the world's largest import region."},
              {t:"Monitor Export Sales Each Thursday",d:"USDA Export Sales (7:30am CT) shows weekly new commitments. Currency moves often show up here first — a sharp USD rally followed by weak export sales confirms the demand destruction thesis."},
            ].map((item,i)=>(
              <div key={i} style={{borderLeft:`3px solid ${C.wheat}`,paddingLeft:14}}>
                <div style={{color:C.charcoal,fontSize:13,fontWeight:600,marginBottom:5,fontFamily:"'IBM Plex Sans',sans-serif"}}>{item.t}</div>
                <div style={{color:C.charcoal,fontSize:12,lineHeight:1.6,fontFamily:"'IBM Plex Sans',sans-serif"}}>{item.d}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ReportsTab(){
  const impColor={critical:"#e67e22",high:C.eucalyptus,medium:C.navy};
  return (
    <div>
      <SectionHead label="USDA & KEY REPORT CALENDAR" sub="All dates linked to official sources"/>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {REPORT_CALENDAR.map((r,i)=>(
          <Card key={i} style={{borderLeft:`4px solid ${impColor[r.importance]}`,padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><a href={r.url} target="_blank" rel="noopener noreferrer" style={{color:C.charcoal,fontSize:14,fontWeight:600,textDecoration:"none"}} onMouseEnter={e=>e.target.style.color=C.eucalyptus} onMouseLeave={e=>e.target.style.color=C.charcoal}>{r.name}</a><ImpBadge level={r.importance}/></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:C.wheatDark,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{r.date}</span><a href={r.url} target="_blank" rel="noopener noreferrer" style={{color:C.wheat,fontSize:10,fontFamily:"'DM Mono',monospace",textDecoration:"none"}} onMouseEnter={e=>e.target.style.textDecoration="underline"} onMouseLeave={e=>e.target.style.textDecoration="none"}>Official source →</a></div></div>
            <span style={{color:i===0?C.eucalyptus:C.wheatDark,fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:i===0?700:400,flexShrink:0}}>{r.countdown}</span>
          </Card>
        ))}
      </div>
      <Card style={{padding:20}}>
        <SectionHead label="REPORT GUIDE — WHAT EACH ONE MEANS"/>
        {[{n:"WASDE",u:"https://www.usda.gov/oce/commodity/wasde/",d:"World Ag Supply & Demand Estimates. Monthly (usually 2nd Tuesday). Sets the global supply/demand balance sheet — single most important grain report. Study the ending stocks and stocks-to-use ratio."},
          {n:"Crop Progress",u:"https://www.nass.usda.gov/Publications/National_Crop_Progress/",d:"Weekly Monday afternoons (Apr–Nov). Tracks planting pace and crop condition ratings (Good/Excellent %). If Good/Excellent drops sharply, it's bullish for prices."},
          {n:"Export Inspections",u:"https://www.ams.usda.gov/market-news/grain-transportation",d:"Weekly Monday. Actual grain loaded onto ships. Compare weekly number to what's needed to hit the USDA full-year target. Running behind = bearish."},
          {n:"Export Sales",u:"https://apps.fas.usda.gov/export-sales/esrd1.html",d:"Weekly Thursday 7:30am CT. New sales commitments. A large weekly sale to China is often an immediate bullish catalyst."},
          {n:"COT Report",u:"https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm",d:"Friday 3:30pm CT. CFTC managed money net positions. Extreme net short = potential squeeze. Extreme net long = vulnerable to selling."},
          {n:"Cattle on Feed",u:"https://www.nass.usda.gov/Publications/Todays_Reports/",d:"Monthly (last Friday). Placements, marketings, total feedlot inventory. High placements = more future supply = bearish nearby."},
        ].map((r,i)=>(
          <div key={i} style={{padding:"11px 0",borderBottom:`1px solid ${C.lightGrey}`,display:"flex",gap:16}}>
            <div style={{minWidth:140}}><a href={r.u} target="_blank" rel="noopener noreferrer" style={{color:C.navy,fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,textDecoration:"none"}} onMouseEnter={e=>e.target.style.color=C.eucalyptus} onMouseLeave={e=>e.target.style.color=C.navy}>{r.n} →</a></div>
            <span style={{color:C.charcoal,fontSize:12,lineHeight:1.6}}>{r.d}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function Muster() {
  const [tab,setTab]=useState("home");
  const [subTabMemory,setSubTabMemory]=useState({markets:"charts",intelligence:"intel",trading:"scorecard",learn:"education"});
  const [time,setTime]=useState(new Date());
  const [refreshKey,setRefreshKey]=useState(0);
  const [searchQuery,setSearchQuery]=useState("");
  const [searchCursor,setSearchCursor]=useState(-1);
  const searchRef=useRef(null);
  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);
  // Global data refresh — runs on mount and every 5 minutes
  useEffect(()=>{
    const refresh=()=>{setRefreshKey(k=>k+1);};
    refresh();
    const interval=setInterval(refresh,300000);
    return()=>clearInterval(interval);
  },[]);

  const TABS=[
    {id:"home",     label:"HOME",          emoji:"🏠"},
    {id:"charts",   label:"PRICE CHARTS",  emoji:"📊"},
    {id:"analyst",  label:"AI ANALYST",    emoji:"◆" },
    {id:"supply",   label:"SUPPLY & DEMAND",emoji:"⚖️"},
    {id:"seasonal", label:"SEASONALS",     emoji:"📈"},
    {id:"cot",      label:"COT CHARTS",    emoji:"📉"},
    {id:"backtest", label:"BACKTESTING",   emoji:"🔬"},
    {id:"weather",  label:"WEATHER",       emoji:"🌦️"},
    {id:"currencies",label:"CURRENCIES",   emoji:"💱"},
    {id:"reports",  label:"REPORTS",       emoji:"📋"},
    {id:"scorecard",label:"SCORECARD",     emoji:"🎯"},
    {id:"portfolio",label:"PORTFOLIO",     emoji:"💼"},
    {id:"equities", label:"AG EQUITIES",   emoji:"🏢"},
    {id:"education",label:"EDUCATION",     emoji:"📚"},
    {id:"journal",  label:"JOURNAL",       emoji:"📓"},
    {id:"alerts",   label:"ALERTS",        emoji:"🔔"},
    {id:"australia",label:"AUSTRALIA",      emoji:"🦘"},
    {id:"intel",    label:"INTELLIGENCE",  emoji:"🧠"},
    {id:"autotrader",label:"AUTO TRADER",  emoji:"🤖"},
  ];

  const PRIMARY_NAV=[
    {id:"home",        label:"HOME"},
    {id:"markets",     label:"MARKETS"},
    {id:"intelligence",label:"INTELLIGENCE"},
    {id:"trading",     label:"TRADING"},
    {id:"learn",       label:"LEARN"},
  ];
  const SUB_TABS={
    markets:[
      {id:"charts",    label:"Price Charts"},
      {id:"supply",    label:"Supply & Demand"},
      {id:"seasonal",  label:"Seasonals"},
      {id:"cot",       label:"COT Charts"},
      {id:"weather",   label:"Weather"},
      {id:"currencies",label:"Currencies"},
      {id:"australia", label:"Australia"},
    ],
    intelligence:[
      {id:"intel",   label:"News Feed"},
      {id:"analyst", label:"AI Analyst"},
      {id:"reports", label:"Reports"},
    ],
    trading:[
      {id:"scorecard", label:"Scorecard"},
      {id:"portfolio", label:"Portfolio"},
      {id:"autotrader",label:"Auto Trader"},
      {id:"backtest",  label:"Backtesting"},
      {id:"alerts",    label:"Alerts"},
    ],
    learn:[
      {id:"education",label:"Education"},
      {id:"journal",  label:"Trade Journal"},
      {id:"equities", label:"AG Equities"},
    ],
  };
  const TAB_TO_CATEGORY={
    home:"home",
    charts:"markets",supply:"markets",seasonal:"markets",cot:"markets",
    weather:"markets",currencies:"markets",australia:"markets",
    intel:"intelligence",analyst:"intelligence",reports:"intelligence",
    scorecard:"trading",portfolio:"trading",autotrader:"trading",
    backtest:"trading",alerts:"trading",
    education:"learn",journal:"learn",equities:"learn",
  };
  function navigateToTab(id){
    setTab(id);
    const cat=TAB_TO_CATEGORY[id];
    if(cat&&cat!=="home") setSubTabMemory(prev=>({...prev,[cat]:id}));
  }
  const activeCategory=TAB_TO_CATEGORY[tab]||"home";

  const SEARCH_INDEX=useMemo(()=>[
    // Tabs
    ...TABS.map(t=>({tabId:t.id,label:t.label,sub:"Tab",emoji:t.emoji,keywords:t.label.toLowerCase()})),
    // Commodities → charts tab
    ...COMMODITIES.map(c=>({tabId:"charts",label:c.name,sub:`${c.sector} · Price Charts`,emoji:c.emoji,keywords:`${c.name} ${c.symbol} ${c.sector}`.toLowerCase()})),
    // Commodities → scorecard tab
    ...COMMODITIES.map(c=>({tabId:"scorecard",label:`${c.name} Scorecard`,sub:"Scorecard",emoji:c.emoji,keywords:`${c.name} ${c.symbol} scorecard signal`.toLowerCase()})),
    // Currencies
    ...CURRENCIES_META.map(c=>({tabId:"currencies",label:c.pair,sub:`${c.name} · Currencies`,emoji:"💱",keywords:`${c.pair} ${c.name} currency fx`.toLowerCase()})),
    // Section headings
    {tabId:"supply",   label:"WASDE Data",         sub:"Supply & Demand",emoji:"⚖️", keywords:"wasde supply demand stocks"},
    {tabId:"supply",   label:"Stocks-to-Use Ratio", sub:"Supply & Demand",emoji:"⚖️", keywords:"stocks use ratio stur"},
    {tabId:"cot",      label:"COT Positioning",     sub:"COT Charts",     emoji:"📉", keywords:"cot commitment traders positioning"},
    {tabId:"reports",  label:"Export Inspections",  sub:"Reports",        emoji:"📋", keywords:"export inspections usda"},
    {tabId:"weather",  label:"Crop Weather",        sub:"Weather",        emoji:"🌦️",keywords:"weather crop drought rainfall temperature"},
    {tabId:"backtest", label:"Backtesting Engine",  sub:"Backtesting",    emoji:"🔬", keywords:"backtest strategy signals ma cross"},
    {tabId:"seasonal", label:"Seasonal Patterns",   sub:"Seasonals",      emoji:"📈", keywords:"seasonal patterns calendar"},
    {tabId:"education",label:"Trading Education",   sub:"Education",      emoji:"📚", keywords:"education learn beginner futures"},
    {tabId:"journal",  label:"Trade Journal",       sub:"Journal",        emoji:"📓", keywords:"journal trade log review"},
    {tabId:"portfolio",label:"Open Positions",      sub:"Portfolio",      emoji:"💼", keywords:"portfolio positions open trades"},
    {tabId:"equities", label:"Ag Equities",         sub:"AG Equities",    emoji:"🏢", keywords:"equities stocks asx listed ag"},
    {tabId:"alerts",   label:"Price Alerts",        sub:"Alerts",         emoji:"🔔", keywords:"alerts price notifications"},
    {tabId:"australia",label:"Australian Markets",  sub:"Australia",      emoji:"🦘", keywords:"australia wheat beef wool asx aud eyci"},
    {tabId:"intel",    label:"Intelligence Feed",   sub:"Intelligence",   emoji:"🧠", keywords:"intelligence news feed headlines"},
    {tabId:"autotrader",label:"Auto Trader",        sub:"Auto Trader",    emoji:"🤖", keywords:"auto trader paper trading signals ai"},
    {tabId:"analyst",  label:"AI Market Analyst",   sub:"AI Analyst",     emoji:"◆",  keywords:"ai analyst chat market question"},
  ],[]);

  const searchResults=useMemo(()=>{
    const q=searchQuery.trim().toLowerCase();
    if(!q) return [];
    return SEARCH_INDEX.filter(e=>e.keywords.includes(q)||e.label.toLowerCase().includes(q)||e.sub.toLowerCase().includes(q)).slice(0,8);
  },[searchQuery,SEARCH_INDEX]);

  function handleSearchKey(e){
    if(!searchResults.length) return;
    if(e.key==="ArrowDown"){e.preventDefault();setSearchCursor(c=>Math.min(c+1,searchResults.length-1));}
    else if(e.key==="ArrowUp"){e.preventDefault();setSearchCursor(c=>Math.max(c-1,0));}
    else if(e.key==="Enter"){e.preventDefault();const r=searchResults[searchCursor>=0?searchCursor:0];if(r){navigateToTab(r.tabId);setSearchQuery("");setSearchCursor(-1);}}
    else if(e.key==="Escape"){setSearchQuery("");setSearchCursor(-1);}
  }

  // Close search on outside click
  useEffect(()=>{
    function handleClick(e){if(searchRef.current&&!searchRef.current.contains(e.target)){setSearchQuery("");setSearchCursor(-1);}}
    document.addEventListener("mousedown",handleClick);
    return()=>document.removeEventListener("mousedown",handleClick);
  },[]);

  return (
    <div style={{background:C.eggshell,minHeight:"100vh",color:C.charcoal,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${C.eggshell};}
        ::-webkit-scrollbar-thumb{background:${C.lightGrey};border-radius:2px;}
        a{text-decoration:none;}
        select,input,textarea{background:#fff;color:${C.charcoal};}
        button:focus{outline:none;}
      `}</style>

      {/* HEADER */}
      <div style={{background:C.charcoal,padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,background:C.eucalyptus,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌾</div>
          <div>
            <span style={{fontSize:19,fontWeight:700,color:C.wheat,fontFamily:"'DM Mono',monospace",letterSpacing:"0.22em"}}>MUSTER</span>
            <span style={{fontSize:9,color:C.wheatDark,fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",marginLeft:10}}>AG INTELLIGENCE v1.0</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{background:"#3a2a00",border:`1px solid ${C.wheat}44`,borderRadius:3,padding:"3px 10px"}}>
            <span style={{color:C.wheat,fontSize:9,fontFamily:"'DM Mono',monospace"}}>⚡ SIMULATION MODE · Add API keys in config for live data</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.eucalyptus,animation:"pulse 2.5s infinite"}}/>
            <span style={{color:"#aaa",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{time.toLocaleTimeString()}</span>
          </div>
          <span style={{color:"#666",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{time.toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</span>
        </div>
      </div>

      {/* TICKER */}
      <Ticker/>

      {/* PRIMARY NAV */}
      <div style={{background:C.white,borderBottom:activeCategory==="home"?`2px solid ${C.lightGrey}`:"none",position:"sticky",top:56,zIndex:99,display:"flex",alignItems:"stretch",boxShadow:activeCategory!=="home"?"0 1px 0 0 "+C.lightGrey:"none"}}>
        <div style={{flex:1,display:"flex",padding:"0 0 0 20px"}}>
          {PRIMARY_NAV.map(p=>{
            const isActive=activeCategory===p.id;
            return (
              <button
                key={p.id}
                onClick={()=>{
                  if(p.id==="home"){setTab("home");}
                  else{const dest=subTabMemory[p.id]||SUB_TABS[p.id][0].id;setTab(dest);}
                }}
                style={{background:"none",border:"none",borderBottom:isActive?`3px solid ${C.eucalyptus}`:"3px solid transparent",padding:"0 16px",marginBottom:"-1px",height:48,color:isActive?C.eucalyptus:C.charcoal,fontSize:13,fontFamily:"'IBM Plex Sans',sans-serif",letterSpacing:"0.06em",fontWeight:isActive?700:500,cursor:"pointer",transition:"color 0.15s",whiteSpace:"nowrap"}}
                onMouseEnter={e=>{if(!isActive){e.currentTarget.style.color=C.eucalyptus;e.currentTarget.style.borderBottomColor=C.eucalyptusPale;}}}
                onMouseLeave={e=>{if(!isActive){e.currentTarget.style.color=C.charcoal;e.currentTarget.style.borderBottomColor="transparent";}}}
              >{p.label}</button>
            );
          })}
        </div>
        {/* SEARCH */}
        <div ref={searchRef} style={{position:"relative",display:"flex",alignItems:"center",padding:"0 16px",borderLeft:`1px solid ${C.lightGrey}`,flexShrink:0}}>
          <div style={{position:"relative",display:"flex",alignItems:"center"}}>
            <span style={{position:"absolute",left:8,color:C.wheatDark,fontSize:12,pointerEvents:"none",fontFamily:"'DM Mono',monospace"}}>⌕</span>
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e=>{setSearchQuery(e.target.value);setSearchCursor(-1);}}
              onKeyDown={handleSearchKey}
              style={{paddingLeft:24,paddingRight:8,height:26,width:160,border:`1px solid ${C.lightGrey}`,borderRadius:3,fontSize:11,fontFamily:"'IBM Plex Sans',sans-serif",color:C.charcoal,background:C.offwhite,outline:"none",transition:"border-color 0.15s"}}
              onFocus={e=>e.target.style.borderColor=C.eucalyptus}
              onBlur={e=>e.target.style.borderColor=C.lightGrey}
            />
          </div>
          {searchResults.length>0&&(
            <div style={{position:"absolute",top:"100%",right:0,width:280,background:C.white,border:`1px solid ${C.lightGrey}`,borderTop:"none",borderRadius:"0 0 4px 4px",boxShadow:"0 6px 16px rgba(0,0,0,0.10)",zIndex:200}}>
              {searchResults.map((r,i)=>(
                <div
                  key={i}
                  onMouseDown={()=>{navigateToTab(r.tabId);setSearchQuery("");setSearchCursor(-1);}}
                  onMouseEnter={()=>setSearchCursor(i)}
                  style={{padding:"8px 14px",cursor:"pointer",background:i===searchCursor?`${C.wheat}22`:C.white,borderBottom:i<searchResults.length-1?`1px solid ${C.lightGrey}`:"none",display:"flex",alignItems:"baseline",gap:8}}
                >
                  <span style={{fontSize:12,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:500,color:C.charcoal,flex:1}}>{r.label}</span>
                  {r.sub&&<span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:C.wheatDark,letterSpacing:"0.05em",flexShrink:0}}>{r.sub}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECONDARY NAV */}
      {activeCategory!=="home"&&SUB_TABS[activeCategory]&&(
        <div style={{background:C.offwhite,borderBottom:`2px solid ${C.lightGrey}`,position:"sticky",top:104,zIndex:98,display:"flex",padding:"0 20px",overflowX:"auto"}}>
          {SUB_TABS[activeCategory].map(s=>{
            const isActive=tab===s.id;
            return (
              <button
                key={s.id}
                onClick={()=>navigateToTab(s.id)}
                style={{background:"none",border:"none",borderBottom:isActive?`2px solid ${C.wheat}`:"2px solid transparent",padding:"0 14px",marginBottom:"-2px",height:36,color:isActive?C.wheatDark:C.charcoal,fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",fontWeight:isActive?600:400,cursor:"pointer",transition:"color 0.15s",whiteSpace:"nowrap",opacity:isActive?1:0.7}}
                onMouseEnter={e=>{if(!isActive){e.currentTarget.style.opacity="1";e.currentTarget.style.color=C.wheatDark;}}}
                onMouseLeave={e=>{if(!isActive){e.currentTarget.style.opacity="0.7";e.currentTarget.style.color=C.charcoal;}}}
              >{s.label}</button>
            );
          })}
        </div>
      )}

      {/* CONTENT */}
      <div style={{padding:"22px 24px",animation:"fadeIn 0.2s ease"}}>
        {tab==="home"      && <HomePage/>}
        {tab==="charts"    && <PriceCharts/>}
        {tab==="analyst"   && <AIAnalyst/>}
        {tab==="supply"    && <SupplyDemand/>}
        {tab==="seasonal"  && <Seasonals/>}
        {tab==="cot"       && <COTCharts/>}
        {tab==="backtest"  && <Backtesting/>}
        {tab==="weather"   && <WeatherTab key={refreshKey}/>}
        {tab==="currencies"&& <CurrenciesTab key={refreshKey}/>}
        {tab==="reports"   && <ReportsTab/>}
        {tab==="scorecard" && <Scorecard/>}
        {tab==="portfolio" && <Portfolio/>}
        {tab==="equities"  && <AgEquities/>}
        {tab==="education" && <Education/>}
        {tab==="journal"   && <TradeJournal/>}
        {tab==="alerts"    && <Alerts/>}
        {tab==="australia" && <AustraliaTab/>}
        {tab==="intel"     && <IntelligenceFeed key={refreshKey}/>}
        {tab==="autotrader"&& <AutoTrader/>}
      </div>

      {/* FOOTER */}
      <div style={{borderTop:`1px solid ${C.lightGrey}`,padding:"10px 24px",display:"flex",justifyContent:"space-between",background:C.charcoal}}>
        <span style={{color:"#555",fontSize:10,fontFamily:"'DM Mono',monospace"}}>MUSTER v1.0 — ALL 16 MODULES — PERSONAL USE ONLY</span>
        <span style={{color:"#555",fontSize:10,fontFamily:"'DM Mono',monospace"}}>PRICES: SIMULATED · AI: LIVE · API HOOKS READY · NOT FINANCIAL ADVICE</span>
      </div>
    </div>
  );
}
