# Workshop Registration Service

A full-stack workshop registration system for a community training centre. The application provides role-based staff access, workshop management, attendee registration, cancellation history, and capacity-safe registration.

## Features

- JWT login for Admin, Manager, and Staff users
- Backend-enforced role permissions
- Admin user creation for Manager and Staff accounts
- Manager workshop creation and editing
- Workshop fields for code, title, description, instructor, location, date/time, capacity, and status
- Workshop filters by status and available seats
- Staff attendee registration and cancellation
- Registration history retained after cancellation
- Registration audit information showing who registered/cancelled and when
- Transaction-safe capacity checks for concurrent registrations
- PostgreSQL persistence through Prisma ORM

## Project structure

```text
workshop-registration-service/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── postman/
│   │   └── workshop-registration.postman_collection.json
│   └── src/
└── frontend/
    └── src/
```

## Prerequisites

Install the following before starting:

- Node.js 20 or later
- npm
- PostgreSQL 14 or later
- Git

Check the versions:

```powershell
node --version
npm --version
psql --version
```

## 1. Create the PostgreSQL database

Create an empty PostgreSQL database named `workshop_registration` using pgAdmin or the PostgreSQL shell:

```sql
CREATE DATABASE workshop_registration;
```

The default local PostgreSQL connection used by this project is:

```text
postgresql://postgres:YOUR_PASSWORD@localhost:5432/workshop_registration?schema=public
```

## 2. Configure the backend

Open PowerShell in the repository root:

```powershell
cd "C:\Users\Nivethan\Desktop\Kenora_Assesment\workshop_registration_platform\workshop-registration-service"
```

Install backend dependencies:

```powershell
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example` and update the PostgreSQL password:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/workshop_registration?schema=public"
PORT=5000
JWT_SECRET="replace-with-a-secret-at-least-20-characters-long"
JWT_EXPIRES_IN="1d"
NODE_ENV="development"
```

The `.env` file is intentionally ignored by Git.

## 3. Create tables and seed development data

Run these commands from `backend`:

```powershell
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

The seed creates only the initial Admin and four sample workshops. The Admin must create Manager and Staff accounts through the application.

Development Admin credentials:

```text
Email: admin@workshops.local
Password: Admin@12345
```

### First-time account setup

There is intentionally no public signup page. The first-time workflow is:

1. Sign in with the seeded Admin credentials.
2. Open **Users & permissions**.
3. Click **Create Manager / Staff** or **Create account**.
4. Enter the person's name, email, password, and role.
5. Create one Manager account and one Staff account.
6. Sign out and sign in with the new role-specific account.

The Admin user-management page lists all accounts and their roles. The API also enforces this rule, so Manager and Staff users cannot create accounts by calling `POST /api/users` directly.

The sample workshop dates are calculated relative to the day the seed runs, so date-based demonstrations remain useful.

To inspect the database:

```powershell
npm run prisma:studio
```

To reset a local development database only:

```powershell
npx prisma migrate reset
npm run prisma:seed
```

Never run `prisma migrate reset` against production data.

## 4. Run the backend

From `backend`:

```powershell
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

Useful backend commands:

```powershell
npm run build
npm start
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## 5. Run the frontend

Open a second PowerShell window:

```powershell
cd "C:\Users\Nivethan\Desktop\Kenora_Assesment\workshop_registration_platform\workshop-registration-service\frontend"
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

The frontend currently calls:

```text
http://localhost:5000/api
```

Both the backend and frontend must be running.

## Role workflows

### Admin

- Sign in
- Open **Users & permissions**
- Click **Create Manager / Staff**
- Create Manager and Staff accounts by choosing the role in the form
- Review all created accounts and their roles
- View workshops and registration history

### Manager

- Sign in with the account created by Admin
- Open **Workshops**
- Create workshops with location and description
- Edit existing workshops
- Filter workshops by status or available seats
- View registration history

### Staff

- Sign in with the account created by Admin
- Search/filter workshops
- Select a workshop
- Register an attendee by name and email
- View active and cancelled registration history
- Cancel an active registration

## Postman collection

Import:

```text
backend/postman/workshop-registration.postman_collection.json
```

The collection uses `http://localhost:5000` and demonstrates:

1. Health check
2. Admin login
3. Manager and Staff creation
4. Manager login
5. Workshop creation
6. Staff login
7. Workshop filtering
8. Attendee registration
9. Registration history
10. Registration cancellation

Run requests in the order shown in the collection because later requests use tokens and IDs saved by earlier requests.

## API overview

```text
POST   /api/auth/login

GET    /api/users
POST   /api/users

GET    /api/workshops
GET    /api/workshops/:id
POST   /api/workshops
PATCH  /api/workshops/:id

GET    /api/registrations/workshop/:workshopId
POST   /api/registrations/workshop/:workshopId
POST   /api/registrations/:id/cancel
```

Authenticated routes require:

```text
Authorization: Bearer <jwt-token>
```
