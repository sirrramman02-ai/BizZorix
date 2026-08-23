# BizZorix

BizZorix is a mobile-first local business discovery and request-to-quotation platform for Akure, Ondo State. Customers can search trusted businesses or post one clear request, receive relevant local offers, compare them, choose a business, communicate, complete the work, and leave a verified review.

The memorable flow is: **post what you need → match with local businesses → receive real quotations → compare and choose**.

## What is included

- Customer, business-owner, and admin accounts with secure HTTP-only cookie sessions
- Verified business profiles, service listings, prices, search, area/category filters, and saved businesses
- Three-step mobile request form with keyword extraction and transparent score-based matching
- Matched-request workspace, real quotations, offer comparison and transactional acceptance
- Request-specific conversations, notifications, completion and verified reviews
- Business profile management, dashboard metrics and verification submission
- Akure Guide Map with business markers, optional consent-based location and external turn-by-turn directions
- BizZorix Move logistics hub with dispatch quotation comparison, verified trust profiles, RouteShare savings, private Pickup/Delivery DropCodes, automatic dispatcher replacement, and low-data tracking
- Unified `BZX-AKR-…` product tracking codes that combine business preparation and optional delivery progress in one customer view
- Admin statistics, verification queue, moderation models, categories and Akure areas
- Realistic fictional Akure demo businesses, services, requests, matches, offers, promotions, messages, and reviews
- Responsive layouts for phone, tablet and desktop

## Technology

The client uses React, Vite, React Router and Lucide icons. The API uses Node.js, Express, MongoDB/Mongoose, JWT cookies, bcrypt, Helmet, CORS, rate limiting and Zod. All application files are JavaScript or JSX—there is no TypeScript.

## Folder structure

```text
src/                  React application
  components/         Shared interface components
  data/               Public demo/reference content
server/src/           Express API
  app.js               Routes and authorization
  models.js            Mongoose models and indexes
  matching.js          Keyword extraction and match scoring
  seed.js              Complete fictional demo dataset
```

## Run locally

You need Node.js 20+. A local MongoDB server is recommended but no longer required for authentication development. When MongoDB is unavailable, BizZorix first tries a temporary development database. On older CPUs that cannot run it, the API automatically uses compatibility authentication mode so registration, login and sessions still work. Accounts in compatibility mode reset whenever the API restarts. Full request persistence requires MongoDB. MongoDB Compass is optional; it is only a visual database browser.

1. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a long random value.
2. For persistent data, run MongoDB and keep the provided `MONGODB_URI`. For the automatic temporary development database, remove or comment out `MONGODB_URI` in `.env`.
3. From the repository root, run:

```bash
npm install
npm run dev
```

The website opens at `http://localhost:5173`; the API runs at `http://localhost:5000`. Vite forwards `/api` calls to the API automatically. Run `npm run seed` separately only when using persistent MongoDB.

## Demo accounts

All demo accounts use the development-only password `Demo1234!`.

- Customer: `customer@bizzorix.demo`
- Business owner: `business@bizzorix.demo`
- Administrator: `admin@bizzorix.demo`

Never reuse this password or the example JWT secret in production. All seeded businesses are fictional competition demo data.

## Useful commands

```bash
npm run dev       # client and API together
npm run seed      # reset and load demo data
npm test          # important unit tests
npm run build     # production client build
npm start         # production API process
```

## Matching logic

Matches are calculated rather than hard-coded. An exact category contributes 35 points, keyword overlap up to 30, the same area 20, a served area 10, and current request availability 5. Only matches scoring 45 or higher are saved, and the reasons are stored for both dashboards.

## Delivery safety

Dispatch offers show the fee, pickup/arrival estimate, rating, completed deliveries, identity verification, response rate, and cancellation rate. After accepting an offer, the API generates separate six-digit Pickup and Delivery DropCodes and stores only bcrypt hashes. The pickup code confirms collection of the correct item; the recipient keeps the delivery code private until the item has been received and checked. Normal delivery queries never return either code or hash.

RouteShare detects recent open deliveries with the same pickup and destination areas and can apply a shared-route saving. If an assigned dispatcher cancels before pickup, the replacement endpoint selects the next suitable offer while preserving the delivery request and timeline.

Each recorded product arrangement receives a unique `BZX-AKR-…` tracking code. The business-side status covers confirmation, preparation, ready-for-pickup and collection. If the customer requests BizZorix Move using that code, the same tracking screen adds dispatcher assignment, pickup, in-transit and delivery milestones. Tracking requires the connected customer account; knowing another customer’s code is not enough to access their order.

## Images and optional services

The demo uses optimized remote photography and does not require a storage or AI key. Database image fields accept URLs. A production deployment should connect the existing image fields to private/public Cloudinary upload endpoints before allowing untrusted uploads. Verification documents should always use private authenticated storage.

AI is intentionally not required. Normal JavaScript keyword extraction and matching keep the complete demo flow working offline from AI services.

## Security notes

Passwords are bcrypt-hashed and never returned. JWTs use HTTP-only cookies. The API enforces role and ownership checks, keeps customer contact data out of matched requests, limits authentication and message requests, applies Helmet and controlled CORS, and only displays verified badges for database-verified businesses. Do not deploy until `JWT_SECRET`, `CLIENT_URL`, HTTPS, database access controls and trusted image hosting are configured.

## MVP limitations and future work

This MVP deliberately excludes online payments, escrow, paid advertising, compulsory GPS and national expansion. Logistics requests coordinate a local delivery partner but do not yet include live driver telemetry, automatic dispatch or online delivery payment. Likely future work includes Cloudinary uploads, push notifications, payments, vetted partner onboarding, live tracking, richer analytics and support for more Nigerian cities.
