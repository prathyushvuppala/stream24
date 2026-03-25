const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const path = require('path');
const Parser = require('rss-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const parser = new Parser();

// App Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new sqlite3.Database('./stream24.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create the news table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            link TEXT,
            pubDate TEXT,
            source TEXT,
            summary TEXT,
            category TEXT
        )`);
    }
});

// Cron Job: Clear news database every 24 hours at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Executing daily cleanup: Deleting old news records...');
    db.run('DELETE FROM news', (err) => {
        if (err) {
            console.error('Error clearing news table:', err.message);
        } else {
            console.log('News table cleared successfully for the new day.');
        }
    });
});

// RSS Feeds Configuration
const feeds = [
    { category: 'Top Stories', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { category: 'Geopolitics', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { category: 'USA Policy', url: 'https://rss.politico.com/politics-news.xml' },
    { category: 'Global News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
    { category: 'Cricket', url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml' },
    { category: 'Washington Local News', url: 'https://www.seattletimes.com/seattle-news/feed/' },
    { category: 'Tech', url: 'https://www.theverge.com/rss/index.xml' }
];

// Helper: Truncate summary to 200 characters and clean HTML
const truncateSummary = (text, maxLength = 200) => {
    if (!text) return 'No summary available.';
    const cleanText = text.replace(/(<([^>]+)>)/gi, "");
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength).trim() + '...';
};

// Fetch News Function
const fetchNews = async () => {
    console.log('Fetching latest news from RSS feeds...');
    for (const feed of feeds) {
        try {
            const parsedFeed = await parser.parseURL(feed.url);
            const source = parsedFeed.title || feed.category;

            parsedFeed.items.forEach(item => {
                const title = item.title;
                const link = item.link;
                const pubDate = item.pubDate || new Date().toISOString();
                const summary = truncateSummary(item.contentSnippet || item.content || item.description);

                // Duplicate Protection: Check if link already exists
                db.get(`SELECT id FROM news WHERE link = ?`, [link], (err, row) => {
                    if (!err && !row) {
                        db.run(
                            `INSERT INTO news (title, link, pubDate, source, summary, category) VALUES (?, ?, ?, ?, ?, ?)`,
                            [title, link, pubDate, source, summary, feed.category]
                        );
                    }
                });
            });
        } catch (error) {
            console.error(`Error fetching feed for ${feed.category}:`, error.message);
        }
    }
    console.log('Finished RSS fetch cycle.');
};

// Starter Trigger & Live Refresh (30 minutes)
fetchNews();
setInterval(fetchNews, 30 * 60 * 1000);

// Routes
app.get('/', (req, res) => {
    db.all('SELECT * FROM news ORDER BY pubDate DESC LIMIT 50', [], (err, rows) => {
        if (err) {
            console.error('Error fetching news:', err.message);
            res.status(500).send('Database error');
        } else {
            res.render('index', { newsItems: rows || [] });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Stream24 server is running on http://localhost:${PORT}`);
});