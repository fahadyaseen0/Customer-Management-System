# CustomerHub — Revision 2

## Upgrade without losing local configuration

1. Stop both terminals with Ctrl+C. Keep your old project folder and take a database backup before upgrading.
2. Extract this archive into a new folder.
3. Copy your existing backend/.env into the new backend folder. Do not overwrite your credentials with blank examples.
4. Set frontend/.env to VITE_API_URL=/api for local use. Vite proxies /api to port 5000 so changing frontend ports no longer creates a CORS mismatch.
5. In backend run npm install, then npm run dev. In a separate frontend terminal run npm install, then npm run dev.
6. Open the exact URL printed by Vite and sign in using the existing account.
7. Open My WhatsApp and save your own international number. Every sending Admin/User needs one.
8. Admin Panel → Register Staff creates field salesperson directory records without logins.

## Migration

On startup, existing login accounts with the old staff role are converted to user. They keep the same passwords, IDs and status. Staff directory records are separate and have no authentication fields.

Existing single images become the first document on their customer record. Their original links and Saved By values are kept. Staff is labelled "Legacy upload — staff not recorded" because the old seller account cannot reliably identify the new field salesperson. No legacy field salesperson is invented.

Migration is repeatable: records already containing documents are not migrated again. Customer createdAt remains unchanged. Scheduled retention still applies to old records on startup, so back up data first.

## Daily workflow

- Home contains a temporary Recent table only. A newly created customer or document upload moves that customer to the top. Browser refresh clears Recent, not the database.
- Search by customer name or city. Select a dropdown match to open the record.
- History shows all records, paginated, with newest/oldest sort and date/time range filters.
- Add Customer asks for name and city. Saved By is the authenticated user and cannot be selected.
- Each customer has multiple documents. Pick registered Staff before a new upload; press Save Document.
- Use the eye link to open the image/PDF. Replace Image replaces only that document, retains Staff, updates its upload attribution/time and clears its previous sending status.
- Send is explicit, not automatic on upload. It always uses the authenticated account's WhatsApp number. Staff phone numbers and client-supplied recipient values cannot override it.
- Admin alone sees summary metrics and can create/deactivate login Users, register Staff and set retention.

## WhatsApp configuration and limitations

WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN configure the one system-wide WhatsApp Business sender. Each account's My WhatsApp value is its receiver number; changing it does not change the sender.

For approved media-header templates, use WHATSAPP_TEMPLATE_NAME for images and WHATSAPP_DOCUMENT_TEMPLATE_NAME for PDF documents. Templates must match this payload: one media header and no body variables. Otherwise configure the provider/template code for your template.

Without templates the app sends a free-form media message, which is subject to Meta's messaging window rules. Provider approval, recipient eligibility and credentials must be configured by the owner.

"API accepted" means Meta accepted the API request, not confirmed delivery/read status. Delivery webhooks are not implemented. Failed/not-configured results are shown and the document remains saved.

Admin sending follows exactly the same recipient rule. If the Admin's recipient number is also the configured Business sender number, the provider may reject self-messaging; this code does not silently redirect to someone else.

## Retention

Hourly and startup checks delete customer records older than the selected 1 or 2 calendar months, based on customer createdAt. Month-end dates are clamped correctly. All attached images are removed first; if an asset deletion fails the record is kept for retry. The in-process job requires the backend to remain running; use one backend instance for this build.

## Deployment

Production frontend VITE_API_URL must be the HTTPS backend URL ending /api unless your host proxies /api. Vite's proxy exists only during local development. CLIENT_URL must match the production frontend origin.

Cloudinary assets retain the inherited URL-based access behavior: anyone with a document URL may be able to view it. The application API requires login, but these links are not signed/private document links.

## Validation

Run npm test in backend; run npm run lint and npm run build in frontend.
Tests cover calendar retention, authenticated WhatsApp routing (mock provider), role restrictions, revoked sessions and multiple-document model validation.
No live customer database or real WhatsApp messages were used during development verification.
Nine automated tests passed, plus frontend lint and production build. Browser visual verification could not run because the Chromium download timed out; UI and real provider integration still need owner-side acceptance testing.
