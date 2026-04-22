# Repo Scan Findings (Captured Feb 27, 2026)

No additional scans were run after your instruction.

## 1) Install / lockfile integrity

- `backend`: `npm ci` fails because `package-lock.json` is out of sync with `package.json`.
  - Reported missing from lock file: `protobufjs@7.5.4`, `@types/markdown-it@14.1.2`, `markdown-it@14.1.1`, `gcp-metadata@7.0.1`.

## 2) Build / typecheck failures

- `admin-panel` build fails:
  - `admin-panel/src/pages/MCamp.tsx:1499:13` `TS1005 ')' expected`
  - `admin-panel/src/pages/MCamp.tsx:1527:9` `TS1128 Declaration or statement expected`
  - `admin-panel/src/pages/MCamp.tsx:1528:5` `TS1109 Expression expected`
  - `admin-panel/src/pages/MCamp.tsx:1529:1` `TS1128 Declaration or statement expected`

- `backend` build fails:
  - Multiple `TS7016` errors for missing typings for `dotenv` (e.g. `src/app.ts`, `src/config/database.ts`, `src/config/firebase.ts`, and several `src/scripts/*` files).
  - `src/modules/upload/upload.controller.ts:6:10` `TS2305` (`pdf-lib` export mismatch: `PDFDocument` not found).

- Root repo `npx tsc --noEmit` fails because root `tsconfig.json` picks up files under `admin-panel`, which includes the same `MCamp.tsx` syntax errors above.

## 3) Lint findings

- `admin-panel` lint: **67 total problems** (**65 errors**, **2 warnings**).
  - Repeated `@typescript-eslint/no-explicit-any` errors across multiple files.
  - `react-refresh/only-export-components` in `admin-panel/src/context/AuthContext.tsx:66`.
  - `@typescript-eslint/no-unused-vars` in multiple places.
  - `react-hooks/exhaustive-deps` warnings in:
    - `admin-panel/src/components/CohortSwitcher.tsx:33`
    - `admin-panel/src/pages/Users.tsx:23`
  - Parsing error at `admin-panel/src/pages/MCamp.tsx:1499`.

## 4) Security audit findings

- Root project:
  - `npm audit` did not produce a usable report.
  - Errors seen:
    - `audit endpoint returned an error`
    - `400 Bad Request ... Invalid package tree, run npm install to rebuild your package-lock.json`

- `admin-panel` audit report:
  - **8 vulnerabilities total**: `2 critical`, `4 high`, `2 moderate`.
  - Includes issues in `jspdf`, `jspdf-autotable`, `axios`, `react-router/react-router-dom`, `rollup`, `minimatch`, `ajv`.

- `backend` audit report:
  - **11 vulnerabilities total**: `5 critical`, `4 high`, `1 moderate`, `1 low`.
  - Includes issues involving `firebase-admin` dependency chain (`@google-cloud/firestore`, `google-gax`, `protobufjs`), plus `axios`, `fast-xml-parser`, `qs`, `minimatch`, `lodash`, `diff`.

## 5) Production build warnings

- Root `vite build` succeeded but warns:
  - Mixed static + dynamic import usage for `services/api.ts` (chunk-splitting not effective).
  - Large output chunk warning:
    - `dist/assets/index-*.js` about **1.55 MB** (gzip about **429 KB**) exceeds recommended chunk threshold.

## 6) Potentially sensitive / questionable committed content

- `test-firebase.ts:7` contains a hardcoded Firebase API key string (`AIza...`).
- `.agent/workflows/mongodb_setup.md` is committed (internal workflow artifact; may not belong in production source repos depending on policy).
- `DEBUG_REPORT.md` contains MongoDB connection string format examples (masked/placeholder style, not a live secret in current content).

## 7) Dependency staleness (from completed outdated checks)

- Root project has multiple outdated packages (examples): `@google/genai`, `firebase`, `pdfjs-dist`, `react-pdf`, `vite`, `typescript`.
- `backend` has major updates available for key deps (examples): `firebase-admin` (`11.11.1 -> 13.7.0`), `express` (`4.x -> 5.x`), `dotenv`, `zod`.
- `admin-panel` outdated check was interrupted before result capture.

