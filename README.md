# Arihant Public School ERP

Full-stack school ERP using the existing agreed stack: Expo/React Native, NestJS, PostgreSQL, Prisma and JWT. The workspace is an npm monorepo.

## Implemented scope

- Secure `ADMIN`, `EMPLOYEE` and `STUDENT` accounts with temporary-password enforcement, session revocation, deactivation and login lockout.
- Database-backed `STU000001` / `EMP000001` sequences.
- Academic years, classes, sections, subjects, school calendar, enrollment history and teacher/class-teacher assignments.
- Scoped student and employee attendance with audit history and Asia/Kolkata date rules.
- Effective salary revisions, fixed 30-day draft calculations, finalization and partial payment transactions.
- Class/year fee structures, per-student fee snapshots, manual receipts, credit balances and Razorpay test-order/signature verification.
- Timetable conflict validation, assessments, distinct absent/not-entered results and publication controls.
- Audience-aware notices, linked cash ledger and critical audit events.
- Responsive role portals with loading, empty and error states; no fabricated dashboard values.

Parent portal, library/transport/hostel modules, homework submission, automated bank salary payout and report-card PDF remain outside this release.

## Workspace

Run every command below from:

```text
C:\Users\DELL\Desktop\erp2\new erp chatgpt\School-Management
```

## First-time setup

Prerequisites: Node.js 20+, npm, Docker Desktop with Docker Compose.

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
npm run prisma:generate
npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name arihant_erp_foundation
npm run prisma:seed
```

Before migration, edit `.env` and set a long random `JWT_SECRET`. Add Razorpay **test** credentials only when testing online fees. `ALLOWED_ORIGINS` must explicitly list each frontend origin.

The compose file uses a new `pgdata_arihant` volume, so the old prototype `pgdata` volume is left intact. If you intentionally want to migrate real legacy records, stop here and perform a reviewed staging migration/mapping for old `STAFF`, class strings, fee records and results; do not reset either volume.

## Run locally

Open two PowerShell terminals in the workspace directory.

Terminal 1 — backend:

```powershell
npm run dev:api
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

Terminal 2 — Expo frontend:

```powershell
npm run dev:client
```

Then press `w` for web, `a` for Android emulator, or scan the Expo QR code on a compatible device.

Direct web command:

```powershell
npm run web --workspace=@erp/client
```

## Seed administrator

- Login ID: `admin`
- Temporary password: `Arihant@2026`
- First login requires an immediate password change and revokes the temporary session afterward.

The seed intentionally creates only foundation data: administrator, academic year 2026–27, Classes 1–12 with Section A, core subjects and fee structures. It does not generate fake students, employees, attendance, results or collections.

## Production notes

- Use HTTPS, a production-grade JWT secret and restricted origins.
- Use Razorpay live keys only after test-mode verification and webhook/reconciliation review.
- Schedule PostgreSQL backups and verify a restore before launch.
- Apply migrations to staging first and reconcile counts, balances and relationships before production.
