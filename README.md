# Expense Tracker

A minimal full-stack personal expense tracker built with FastAPI and Vanilla JS.

**Live App:** https://yashtiwarii.github.io/sensible  
**Backend API:** https://sensible-backend-ndx9.onrender.com/docs

---

## Features

- Add expenses with amount, category, description, and date
- Filter expenses by category
- Sort by date (newest/oldest first)
- Paginated expense list with Load More
- Total amount for current filtered view
- Spending summary per category
- Idempotent expense creation — safe against retries and page refreshes

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI + Python |
| Database | SQLite |
| Frontend | Vanilla HTML/JS/CSS |
| Backend Deploy | Render |
| Frontend Deploy | GitHub Pages |

---

## Key Design Decisions

### Money Handling
Amount is stored as `INTEGER` (paise) in SQLite — never as float. ₹10.50 is stored as `1050`. Python `Decimal` is used throughout for arithmetic. This prevents floating point corruption on financial data.

### Idempotency
`POST /expenses` requires an `Idempotency-Key` header (UUID). The key is stored with a `UNIQUE` constraint in the DB — duplicate requests use `INSERT OR IGNORE` and return the existing record. On the frontend, the key is persisted in `sessionStorage` before the request fires, so page refreshes mid-submit reuse the same key and don't create duplicate expenses.

### Persistence — SQLite
SQLite was chosen for zero infrastructure overhead and full SQL support for filtering and sorting. It is a legitimate choice for a single-user personal finance tool.

**Known limitation:** Render's free tier has an ephemeral filesystem — SQLite data resets on redeploy. In production, this would be replaced with PostgreSQL on a managed service.

### Filtering and Sorting — Backend
Filtering (`WHERE category = ?`) and sorting (`ORDER BY date DESC`) are handled in SQL, not in JS. This keeps the frontend stateless and ensures correctness at scale.

### Pagination
Limit/offset pagination with a default page size of 20. The response includes `count` (total matching records) so the frontend knows when to hide the Load More button without making an extra request.

Cursor-based pagination would be more correct for production (avoids offset drift on concurrent inserts) — deferred as out of scope for this timebox.

### Categories
Seeded with 6 defaults (Food, Transport, Utilities, Entertainment, Health, Other). New categories typed by the user are auto-created on expense submission and appear in the filter dropdown on next load.

### Frontend
No framework — Vanilla JS with `fetch()`. Sufficient for the feature set and keeps the bundle size at zero. Debounce (300ms) on filter changes prevents API spam on rapid switching.

---

## Trade-offs Made for Timebox

- No authentication — single user assumed
- SQLite instead of PostgreSQL — acceptable for single-user, noted above
- No automated tests — would add pytest integration tests for idempotency and money handling as first priority
- Cursor-based pagination deferred — limit/offset is correct for this scale
- Client-side cache removed — introduced stale state bugs; debounce is sufficient protection

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
# Open frontend/index.html in browser
# Or serve with: python -m http.server 3000 (from frontend/)
```

---

## API Reference

```
POST /expenses          Create expense (requires Idempotency-Key header)
GET  /expenses          List expenses (?category=&sort=date_desc&limit=20&offset=0)
GET  /categories        List categories with per-category totals
```