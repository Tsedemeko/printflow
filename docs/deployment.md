# Deployment Notes

## Vercel Web

Deploy `apps/web` from the repository root with:

- Build command: `npm run build --workspace apps/web`
- Output directory: `apps/web/.next`
- Environment: `NEXT_PUBLIC_API_URL`

## Render API

Deploy `apps/api` as a Node service:

- Build command: `npm install && npm run build`
- Start command: `npm run start --workspace apps/api`
- Environment: API, `APP_AUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, PayFast, Yoco, email, and SMS variables from `.env.example`

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor or migration pipeline.

Staff users are PrintFlow-owned records in the `profiles` table, not Supabase Auth users. For the first deploy, set `BOOTSTRAP_OWNER_EMAIL` and `BOOTSTRAP_OWNER_PASSWORD`; if the database has no staff rows, the API seeds the owner profile with a hashed password. After the first owner exists, additional staff can be created from Staff & Roles.

Create storage buckets:

- `artwork`
- `proofs`

Recommended bucket policy:

- Customers use signed upload URLs for their specific order token.
- Staff can read/write artwork and proof files based on role.
- Public access stays disabled by default.

## Payment Providers

- PayFast handles online deposit/full-payment checkout and posts confirmations to `/webhooks/payfast`.
- Yoco handles in-store card payment intents and callbacks where merchant SDK/API access allows.
- Cash, EFT, SnapScan, Zapper, and manual external payments are recorded through `/payments/:orderId`.

## Notification Providers

The first production channel set is SMS/email. Configure real providers behind the API adapter environment variables. The event model already includes WhatsApp so Meta WhatsApp Cloud API can be added without changing order workflow logic.

## Expo Apps

There are two Expo apps:

- `apps/kiosk`: public customer-facing kiosk app.
- `apps/store`: staff-facing store operations app.

Both apps call the API when `EXPO_PUBLIC_API_URL` is set. Start them separately:

```bash
npm run dev:kiosk
npm run dev:store
```

Current native OS support policy:

- Android: configured for Android 12+ by setting `minSdkVersion` to API 31. No maximum Android SDK is set, so newer Android versions are allowed.
- iOS: configured for iOS 15.1+ because Expo SDK 52 / React Native 0.76 cannot support iOS 12. No maximum iOS version is set, so newer iOS versions are allowed.
