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

You need Node.js 20+ and a local MongoDB server. MongoDB Compass is optional; it is only a visual database browser.

1. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a long random value.
2. Make sure MongoDB is running at `mongodb://127.0.0.1:27017` (or change `MONGODB_URI`).
3. From the repository root, run:

```bash
npm install
npm run seed
npm run dev
```

The website opens at `http://localhost:5173`; the API runs at `http://localhost:5000`. Vite forwards `/api` calls to the API automatically.

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

## Images and optional services

The demo uses optimized remote photography and does not require a storage or AI key. Database image fields accept URLs. A production deployment should connect the existing image fields to private/public Cloudinary upload endpoints before allowing untrusted uploads. Verification documents should always use private authenticated storage.

AI is intentionally not required. Normal JavaScript keyword extraction and matching keep the complete demo flow working offline from AI services.

## Security notes

Passwords are bcrypt-hashed and never returned. JWTs use HTTP-only cookies. The API enforces role and ownership checks, keeps customer contact data out of matched requests, limits authentication and message requests, applies Helmet and controlled CORS, and only displays verified badges for database-verified businesses. Do not deploy until `JWT_SECRET`, `CLIENT_URL`, HTTPS, database access controls and trusted image hosting are configured.

## MVP limitations and future work

This MVP deliberately excludes online payments, escrow, delivery logistics, paid advertising, compulsory GPS and national expansion. Likely future work includes Cloudinary upload completion, email/push notification delivery, payments, delivery partners, richer analytics and support for more Nigerian cities.
