# PrintFlow Requirements Coverage

The three PDFs are complementary and collectively authoritative. This map keeps every module visible during implementation.

## Customer Entry

- In-store kiosk: `apps/kiosk/App.tsx`, `apps/api/src/routes.ts`, `packages/shared/src/catalog.ts`
- Guided customization: `packages/shared/src/catalog.ts`, `apps/web/app/order/OrderWizard.tsx`, `apps/kiosk/App.tsx`
- Collect existing order: API lookup route `/orders/lookup/:reference`, Expo kiosk collect tile
- Pre-order/queue numbers: `apps/api/src/store.ts`
- Paperless SMS/email links: `packages/shared/src/notifications.ts`, API notification queue

## Assisted Counter and POS

- Counter finalization: `apps/store/App.tsx` and API order/payment routes
- Artwork intake: `/artwork/:orderId`, magic upload page, Supabase Storage schema
- Mockup/proof/preflight: `packages/shared/src/preflight.ts`, web upload/proof pages, API proof routes
- Pricing/deposits: `packages/shared/src/pricing.ts`, `packages/shared/src/deposits.ts`
- Receipts/transaction history: API payment model and `payments` table

## Online Portal and Magic Links

- No-account ordering: `apps/web/app/order/page.tsx`
- Product wizard and quote: `OrderWizard.tsx`
- Save/resume contract: API-ready order source and status model
- Magic upload link: `apps/web/app/upload/[orderId]/page.tsx`, `/artwork/:orderId`
- Design proof approval: `/proofs/:orderId/send`, `/proofs/:orderId/approve`

## Production Workflow

- Kanban statuses: `packages/shared/src/workflow.ts`
- Department queues: `packages/shared/src/constants.ts`
- Digital job cards: `apps/web/app/production/page.tsx`, `apps/store/App.tsx`, API order model
- Batch grouping: `groupProductionBatches()` and `/production/batches`
- Inventory decrement on completion: API store completion transition

## Business Operations

- Catalog/pricing/deposit rules: shared package and Supabase tables
- CRM/reordering/artwork history: customers, orders, artwork tables and admin views
- Inventory: API inventory route and Supabase inventory tables
- Reports: `/reports/summary`, `/admin/dashboard`, admin web view
- Staff roles/security: shared constants, Supabase `profiles` table, API auth session contract

## Integrations

- Supabase: schema in `supabase/schema.sql`, env contract in `.env.example`
- PayFast: `/payments/payfast/checkout`, `/webhooks/payfast`
- Yoco: `/payments/yoco/intent`, `/webhooks/yoco`
- SMS/email: notification adapter contract in API and shared notification events
- WhatsApp: event/channel type is ready for provider activation after templates/business verification
