# Workshop Registration Service - Project Description

## Stack choices and why

### Frontend

- **React:** Component-based UI suitable for separate role workspaces and reusable forms.
- **Vite:** Fast development server and simple production build for a three-hour assessment.
- **TypeScript:** Provides compile-time safety for API responses, user roles, workshops, and registration states.
- **CSS:** The current MVP uses a small custom CSS layer rather than a large design system. This keeps the interface simple and avoids spending assessment time on visual polish. The selected frontend stack can adopt Tailwind CSS later without changing the API design.

### Backend

- **Node.js and Express:** Familiar, lightweight HTTP API stack with fast iteration.
- **TypeScript:** Keeps request handling, role checks, and database operations typed.
- **Zod:** Validates request bodies and query parameters at the API boundary.
- **JWT:** Stateless authentication that is straightforward for a separate frontend and backend.
- **Helmet, CORS, and Morgan:** Basic HTTP hardening, frontend-to-backend access, and request logging.

### Database

- **PostgreSQL:** Reliable relational storage with transactions and row-level locking, which are important for the workshop capacity rule.
- **Prisma ORM:** Provides typed database access, migrations, schema-driven models, and readable transaction code.
- **bcryptjs:** Stores password hashes rather than plaintext passwords.

## Design decisions

### Role-based access control

The system has three roles:

```text
ADMIN = 0
MANAGER = 1
STAFF = 2
```

The database stores the role as a Prisma enum:

```text
ADMIN
MANAGER
STAFF
```

The backend is the security boundary. JWT authentication identifies the user, and role middleware rejects unauthorized requests with `401` or `403`. Frontend controls are only for usability and are not trusted for security.

Permissions:

| Capability | Admin | Manager | Staff |
|---|---:|---:|---:|
| Create user accounts | Yes | No | No |
| View workshops | Yes | Yes | Yes |
| Create/edit workshops | No | Yes | No |
| View registration history | Yes | Yes | Yes |
| Register attendees | No | No | Yes |
| Cancel registrations | No | No | Yes |

### Workshop model

The Workshop model tracks:

- Unique workshop code
- Title
- Optional description
- Instructor
- Location
- Date and time
- Capacity
- Status
- Created/updated timestamps
- Optional creator/updater references

The creator references are optional because the initial development seed creates sample workshops before a Manager account exists. API-created workshops record the authenticated Manager.

### Registration history

Registrations are never deleted during cancellation. Instead:

```text
ACTIVE -> CANCELLED
```

The record retains the attendee, original registration time, registering user, cancellation time, and cancelling user. This supports accountability and historical reporting.

### Available seats

Available seats are calculated from:

```text
capacity - active registration count
```

Cancelled registrations do not count against capacity.

## How over-registration is prevented

The registration endpoint does not use an unsafe count-then-insert sequence outside a transaction.

For every registration request, the backend:

1. Starts a PostgreSQL transaction.
2. Locks the selected Workshop row using `SELECT ... FOR UPDATE`.
3. Counts active registrations while the lock is held.
4. Rejects the request if active registrations are already equal to capacity.
5. Rejects duplicate active registrations for the same attendee email and workshop.
6. Inserts the registration only when a seat is available.
7. Commits the transaction.

The transaction uses serializable isolation. When several staff members request the last seat at the same time, requests are serialized around the locked workshop row. Only one can create the final active registration; later requests receive a workshop-full response instead of creating an overbooking.

The workshop `status` field is useful for display and filtering, but it is not the only capacity safeguard. The transaction count is the source of truth for registration safety.

## Assumptions

- There is no public signup. The initial Admin is seeded and creates all other accounts.
- Attendees do not have user accounts; staff enter their name and email.
- An attendee email can have only one active registration for a workshop.
- A cancelled attendee can be registered again later because the old record is preserved and a new active registration may be created.
- Managers manage workshops; Admins manage accounts. This follows the assessment permission table.
- Workshop location is required and description is optional.
- A cancelled workshop cannot accept new registrations.
- The current API permits viewing registration history to all authenticated roles.
- JWTs expire after the configured `JWT_EXPIRES_IN` value.
- The current frontend uses `http://localhost:5000/api` as its backend URL for local development.
- Seeded dates are relative to the date the seed runs, so reviewers can demonstrate date and week filtering.

## Trade-offs

- **Simple JWT storage:** The frontend stores the JWT in local storage to keep the assessment implementation small. A production system would consider secure, httpOnly cookies and CSRF protection.
- **No refresh tokens:** A one-day access token keeps the authentication flow simple. A production system would normally use short-lived access tokens and refresh-token rotation.
- **Status is manually stored:** Workshop status is stored for workflow and filtering. Capacity is still calculated from active registrations to avoid trusting a stale status value.
- **No pagination yet:** The assessment dataset is small. Pagination would be needed for a larger catalogue and registration history.
- **No separate service/repository layer:** Controllers are direct and easy to follow for this small challenge. A larger application would extract domain services and repositories.
- **Basic CORS configuration:** CORS currently allows the frontend during local development. A deployed system should restrict allowed origins through environment configuration.
- **Simple frontend navigation:** Role pages are separated using a lightweight in-app page state rather than adding a routing library. This keeps dependencies and setup small for the assessment.

## Skipped or not yet implemented

- Workshop deletion
- User editing, deactivation, and role-change UI
- Waitlist support
- Full audit trail for workshop edits and account changes
- Email notifications
- Password reset and account recovery
- Pagination and server-side sorting
- Automated frontend and backend test suites
- Production deployment and managed secrets
- Tailwind CSS integration; the current MVP uses custom CSS to keep the interface lightweight

These items were intentionally secondary to the assessment priorities: backend authorization, safe capacity enforcement, registration history, and a connected end-to-end frontend.
