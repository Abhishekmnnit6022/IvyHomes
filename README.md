# Ivy Property Explorer

A React/Vite frontend for the Hyderabad-scoped Ivy Homes API. It provides real login, persisted and refreshable sessions, browsing with client-verified filters, URL-addressable listing details, server-backed saved listings, rental/project browsing, and a data-quality-led insights view.

## Run locally

1. Copy `.env.example` to `.env` and set the issued API key.
2. Run `npm install`.
3. Run `npm run dev`.

The key is deliberately environment configuration rather than application source. The app stores the returned session in localStorage and transparently uses the documented-by-server refresh flow when an access token expires.

## Frontend architecture

- `src/api.js` centralizes authenticated requests, refresh retries, and offset pagination.
- `src/hooks/useListings.js` shows the first page quickly, then caches the complete local search index for five minutes.
- `src/lib/format.js` holds the API-specific area and price normalizations in one testable place.
- `src/components/` contains reusable presentation components.
- `src/App.jsx` composes pages, routing, saved-listing state, and user-facing error states.

Short comments are included only around the non-obvious API behaviors: token refresh, progressive loading, and data-unit corrections.

## How the API was audited

I started with small live requests, retained error bodies, then downloaded each collection by following the response's `offset`, returned `limit`, and `has_more` fields. This was necessary because the apparent `total` on listings was 4,063 while the server truthfully continued through 4,400 records.

I then treated the collections as datasets rather than individual listings:

- Normalized name variants and stable unit attributes to identify 63 duplicate records.
- Checked geometry, floor ranges, price sign, bedroom/bathroom constraints, and carpet-vs-super-area to identify 50 impossible records.
- Converted small listing areas from m² to ft², low per-ft² listing price values to total price, and project prices from mixed lakh/crore notation into INR.
- Flagged repeated coercive booking/token-payment suffixes as the fraud cohort.
- Compared live listings grouped by `project_id` with project-reported totals.

`submission.json` contains the reproducible answers and only findings I personally observed.

## Hypotheses that did not pan out

- Repeated seller contacts alone were not fraud: many legitimate agents advertise multiple homes.
- Shared coordinates were not duplicate properties: projects commonly share a coordinate across distinct units.
- Zero bedrooms are valid for plots, so they were excluded from the invalid-bedroom rule.
- The API itself was responsive and consistent about returned-page metadata; this was a documentation/data audit, not a reliability issue.


