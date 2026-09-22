# Revision 3

This file supersedes Revision 2 wherever behavior differs.

## Changes
- Green Active/Activate and red Inactive/Deactivate controls.
- Required registered Staff selection in Add Customer; fixed customer assignment shown on details.
- Send Document first saves the image/PDF, then sends through the configured Admin WhatsApp Business API to the assigned Staff's registered phone. Request-supplied Staff/recipient and uploader phone are ignored.
- Upload form precedes saved documents. Selected images have clickable thumbnail previews; PDFs have preview links. Saved eye icons open an in-site preview rather than a new tab. No Actions column or Staff dropdown in customer details.
- Replace appears beside Send Document only while a new file is selected, allowing correction before sending. There is no saved-document selector or replacement control.
- WhatsApp failures leave documents saved and show an error with a Retry WhatsApp button. API acceptance is displayed as acceptance, not guaranteed delivery.
- History uses lastActivityAt descending, with a stable ID tie-breaker. Recent puts the current operator’s latest addition/upload first. Creation and document upload/replacement update activity. History date filters now also use activity time. No sort control; server ignores old sort parameters.
- Home/Recent starts empty and contains only customer additions/document uploads performed in the current login and page visit. It clears on refresh, navigation to another page, or sign-out. No other login activity or historical customer list is loaded into Recent.
- My WhatsApp removed; navbar shows Role · Name.
- Admin can reset any account password, including their own. Existing passwords remain bcrypt hashes and cannot be viewed. Resets revoke existing sessions. Passwords require at least 8 characters, at most 72 UTF-8 bytes.

## Upgrade
1. Back up the existing database and deploy backend and frontend together.
2. Preserve backend environment configuration, especially MongoDB, Cloudinary and Admin WhatsApp API credentials. No secrets are included in this archive.
3. Run `npm ci` in backend and frontend, then `npm run build` in frontend. Start backend as before.
4. Startup migration backfills last activity from creation/document timestamps. It links older customers automatically only when their existing document Staff references identify exactly one registered Staff. Customers without a clear historical assignment remain unassigned; no additional Admin assignment panel or endpoint is included. Such legacy records require a deliberate database assignment before WhatsApp sending; the application never guesses a receiver. Historical document labels remain unchanged.
5. Existing rolling retention remains based on original customer creation, as in Revision 2; recent activity does not extend retention.

## Requested corrections
- Notifications auto-dismiss after 7 seconds, restarting the timer for each new notification.
- Image and PDF previews open inside the site for both selected files and saved documents.
- Deactivate/Activate controls retain readable text in normal, hover, focus and disabled states.
- Password controls say Reset Password. Show password reveals only the new and confirmation fields, never an existing password hash.

## Verification
15 backend tests pass, including recipient isolation, automatic sending on upload/replacement, password hashing/session invalidation, admin access restrictions, activity ordering and failed delivery handling. Frontend production build and ESLint pass.

Live MongoDB/Cloudinary/WhatsApp integration has not been exercised with production credentials. No real messages were sent. Verify an end-to-end upload on staging with your configured WhatsApp templates and Staff number before release.

## Activity rows update (latest behavior)
History now shows one row for customer creation and one row for each saved document, sorted by each event's timestamp newest first. Repeated customer names are intentional; clicking any row opens that customer's normal full detail screen. History pagination totals and date filters refer to activity rows. Search still finds distinct customers.

Recent records each successful customer creation or document upload by the current operator as a separate temporary row, including consecutive entries for the same customer. It clears on page navigation, refresh or logout and never loads other users' activity. WhatsApp retries do not add upload entries.

Saved documents inside the customer detail screen are also shown newest first.

Deploy frontend and backend together: History now calls GET /api/customers/history. No new collection or database migration is required for this change; history derives rows from creation timestamps and existing saved documents. Previously overwritten/deleted documents cannot be reconstructed. Automatic customer retention also removes their history entries.

Verification: 15 backend tests, frontend build and lint passed. History controller tests use a mocked database; live database and browser end-to-end verification were not performed.
