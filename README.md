> **Latest update:** Start with [BOTLINKD-SETUP.md](BOTLINKD-SETUP.md). It supersedes older WhatsApp/API and UI instructions below.

# CustomerHub — Revision 2

Start with [UPGRADE-REVISION-2.md](UPGRADE-REVISION-2.md) for setup, migration and operational details.

React + Vite frontend; Express + MongoDB backend; Cloudinary uploads; Meta WhatsApp sending.

Login roles: Admin and User. Non-login Staff directory is separate. Table-based customer records support multiple Staff-tagged documents, explicit Send to the logged-in account, image replacement, temporary Recent, live search, sortable/filterable History and rolling retention.

Keep existing backend/.env when upgrading. For local frontend set VITE_API_URL=/api. Install and run npm run dev separately in backend and frontend.
