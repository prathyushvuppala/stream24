# Stream24 🔴

A real-time, automated news aggregator built with Node.js and SQLite.

## The Architecture

This project is designed to be a lightweight, zero-maintenance news engine:

- **Backend:** Node.js with Express handles the routing and server logic.
- **Database Engine:** SQLite stores the live feed. A built-in script acts as a daily cron job, executing a `DELETE FROM news` command every 24 hours to keep the database lightweight and the news fresh.
- **Data Pipeline:** The `rss-parser` library asynchronously pulls down feeds from 7 distinct global sources (Times of India, State.gov, Cricket Times, etc.), sanitizes the data, checks for duplicates, and injects it into SQLite.
- **Frontend:** Server-side rendered EJS templates styled with a modern, dark-themed Tailwind CSS "Bento Grid".

## How to Run Locally

1. Clone the repository.
2. Run `npm install` to grab the dependencies.
3. Run `node server.js` to boot the engine and start the RSS fetcher.
4. Navigate to `http://localhost:3000`.
