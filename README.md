# Greenwood School ERP — Full-Stack Monorepo

Enterprise School & Student Management ERP rebuilt with a modern, type-safe full-stack architecture.

---

## 🛠️ Tech Stack

### 📱 Frontend (`apps/client`)
- **Framework**: React Native with **Expo SDK 57**
- **Router**: **Expo Router** (file-based navigation with layouts & route groups)
- **Styling**: **Tailwind CSS v4** + responsive styles
- **State & Caching**: **TanStack React Query v5**
- **Contracts & Validation**: **Zod**
- **Language**: TypeScript

### ⚙️ Backend (`apps/api`)
- **Framework**: **NestJS v11**
- **Authentication**: **Passport + JWT** with role-based guards (`ADMIN`, `STAFF`, `STUDENT`)
- **Security**: **Helmet** security headers + **bcryptjs** password hashing + CORS
- **Validation**: **class-validator**, **class-transformer**, and shared **Zod** contracts
- **API Documentation**: **Swagger UI** at `http://localhost:3000/api/docs`
- **Language**: TypeScript

### 🗄️ Database & ORM
- **Database**: **PostgreSQL 16** (Alpine) containerized via **Docker Compose**
- **ORM**: **Prisma ORM v6** with automated schema synchronization and seed scripts

### 🏗️ Monorepo Architecture
- **Workspaces**: npm workspaces (`apps/*`, `packages/*`)
  - `apps/api` → NestJS v11 REST API
  - `apps/client` → Expo React Native (Web, iOS, Android)
  - `packages/contracts` → Shared Zod validation schemas & types

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **Docker & Docker Compose**: running on your machine

### 2. Start PostgreSQL 16
```bash
docker compose up -d
```

### 3. Install Dependencies & Initialize Database
```bash
npm install
npm run build --workspace=@erp/contracts
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run Backend API
```bash
npm run dev:api
```
- API Base URL: `http://localhost:3000/api`
- Swagger Docs: `http://localhost:3000/api/docs`

### 5. Run Frontend Expo App
```bash
npm run dev:client
```
- Or run web directly:
```bash
npx expo start --web --workspace=@erp/client
```

---

## 🔑 Default Login Credentials (Pre-seeded)

| Role | User ID / Username | Password | Notes |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Full access to student records, staff payroll, fees, exams, notices & accounts |
| **Staff / Teacher** | `ST001` | `staff123` | Senior Teacher (Priya Sharma) - assigned Class 8 Mathematics |
| **Staff / Teacher** | `ST002` | `staff123` | Teacher (Amit Verma) - assigned Class 7 Science |
| **Student** | `STU001` | `student123` | Aarav Patel - Class 8 A |
| **Student** | `STU002` | `student123` | Diya Sharma - Class 8 A |

---

## 📁 Repository Structure

```
Student-management/
├── apps/
│   ├── api/                     # NestJS v11 REST backend
│   │   ├── prisma/              # schema.prisma & seed.ts
│   │   └── src/
│   │       ├── auth/            # Passport JWT, guards, login
│   │       ├── students/        # Student CRUD & public admissions
│   │       ├── staff/           # Staff management & salary calculations
│   │       ├── attendance/      # Student & staff attendance tracking
│   │       ├── fees/            # Fee collections & receipt numbering
│   │       ├── exams/           # Exam schedules & marks entry
│   │       ├── notices/         # Announcement board with audience targeting
│   │       └── accounts/        # Operational income & expense ledger
│   └── client/                  # Expo SDK 57 React Native application
│       ├── app/                 # Expo Router file-based pages
│       │   ├── index.tsx        # School showcase & admission form
│       │   ├── (auth)/login.tsx # Unified portal login
│       │   ├── (admin)/         # Admin dashboard & management screens
│       │   ├── (student)/       # Student report card, attendance & fee ledger
│       │   └── (staff)/         # Teacher dashboard, salary slip & attendance
│       └── src/                 # React Query hooks, services, and components
├── packages/
│   └── contracts/               # Shared Zod validation schemas
├── legacy/                      # Archived original HTML/JS/CSS static prototype
├── docker-compose.yml           # PostgreSQL 16 Alpine configuration
└── package.json                 # Monorepo root workspaces configuration
```
