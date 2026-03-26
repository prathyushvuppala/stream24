const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const Parser = require('rss-parser');

const app = express();
const parser = new Parser();
const PORT = 3000;

app.set('view engine', 'ejs');

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("DB Error:", err.message);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            title TEXT UNIQUE, summary TEXT, link TEXT, source TEXT, category TEXT, pubDate TEXT
        )`);
    }
});

// Updated, Reliable Data Sources
const FEEDS = [
    { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', category: 'All' },
    { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'Tech & AI' },
    { url: 'https://www.npr.org/rss/rss.php?id=1128', category: 'Health' },
    { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', category: 'Finance & Stocks' }, // MarketWatch
    { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', category: 'Cricket' }, // ESPN Cricinfo
    { url: 'https://www.cbssports.com/rss/headlines/nfl/', category: 'NFL' }, // CBS Sports
    { url: 'https://www.cbssports.com/rss/headlines/nba/', category: 'NBA' }, // CBS Sports
    { url: 'https://www.cbssports.com/rss/headlines/mlb/', category: 'MLB' }  // CBS Sports
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
                // Clean HTML tags and truncate
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

app.get('/', (req, res) => {
    db.all("SELECT * FROM news ORDER BY id DESC LIMIT 150", [], (err, rows) => {
        if (err) res.send("Database error.");
        else res.render('index', { newsItems: rows });
    });
});

app.listen(PORT, () => {
    console.log(`Stream24 server is running on http://localhost:${PORT}`);
    fetchNews(); // Initial fetch
    setInterval(fetchNews, 30 * 60 * 1000); // Fetch every 30 minutes
});