# CustomerHub — BotLinkd update

This guide supersedes the WhatsApp instructions in earlier revision notes.

## Upgrade and run (Windows PowerShell)

1. Stop the old backend and frontend terminals with Ctrl+C. Extract this ZIP into a fresh folder. Keep your existing MongoDB and Cloudinary configuration; do not delete your database.
2. Copy your existing backend `.env` into the new backend folder. Add the BotLinkd settings below. For a fresh setup, copy `backend/.env.example` to `backend/.env` and fill MongoDB, JWT, initial admin and Cloudinary values too.
3. From the project root:

```powershell
cd backend
npm install
npm run dev
```

4. In a second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev -- --port 5175 --strictPort
```

Open http://localhost:5175. The Vite `/api` proxy forwards to backend port 5000. If using another frontend origin directly, add it to backend `CLIENT_URL`. Do not run multiple old backend copies on port 5000. Keep port 5000 unless also updating the Vite proxy.

## BotLinkd account setup

Your BotLinkd account must have an active official WhatsApp Cloud API platform. Copy App Key and Auth Key for that platform into backend `.env` only. The documented image sending path requires an approved media template in addition to those keys.

Create two templates in BotLinkd and wait for approval:

- IMAGE header, e.g. `customer_document_image`, with body `A document for customer {{1}} is attached.`
- DOCUMENT header, e.g. `customer_document_pdf`, with the same one-variable body, if PDFs are used.

These are suggested names/text; approval and exact language are controlled by your account/provider. Set the actual approved names and language below. Upload the sample media requested by the provider during template creation.

```dotenv
BOTLINKD_APP_KEY=your_app_key
BOTLINKD_AUTH_KEY=your_auth_key
BOTLINKD_IMAGE_TEMPLATE=customer_document_image
BOTLINKD_DOCUMENT_TEMPLATE=customer_document_pdf
BOTLINKD_TEMPLATE_LANGUAGE=en
BOTLINKD_BODY_PARAMS=["{customerName}"]
BOTLINKD_PLATFORM_ID=
BOTLINKD_PLATFORM_NAME=
```

For existing templates, match their body placeholder order: `BOTLINKD_BODY_PARAMS` is a JSON array of strings, with `{customerName}` replaced at send time. Use `[]` if there are no body variables. Optional platform selectors are only needed if your BotLinkd account requires them. Restart backend after changing `.env`. Old `WHATSAPP_*` settings are no longer used.

The backend sends multipart POST requests to `https://botlinkd.com/api/whatsapp/template` with `appkey`, `authkey`, `to`, `template`, `language`, indexed `body_params`, and either `header_image_url` or `header_document_url`. PDF also supplies `header_document_filename`.

## Save and send

Register Staff with an international WhatsApp number, e.g. `923001234567`, and select that Staff when adding the customer. Open the customer, select the image/PDF, and press **Send Document**. The app uploads to Cloudinary and saves the document first, then sends it to the customer's assigned Staff through BotLinkd. It does not send to the logged-in user's number.

A rejected request or timeout does not remove the saved document. Use **Retry WhatsApp** in Saved documents, including after reopening the record. After a timeout, check the recipient's WhatsApp first; the request may already have been accepted, so a retry could duplicate it. The app does not automatically retry ambiguous sends.

“API accepted” means the provider accepted the request, not confirmed device delivery or reading. Delivery/read webhooks are not implemented. Real account delivery needs your credentials, approved template, active plan and reachable media URL.

Cloudinary media must have a direct public HTTPS URL. If PDF access is disabled in your Cloudinary account, enable PDF delivery as appropriate or use images; verify the URL opens without login. API credentials must never go into frontend files.

## Other requested changes

- Register Staff has Delete and an “Are you sure?” confirmation. Existing customer/document records and saved Staff names remain. Sending to a deleted Staff is blocked; deletion does not silently redirect messages to another number.
- Admin account Activate/Deactivate buttons are grey and disabled; backend also protects admin status.
- Save Customer closes the add form and shows a success popup, without opening the customer or adding a Recent entry.
- Recent contains document-save entries only, retaining the previous session/page clearing behavior. History still retains all activities, including customer creation.
- Clicking search displays up to 15 customers ordered by latest activity first, including newly added customers; typing filters name/city. Escape or focus outside closes it.
- History date filters have no time control. Both selected days are included using the browser's local timezone. The activity table still displays timestamps.
- Admin Login accepts admins only; User Login accepts users only. Staff directory entries are not login accounts.

## Troubleshooting / acceptance check

1. Login as admin using Admin Login. Verify the same credentials are rejected in User Login and vice versa.
2. Register a test Staff number you control. Add a customer assigned to it. Confirm only the success popup appears and Recent remains unchanged.
3. Click empty search and select the newly created customer. Send a sample image. Confirm document appears in Saved documents and Recent, and check the Staff phone.
4. For failures check template name/language/body variable count, IMAGE vs DOCUMENT header, API allowance, connected platform, recipient number and public media access. The saved file remains available.
5. Delete a mistakenly registered Staff, first canceling to confirm cancellation works. Admin status controls should stay disabled.
6. Check History with the same From/To date; entries through the end of that day should appear.

Automated tests use mocked provider requests; no real WhatsApp messages were sent during development.

## Official sources (reviewed 22 September 2026)

- https://botlinkd.com/api-documentation/quick-start
- https://botlinkd.com/api-documentation/template-message
- https://botlinkd.com/api-documentation/template-media
- https://botlinkd.com/api-documentation/errors
- https://botlinkd.com/api-documentation/examples
