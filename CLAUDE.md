# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CareShare is a medicine-donation platform (final-year project). Donors list medicines, recipients request them (with a prescription image), and an admin approves or rejects requests. The README describes an idealized layout (`frontend/`, `backend/`, `ai/`, `automation/n8n/`) that **does not match the actual code**. The real code is in two folders:

- `fypBackend-main/`: Express + Mongoose API (CommonJS) on port **4000**
- `fypFrontend-main/`: Create React App (React 18, MUI, react-router v6) on port **3000**

`CareShare/`, `CareShare-main1/` and `CareShare-AI/` (an empty nested git repo) contain no code.

## Commands

```bash
# Install (root package.json only holds a couple of stray frontend deps)
npm install && (cd fypBackend-main && npm install) && (cd fypFrontend-main && npm install)

# Run both services together (also creates fypBackend-main/uploads/prescriptions)
node start.js

# Run them separately
cd fypBackend-main && node index.js        # or: npm start  (nodemon is installed but has no script)
cd fypFrontend-main && npm start

# Frontend build / tests (CRA + Jest; there are currently no test files)
cd fypFrontend-main && npm run build
cd fypFrontend-main && npm test -- --watchAll=false
cd fypFrontend-main && npm test -- -t "test name"   # run a single test

# Smoke-test running services (backend :4000, Gemini service :5000, frontend :3000)
node test-services.js
```

There is no backend test suite and no lint script beyond CRA's built-in ESLint (`react-app` config), which runs during `npm start` and `npm run build`.

## Environment

- `fypBackend-main/.env`: `mongo_URL`, `jwt_secret` (both lowercase, exactly as written), `EMAIL_USER` and `EMAIL_PASSWORD` (a Gmail app password, used by nodemailer). See `env-template-backend.txt`.
- The backend also reads `PORT` (default 4000).
- `fypFrontend-main/.env` (see `env-template-frontend.txt`): `REACT_APP_API_URL`, `REACT_APP_PERPLEXITY_API_KEY` (used by `Chatbot.js`, the chatbot mounted in `App.js`) and `REACT_APP_GEMINI_API_KEY` (used by `GeminiAudioChatbot.js`). These values are built into the frontend files, so anyone visiting the site can read them.
- `requirements.txt` and `env-template.txt` refer to a Python/Flask Gemini audio service on port 5000. **That service's source is not in this repo.**

## Architecture

### Backend (`fypBackend-main/`)
- `index.js` loads `db.js` (connects Mongoose using `mongo_URL`), registers every model, then mounts every router at the root with `app.use(router)`. Routes have no prefix; for example `/signin`, `/donate`, `/medicineRequest`.
- Models are always fetched with `mongoose.model('Name')` after `require('../model/Name')`, not with the module's export. `troubleshooting.md` documents the `Donate.findOne is not a function` error that the other style causes.
- `middleware/authTokenRequired.js` (JWT Bearer check that sets `req.user`) exists, but no route uses it. **All API endpoints, admin ones included, are unauthenticated.**
- Auth (`routes/authRoutes.js`): bcrypt + a 2h JWT. `/signin` returns `{token, data: role}`, where role is `donor`, `admin` or `receipient` (spelled that way throughout, including the `/receipient` endpoint). The role is stored in `User.userRole`.
- Domain collections:
  - `Donate`: donated medicine listings. `status` is a free string; `/askDonator` lists them, and `/approveStatus` and `/askDonator/:id` let admins edit them.
  - `MedicineRequest`: a recipient's request. Upload goes through multer into `uploads/prescriptions/`, which is served statically at `/uploads`. `status` is one of `pending`, `approved` or `rejected`, and a pre-save hook stamps approval or rejection dates. Approve, reject and send-email actions email the requester through nodemailer.
  - `Ask`, `Contact`: legacy medicine asks and contact-form submissions.
- OCR: `routes/ocrRoutes.js` runs tesseract.js on the server, with `eng.traineddata` at the backend root. `routes/geminiRoutes.js` contains stubs that echo their input; the real Gemini calls happen in the frontend.

### Frontend (`fypFrontend-main/src/`)
- `App.js` defines every route. Public and user pages live in `MyWebsite/`; admin pages live in `adminPanel/` (`pages/`, `pages/medicines/`, `components/`), and the admin sidebar state is held in a zustand store (`adminPanel/appStore.jsx`).
- Whether a path counts as an admin page is decided by a hard-coded prefix list in `App.js`. That list hides the chatbot, so when you add an admin route, add its path there too.
- Auth is client-side only. The JWT is saved in `localStorage.clientToken` (`{token, ...}`), and `components/ProtectedRoute.jsx` only checks the token's `exp`. Admin routes are not wrapped in `ProtectedRoute`.
- Components call the backend with `` `${API_URL}/...` ``, where `API_URL` comes from `src/config.js` (`REACT_APP_API_URL`, or `http://localhost:4000` if it isn't set). It is fixed when the frontend is built. Use this constant in new code; never hard-code the URL. There is no shared axios instance.
- `public/.htaccess` sends any URL that isn't a real file to `index.html`, so React Router pages still load on refresh when the site is served by Apache or LiteSpeed.
- UI uses MUI v5 (theme in `theme.js` / `components/ThemeProvider.jsx`), with some antd, sweetalert2, leaflet and framer-motion.

## Root utility scripts (destructive)

`cleanup-database.js`, `cleanup-specific-collections.js`, `quick-cleanup.js` and `direct-cleanup.js` delete MongoDB data, and `backup-database.js` dumps it to JSON. Several of these expect to be run from inside `fypBackend-main/`, because they use `./model/...` and `.env` paths relative to that folder. Never run them unless the user explicitly asks. `fypBackend-main/utils/update-medicine-status.js` bulk-changes `Donate` status from `pending` to `approved`.
