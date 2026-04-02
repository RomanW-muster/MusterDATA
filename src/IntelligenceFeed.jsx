import { useState, useEffect } from "react";

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const save = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.error('Storage error:', e); } }
const load = (key, fallback) => { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch(e) { return fallback; } }

const RSS_FEEDS = [
  { id:"graincentral", label:"Grain Central",  url:"https://api.rss2json.com/v1/api.json?rss_url=https://graincentral.com/feed" },
  { id:"commodity",    label:"Commodity.com",  url:"https://api.rss2json.com/v1/api.json?rss_url=https://commodity.com/feed/" },
  { id:"nasdaq",       label:"Nasdaq",         url:"https://api.rss2json.com/v1/api.json?rss_url=https://www.nasdaq.com/feed/rssoutbound?category=commodities" },
  { id:"marketwatch",  label:"MarketWatch",    url:"https://api.rss2json.com/v1/api.json?rss_url=https://feeds.marketwatch.com/marketwatch/marketpulse/" },
];

async function fetchRssArticles(activeSources) {
  const feeds = RSS_FEEDS.filter(f => activeSources[f.id] !== false);
  const results = await Promise.all(
    feeds.map(f =>
      fetch(f.url)
        .then(r => r.json())
        .catch(() => null)
    )
  );
  const articles = [];
  results.forEach(data => {
    if (!data || data.status !== "ok" || !Array.isArray(data.items)) return;
    const source = data.feed?.title || "Unknown";
    data.items.forEach(item => {
      articles.push({
        title: item.title || "",
        source,
        url: item.link || "#",
        date: item.pubDate || "",
      });
    });
  });
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));
  return articles;
}

const C = {
  charcoal: "#2A2A2A",
  navy: "#1E2F3F",
  wheat: "#C8A96A",
  wheatDark: "#9a7d45",
  eucalyptus: "#2F4F3E",
  eucalyptusPale: "#e8f4ee",
  lightGrey: "#D9D9D9",
  eggshell: "#F4F1EA",
  offwhite: "#fafaf8",
  white: "#ffffff",
};

export default function IntelligenceFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState(() => load("muster_sources", Object.fromEntries(RSS_FEEDS.map(f => [f.id, true]))));

  useEffect(() => { save("muster_sources", sources); }, [sources]);

  function toggleSource(id) {
    setSources(prev => ({ ...prev, [id]: !prev[id] }));
  }

  useEffect(() => {
    setLoading(true);
    fetchRssArticles(sources)
      .then(data => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load feeds.");
        setLoading(false);
      });
  }, [sources]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ background: "#2F4F3E", color: "#ffffff", padding: "4px 12px", borderRadius: 3, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.12em", fontWeight: 600, display: "inline-block", marginBottom: 12 }}>
          INTELLIGENCE FEED
        </span>
        <div style={{ color: C.charcoal, fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
          {loading ? "Loading live Ag news…" : error ? error : `${articles.length} articles loaded`}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RSS_FEEDS.map(f => (
            <button key={f.id} onClick={() => toggleSource(f.id)}
              style={{ background: sources[f.id] !== false ? C.eucalyptus : C.lightGrey, color: sources[f.id] !== false ? C.white : C.charcoal, border: "none", borderRadius: 2, padding: "3px 10px", cursor: "pointer", fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>
              {sources[f.id] !== false ? "●" : "○"} {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ color: C.wheatDark, fontSize: 12, padding: "20px 0" }}>
          Fetching feeds from Grain Central, Commodity.com, Nasdaq, MarketWatch…
        </div>
      )}

      {!loading && articles.length === 0 && !error && (
        <div style={{ color: C.wheatDark, fontSize: 12, padding: "20px 0" }}>
          No articles found. Feeds may be temporarily unavailable.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {articles.map((article, i) => (
          <div
            key={i}
            style={{
              background: C.white,
              border: `1px solid ${C.lightGrey}`,
              borderLeft: `3px solid ${C.eucalyptus}`,
              borderRadius: 3,
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: C.charcoal,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Lora', serif",
                textDecoration: "none",
                lineHeight: 1.45,
                display: "block",
                marginBottom: 6,
              }}
              onMouseEnter={e => (e.target.style.color = C.eucalyptus)}
              onMouseLeave={e => (e.target.style.color = C.charcoal)}
            >
              {article.title}
            </a>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span
                style={{
                  color: C.white,
                  background: C.eucalyptus,
                  fontSize: 9,
                  fontFamily: "'DM Mono',monospace",
                  padding: "2px 6px",
                  borderRadius: 2,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                {article.source}
              </span>
              <span style={{ color: C.wheatDark, fontSize: 10, fontFamily: "'DM Mono',monospace" }}>
                {article.date ? new Date(article.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!loading && articles.length > 0 && (
        <div style={{ marginTop: 16, padding: "8px 12px", background: C.offwhite, border: `1px dashed ${C.lightGrey}`, borderRadius: 3 }}>
          <span style={{ color: C.wheatDark, fontSize: 10, fontFamily: "'DM Mono',monospace" }}>
            Active: {RSS_FEEDS.filter(f => sources[f.id] !== false).map(f => f.label).join(" · ")} · Toggle sources above · Refreshes on change
          </span>
        </div>
      )}
    </div>
  );
}
