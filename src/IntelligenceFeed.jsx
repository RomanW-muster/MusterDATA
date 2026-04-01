import { useState, useEffect } from "react";

const RSS_FEEDS = [
  "https://api.rss2json.com/v1/api.json?rss_url=https://graincentral.com/feed",
  "https://api.rss2json.com/v1/api.json?rss_url=https://commodity.com/feed/",
  "https://api.rss2json.com/v1/api.json?rss_url=https://www.nasdaq.com/feed/rssoutbound?category=commodities",
  "https://api.rss2json.com/v1/api.json?rss_url=https://feeds.marketwatch.com/marketwatch/marketpulse/",
];

async function fetchRssArticles() {
  const results = await Promise.all(
    RSS_FEEDS.map(url =>
      fetch(url)
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

  useEffect(() => {
    setLoading(true);
    fetchRssArticles()
      .then(data => {
        setArticles(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to load feeds.");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.wheatDark, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 4 }}>
          INTELLIGENCE FEED
        </div>
        <div style={{ color: C.charcoal, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
          {loading ? "Loading live Ag news…" : error ? error : `${articles.length} articles · Grain Central · Commodity.com · Nasdaq · MarketWatch`}
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
            Sources: Grain Central · Commodity.com · Nasdaq Commodities · MarketWatch · Refreshes every 5 min
          </span>
        </div>
      )}
    </div>
  );
}
