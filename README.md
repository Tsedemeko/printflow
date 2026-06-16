# PrintFlow

PrintFlow is a production-shaped print shop management platform built from the three complementary specification PDFs in this repository:

- `PrintFlow.pdf`
- `PrintFlow_System_Specification.pdf`
- `Printing business system specs.pdf`

The implementation is organized as a TypeScript monorepo:

- `apps/web` - Next.js customer portal, upload/proof links, admin dashboards, and reporting.
- `apps/kiosk` - Expo app for the public customer-facing entrance kiosk.
- `apps/store` - Expo app for staff-only in-store POS, order finalization, jobs/orders, and shop management.
- `apps/api` - Express API, webhooks, payment handlers, notification workers, and integration adapters.
- `packages/shared` - shared domain constants, types, catalog, pricing, deposit rules, workflow, and notification events.
- `supabase` - portable Postgres schema for Supabase-hosted database/storage deployments.

## Requirements Covered

- In-store kiosk and collect-existing-order lookup.
- Assisted counter order finalization and POS.
- Online customer ordering and save/resume quote flow.
- Secure magic artwork upload links.
- Production Kanban and department queues.
- Digital job cards, proofing, preflight warnings, and batch grouping.
- PayFast/Yoco-ready payments with manual cash/EFT/SnapScan/Zapper support.
- SMS/email-first notification adapters with WhatsApp-ready event contracts.
- Admin catalog, pricing, deposit rules, CRM, reports, inventory, staff roles, and order controls.

## Local Development

Install dependencies once network access is available:

```bash
npm install
```

Run each surface:

```bash
npm run dev:web
npm run dev:api
npm run dev:kiosk
npm run dev:store
```

Run checks:

```bash
npm run typecheck
npm run test
```

## Deployment Shape

- Vercel hosts `apps/web`.
- Render hosts `apps/api` and worker processes.
- Supabase can provide Postgres and Storage buckets for artwork/proofs; PrintFlow owns staff users in database tables and issues its own app tokens.
- Provider credentials are configured through environment variables. Local development writes to the API data directory and queues notifications locally; production startup validates required Supabase, PayFast, and Yoco settings before serving traffic.

## Mobile Build Checks

Both mobile apps are separate Expo SDK 52 applications with EAS config:

```bash
cd apps/kiosk
npx expo export --platform android --output-dir .expo-export-test

cd ../store
npx expo export --platform android --output-dir .expo-export-test
```
