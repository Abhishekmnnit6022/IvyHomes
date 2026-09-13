# Ivy Property Explorer

A React/Vite frontend for the Hyderabad-scoped Ivy Homes API. It provides real login, persisted and refreshable sessions, browsing with client-verified filters, URL-addressable listing details, server-backed saved listings, rental/project browsing, and a data-quality-led insights view.

## Links

- Repository: https://github.com/Abhishekmnnit6022/IvyHomes
- Live demo: https://ivyhomes-project.vercel.app

## Run locally

1. Copy `.env.example` to `.env` and set the issued API key.
2. Run `npm install`.
3. Run `npm run dev`.

The API key is kept in environment configuration rather than application source. The app stores the returned session in `localStorage` and uses the server refresh flow when the access token expires.

## Frontend architecture

- `src/api.js` centralizes authenticated requests, refresh retries, and offset pagination.
- `src/hooks/useListings.js` shows the first page quickly, then caches the complete local search index for five minutes.
- `src/lib/format.js` holds the API-specific area and price normalizations in one testable place.
- `src/components/` contains reusable presentation components.
- `src/App.jsx` composes pages, routing, saved-listing state, and user-facing error states.

Comments are limited to non-obvious API behavior such as token refresh, progressive loading, pagination, and data-unit corrections.

## What the application implements

The implementation is centered on the six required frontend flows:

- Real authentication with persisted sessions and token refresh.
- Listing browsing with client-side filtering for locality, bedrooms, price range, and furnishing.
- URL-addressable listing detail pages.
- Per-user saved listings that persist across reloads and re-login.
- Rental and project browsing with normalized prices and areas.
- An insights view built from the retrievable collections because the documented analytics endpoint is unavailable.

## How the API was audited

I treated the API documentation as a hypothesis rather than as ground truth.

I started with small live requests, retained error bodies, and then downloaded each collection by following the response's `offset`, returned `limit`, and `has_more` fields until pagination ended. This was necessary because the listings response reported a `total` of 4,063 while the server continued through 4,400 records.

I then treated the collections as datasets rather than individual listings:

- Normalized project/name variants and stable unit attributes to identify 63 duplicate records, leaving 4,337 distinct properties.
- Checked geometry, floor ranges, price sign, bedroom constraints, carpet-vs-super-area, and Hyderabad coordinate bounds to identify 50 impossible records.
- Converted small listing areas from m² to ft², reconstructed the ten low listing prices that were actually price-per-square-foot values, and normalized project prices from mixed lakh/crore notation into INR.
- Clustered repeated booking-payment, token-payment, and time-pressure language and manually reviewed the matches to identify the fake-listing cohort.
- Compared live listings grouped by `project_id` with each project's reported listing total to find inconsistent project counts.
- Verified that the singular documented listing route returns 404 while `/v1/listings/{id}` serves the detail response.
- Verified that `/v1/analytics/summary` returns 404, so the insights screen derives its information from the collection data.

The same audit produced the final `submission.json` answers and the API findings, with evidence identifiers where the assignment requires record-level evidence.

## Final audit results

These are the values recorded in `submission.json`:

| Metric | Result |
|---|---:|
| Total listing records | 4,400 |
| Unique properties | 4,337 |
| Active listings | 3,477 |
| Corrupt listing records | 50 |
| Total monthly rent | ₹59,90,100 |
| Average 2BHK price / sq ft | ₹10,088.89 |
| Costliest project | P20384 |
| Costliest project max price | ₹4,15,00,000 |
| Listings in the 7-day reference window | 141 |
| Fake listing records | 72 |
| Projects with wrong listing count | 129 |

The complete `corrupt_listing_ids` and `fake_listing_ids` lists are kept in `submission.json` rather than duplicated here.

## API findings submitted

The final submission records these reproduced discrepancies:

1. **Authentication (`auth`)** — the key must be sent as `X-API-Key`; login returns `access_token` and `refresh_token`, with a 900-second access token and `/auth/refresh`.
2. **Pagination (`pagination`)** — collections use zero-based `offset`, the effective limit is capped at 50, and following `has_more` reaches 4,400 listings despite the reported total of 4,063.
3. **Inactive listings (`completeness`)** — `/v1/listings` includes 923 records with `is_live: false`, so the frontend filters active inventory explicitly.
4. **Listing detail route (`missing_endpoint`)** — the documented `/v1/listing/{id}` returns 404; the served route is `/v1/listings/{id}`.
5. **Analytics route (`missing_endpoint`)** — `/v1/analytics/summary` returns 404, so the insights view computes its information from the collections.
6. **Listing units/prices (`units`)** — some small carpet areas are m² and ten low price values are rupees per square foot rather than total prices.
7. **Project price units (`units`)** — project price values use mixed lakh/crore notation and are normalized to INR.
8. **Duplicate records (`duplicates`)** — 63 records collapse under normalized project/locality/unit attributes.
9. **Impossible records (`data_quality`)** — 50 records contain impossible physical, pricing, or geographic fields.
10. **Fake listings (`fraud`)** — 72 records match the reproduced booking/token-payment/time-pressure fraud pattern.
11. **Project count mismatch (`consistency`)** — 129 project totals disagree with their linked live-listing counts.

Record-level findings include the evidence IDs required by the assignment. The findings list intentionally contains only discrepancies personally reproduced during the audit.

## What checked out fine

Several hypotheses were tested and rejected rather than being reported as findings:

- Repeated seller contacts alone were not treated as fraud because legitimate agents can advertise multiple homes.
- Shared coordinates were not treated as duplicates because projects commonly share a coordinate across distinct units.
- Zero-bedroom records were not automatically considered invalid because plots can legitimately have zero bedrooms.
- The API itself was not classified as unreliable: responses were consistent about returned-page metadata, and error bodies were useful. The problem was inaccurate documentation and inconsistent data semantics, not API availability.

These checks were kept separate from the findings so the submission distinguishes reproduced discrepancies from plausible but unsupported theories.

## Use of AI/tools

I used an LLM as part of the development and audit workflow, as permitted by the assignment. I still validated the API behavior against live responses and treated the resulting hypotheses as untrusted until reproduced with the assigned API key. The final findings and answer values were based on the observed API data, not generated assumptions.

## What I would do with another two days

I would spend the additional time on reliability, test coverage, and making the audit easier to maintain:

- Add automated tests around authentication refresh, pagination, filtering, unit normalization, duplicate grouping, fraud heuristics, and the 2BHK price-per-square-foot calculation.
- Add a small audit/debug view that shows raw versus normalized values and the reason a record is excluded from insights.
- Improve loading states and error recovery, especially around token expiry and partial collection loading.
- Add a reproducible audit script that downloads the collections from the fixed reference moment and regenerates the answer fields and evidence lists.
- Add CI checks for linting, tests, and a production build before deployment.

## Submission

`submission.json` is kept at the repository root and contains the details , all ten graded answers, the complete corrupt/fake listing ID lists, the project-count result, and the reproduced API findings with evidence identifiers.

