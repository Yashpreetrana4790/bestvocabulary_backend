# Scraping Protection & Considerations

This document describes measures in place to make the site more resistant to bulk scraping and what to consider going forward.

## What’s in place

### 1. **Rate limiting**
- **General API** (`apiLimiter`): Applied to all `/api` routes. Default: 100 requests per 15 minutes per IP. Configure via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
- **Auth** (`authLimiter`): Stricter on auth routes (e.g. 5 attempts per 15 min), skip count on success.
- **List endpoints** (`listLimiter`): Applied to `GET /api/v1/words/words` (dictionary list). 60 requests per minute per IP. Slows down bulk page-by-page scraping.

### 2. **Capped list size**
- **Word list** (`getAllWords`): `limit` is capped at **50** per request (default 12). Prevents single requests from pulling huge chunks (e.g. 10,000 words at once).

### 3. **URL design**
- Word detail uses **word text** in the path (e.g. `/word/serendipity`), not sequential IDs. Makes it harder to iterate by ID.

### 4. **Security baseline**
- **Helmet**: Security headers.
- **CORS**: Restricted to allowed origins.
- **Mongo sanitization**: Reduces injection risk.
- **Robots**: `robots.txt` and meta robots control indexing; you can disallow or limit aggressive crawlers if needed.

## What to consider next

- **Stricter list limiter**: Lower `listLimiter` (e.g. 30/min) if you see heavy scraping; balance with normal users on dictionary/search.
- **Search/semantic endpoints**: Apply a similar per-minute limiter to search/semantic APIs if they become targets.
- **Bot detection**: For signup/login, consider CAPTCHA or similar after repeated failures (auth limiter already limits attempts).
- **Honeypots**: In forms, add hidden fields to detect simple bots.
- **Terms of use**: Explicitly prohibit bulk scraping and automated collection in your ToS.
- **Monitoring**: Log 429s and high request rates per IP to spot abuse and tune limits.
- **Crawl-delay**: Your `robots.txt` uses `Crawl-delay: 1`; note that Google ignores it; it mainly affects polite crawlers.

## Pagination and UX

- Pagination is **URL-based** (e.g. `?page=2`), so results are shareable and bookmarkable.
- **Limit** is capped server-side; frontend can offer 12/24/48 per page.
- Keeping **total count** is useful for users; the combination of list rate limit + limit cap makes full-dump scraping slower and noisier.
