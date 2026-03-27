require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const Parser = require('rss-parser');

const app = express();
const parser = new Parser();
const PORT = 3000;

app.set('view engine', 'ejs');

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("DB Error:", err.message);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            title TEXT UNIQUE, summary TEXT, link TEXT, source TEXT, category TEXT, pubDate TEXT
        )`);
    }
});

// Unblockable RSS Feeds
const FEEDS = [
    { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', category: 'All' },
    { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'Tech & AI' },
    { url: 'https://www.npr.org/rss/rss.php?id=1128', category: 'Health' },
    { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', category: 'Finance & Stocks' },
    { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', category: 'Cricket' },
    { url: 'https://www.cbssports.com/rss/headlines/nfl/', category: 'NFL' },
    { url: 'https://www.cbssports.com/rss/headlines/nba/', category: 'NBA' },
    { url: 'https://www.cbssports.com/rss/headlines/mlb/', category: 'MLB' }
];

async function fetchNews() {
    console.log("Fetching latest news from RSS feeds...");
    for (const feed of FEEDS) {
        try {
            const data = await parser.parseURL(feed.url);
            data.items.forEach(item => {
                const title = item.title || 'No Title';
                const link = item.link || '#';
                let summary = item.contentSnippet || item.description || 'No summary available.';
                summary = summary.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...';
                const pubDate = item.pubDate || new Date().toISOString();
                
                db.run(`INSERT OR IGNORE INTO news (title, summary, link, source, category, pubDate) VALUES (?, ?, ?, ?, ?, ?)`,
                    [title, summary, link, feed.url, feed.category, pubDate]
                );
            });
        } catch (error) {
            console.error(`Error fetching ${feed.category}:`, error.message);
        }
    }
    console.log("Finished RSS fetch cycle.");
}

// Routes
app.get('/', (req, res) => {
    db.all("SELECT * FROM news ORDER BY id DESC LIMIT 150", [], (err, rows) => {
        if (err) res.send("Database error.");
        else res.render('index', { newsItems: rows });
    });
});

// Secure Stock API Proxy
app.get('/api/stocks', async (req, res) => {
    const symbols = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL'];
    try {
        const promises = symbols.map(async (sym) => {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${process.env.FINNHUB_KEY}`);
            const data = await response.json();
            return { sym, price: data.c || 0, change: data.d || 0 };
        });
        const stockData = await Promise.all(promises);
        res.json(stockData);
    } catch (error) {
        console.error("Stock fetch error:", error);
        res.status(500).json({ error: "Failed to fetch market data" });
    }
});

// Boot Engine
app.listen(PORT, () => {
    console.log(`Stream24 server is running on http://localhost:${PORT}`);
    fetchNews();
    setInterval(fetchNews, 30 * 60 * 1000); // 30 mins
});