# API Surface

Base route groups:

- `GET /health`
- `POST /auth/login`
- `GET /auth/session`
- `GET /catalog/products`
- `POST /catalog/products`
- `PATCH /catalog/products/:id`
- `DELETE /catalog/products/:id`
- `GET /catalog/deposit-rules`
- `POST /catalog/deposit-rules`
- `PATCH /catalog/deposit-rules/:id`
- `DELETE /catalog/deposit-rules/:id`
- `GET /catalog/discount-rules`
- `POST /catalog/discount-rules`
- `PATCH /catalog/discount-rules/:id`
- `DELETE /catalog/discount-rules/:id`
- `GET /admin/staff`
- `POST /admin/staff`
- `PATCH /admin/staff/:id`
- `DELETE /admin/staff/:id`
- `GET /admin/permissions`
- `GET /customers`
- `GET /customers/:id`
- `GET /orders`
- `POST /orders`
- `GET /orders/:id`
- `GET /orders/lookup/:reference`
- `POST /orders/:id/status`
- `GET /counter/queue`
- `POST /counter/queue/:orderId/acknowledge`
- `POST /counter/queue/:orderId/resolve`
- `POST /artwork/:orderId`
- `POST /proofs/:orderId/send`
- `POST /proofs/:orderId/approve`
- `POST /payments/:orderId`
- `POST /payments/:orderId/receipt`
- `POST /payments/payfast/checkout`
- `POST /payments/yoco/intent`
- `GET /production/board`
- `GET /production/batches`
- `GET /inventory`
- `POST /inventory`
- `PATCH /inventory/:id`
- `DELETE /inventory/:id`
- `GET /notifications`
- `POST /notifications/test`
- `GET /reports/summary`
- `GET /admin/dashboard`
- `POST /webhooks/payfast`
- `POST /webhooks/yoco`

Protected staff routes require `Authorization: Bearer <PrintFlow staff token>`. Staff accounts live in the business database `profiles` table, with `password_hash`, roles, access areas, and active status. `POST /auth/login` verifies the password hash and issues an app-signed token using `APP_AUTH_SECRET`.

Local development still accepts `x-staff-roles` as a dev-only fallback so the app remains runnable before database credentials are available. That fallback is disabled in `NODE_ENV=production`.

Local development persists operational data to `PRINTFLOW_DATA_DIR/printflow.local.json` and artwork binaries to `PRINTFLOW_DATA_DIR/storage`. When database credentials are configured, the API hydrates from tables on startup and persists catalog, customers, orders, items, artwork, proofs, payments, inventory, notifications, counter queue tickets, and staff profiles back to the database. Artwork binaries are written to configured storage. In `NODE_ENV=production`, required database/storage and provider credentials are validated at API startup.
