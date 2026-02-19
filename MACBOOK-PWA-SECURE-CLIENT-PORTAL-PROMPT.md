# Secure Mac-Hosted Loan Management PWA (Client Portal + Admin)  
## Phased Modular Build Prompt (Pseudo-code + Security Requirements)

Use this document as a "copy/paste prompt" for your AI coding assistant (Cursor/ChatGPT/etc.).  
It is intentionally phased to support modular development, with security and acceptance criteria at each step.

---

## 0) Prompt Header (paste this into your AI tool)

You are a senior full-stack architect and security-minded engineer. Build a Mac-hosted (macOS) web application delivered as a PWA for loan management, with:

- Admin users: full access to all features (create clients, create loans, process payments, adjustments, statements).
- Client users: online-only access, restricted to their own loan account(s), self-management features (read-only at first, then controlled actions).
- Strict security baseline: modern authentication, authorization (RBAC + row-level checks), audit logging, secure PWA caching rules, and safe deployment on a Mac host.

Constraints:
- Clients must not access other clients' data.
- The PWA should not cache sensitive API responses (PII/financials) for offline access.
- The system must maintain an audit trail of all loan changes (payments, adjustments, status changes), and statements must be generated from the audit trail.

Output requirements:
- Implement one phase at a time.
- For each phase: provide code, migrations, tests, and a short "how to run" section.
- Do NOT skip security requirements or tests.
- Ask clarifying questions only when truly blocking; otherwise, proceed with sensible defaults and clearly list assumptions.

---

## 1) Recommended Architecture (modular by design)

### 1.1 High-level components

1) Web/PWA Frontend
- Admin UI
- Client portal UI
- Shared UI components and API client

2) Backend API (authoritative business logic)
- Auth (sessions, MFA for admin)
- Users/Clients
- Loans (create, update, adjust)
- Payments (record, reconcile)
- Statements (API-driven, PDF generation)
- Audit/Event ledger

3) Database
- Users, Clients, Loans, Payments, LoanEvents (audit trail)
- Sessions / refresh tokens

4) Reverse proxy + TLS on Mac
- Caddy or nginx for HTTPS, HSTS, and request limits

### 1.2 Suggested stack (choose one and be consistent)

Option A (TypeScript end-to-end, good for PWAs):
- Backend: Node.js + TypeScript + Fastify (or Express) + Zod validation
- DB: PostgreSQL (preferred) OR SQLite (small installs) via Prisma
- Frontend: React + Vite + TypeScript
- Auth: server-side sessions in secure HttpOnly cookies (recommended)

Option B (Python):
- Backend: Django + Django REST Framework
- DB: PostgreSQL or SQLite
- Frontend: Django templates or React/Vite

This prompt assumes Option A, but the phases still apply to any stack.

---

## 2) Security Baseline (must-haves)

### 2.1 Authentication
- Password hashing: Argon2id (preferred) or bcrypt with a strong cost.
- No plaintext passwords ever.
- Session-based auth using secure cookies:
  - Set-Cookie: HttpOnly; Secure; SameSite=Lax (or Strict if workable)
  - Short session TTL + idle timeout
  - Session rotation on login and privilege changes
- Admin MFA: TOTP (time-based one-time password) required (at minimum).
- Account lockout / rate limiting on login and password reset endpoints.
- Optional: "invite-only" client registration (safer than open signup).

### 2.2 Authorization (RBAC + row-level)
- Roles: ADMIN, CLIENT
- Every request must pass BOTH:
  - RBAC: can this role access this action?
  - Ownership: does the resource belong to this client?
- Never rely on client-provided IDs for access control.
- Enforce in backend with middleware / policy layer.

### 2.3 Data protection
- TLS everywhere (HTTPS).
- DB backups encrypted.
- Avoid storing PII in localStorage/sessionStorage/IndexedDB.
- API responses for sensitive data:
  - Cache-Control: no-store
  - Pragma: no-cache
  - Disable SW caching of /api and PDF endpoints

### 2.4 OWASP basics
- Input validation (schema validation) on every API boundary.
- Output encoding; avoid DOM XSS.
- Content Security Policy (CSP) suitable for your frontend.
- CSRF protection if using cookies for auth:
  - CSRF token on all state-changing requests OR use SameSite + double-submit tokens.
- Security headers:
  - Strict-Transport-Security (HSTS)
  - X-Content-Type-Options: nosniff
  - Referrer-Policy
  - Permissions-Policy
  - X-Frame-Options or CSP frame-ancestors 'none'

### 2.5 Audit logging (non-negotiable)
- Record ALL loan mutations as append-only events:
  - payments
  - adjustments
  - status changes
  - admin actions (create/disable users, role changes, impersonation)
- Each event should store:
  - who performed it (actor user id, role)
  - when (timestamp)
  - what changed (before/after snapshots or diff)
  - why (reason/notes when relevant)

---

## 3) Data Model (start simple, evolve)

### 3.1 Core tables (pseudo-schema)

TABLE users
  id (uuid)
  email (unique)
  password_hash
  role ENUM('ADMIN','CLIENT')
  client_id (nullable; required if role=CLIENT)
  mfa_totp_secret (nullable; required for ADMIN once MFA enabled)
  mfa_enabled (bool)
  status ENUM('ACTIVE','DISABLED')
  created_at, updated_at

TABLE clients
  id (uuid)
  full_name
  account_number (unique)
  phone (nullable)
  email (nullable)
  created_at, updated_at

TABLE loans
  id (uuid)
  public_loan_number (human friendly, unique)
  client_id (fk clients.id)
  status ENUM('ACTIVE','COMPLETED','DEFAULTED','CLOSED')
  loan_type ENUM('STANDARD','STOCKVEL')
  principal_amount
  term_months
  monthly_payment
  created_at, updated_at

TABLE loan_events  (append-only ledger)
  id (uuid)
  loan_id (fk loans.id)
  event_type ENUM('CREATED','PAYMENT','ADJUSTMENT','STATUS_CHANGE','NOTE')
  actor_user_id (fk users.id)
  actor_role
  timestamp
  reason (nullable)
  before_json (nullable)   -- snapshot of relevant fields
  after_json (nullable)
  diff_json (nullable)     -- optional computed diff for rendering
  metadata_json (nullable) -- payment breakdown, top-up amount, etc.

TABLE sessions (or refresh_tokens)
  id (uuid)
  user_id (fk users.id)
  session_hash
  created_at
  expires_at
  revoked_at (nullable)

Notes:
- Keep loan_events as the authoritative statement timeline.
- You can render statements by combining loan base fields + loan_events.

---

## 4) API Design (resource + policy oriented)

### 4.1 Auth endpoints (session-based)

POST /auth/login
  input: { email, password, totp? }
  output: { user: { id, role, clientId? } }
  side effects: sets session cookie

POST /auth/logout
  side effects: clears session cookie; revokes session server-side

GET /auth/me
  output: profile + permissions summary

POST /auth/mfa/setup (ADMIN only)
  output: { otpauth_url, qr_code }

POST /auth/mfa/verify (ADMIN only)
  input: { totp }
  output: mfa_enabled=true

### 4.2 Client portal endpoints (CLIENT role)

GET /client/loans
  policy: role=CLIENT; returns only loans where loan.client_id == user.client_id

GET /client/loans/:loanId
  policy: role=CLIENT; ownership check

GET /client/loans/:loanId/events
  policy: role=CLIENT; ownership check

GET /client/loans/:loanId/statement.pdf
  policy: role=CLIENT; ownership check
  headers: Cache-Control: no-store

Optional self-service actions (later phases):
POST /client/loans/:loanId/payments/notify
POST /client/loans/:loanId/adjustment-requests

### 4.3 Admin endpoints (ADMIN role)

GET /admin/clients
POST /admin/clients
GET /admin/clients/:clientId

POST /admin/loans
PATCH /admin/loans/:loanId
POST /admin/loans/:loanId/payments
POST /admin/loans/:loanId/adjustments
POST /admin/loans/:loanId/status

GET /admin/loans/:loanId/statement.pdf
GET /admin/audit

---

## 5) Service Worker (PWA) Security Rules

Goal: PWA installable and fast, without leaking sensitive data offline.

Service worker caching strategy:
- Cache the app shell (HTML/CSS/JS/icons) with a revisioned cache.
- DO NOT cache:
  - /api/*
  - /client/* PDFs
  - responses with Cache-Control: no-store
- For API calls:
  - always network-only
  - if offline: show a friendly "online required" message to client users

Pseudo-code:

onFetch(request):
  if request.url matches /api/ or endsWith .pdf:
    return fetch(request)  // no cache
  else if request is static asset:
    return cacheFirst(request)
  else:
    return networkFirst(request)

---

## 6) Phased Implementation Plan (modular, security-gated)

Each phase includes: Deliverables + Acceptance Criteria + Pseudo-code.

### Phase 0 - Requirements, threat model, and repo bootstrap

Deliverables:
- Monorepo structure:
  - /server
  - /web
  - /shared (types, constants)
- Linting/formatting
- Env management (.env.example)
- Threat model doc (short): assets, actors, risks, mitigations

Acceptance criteria:
- CI runs: lint + unit tests
- A "hello world" PWA shell loads over HTTPS in dev (self-signed is OK for dev)

Pseudo-code (repo structure):

/server
  src/app.ts
  src/routes/*
  src/middleware/auth.ts
  src/middleware/rbac.ts
  src/security/headers.ts
  src/security/rateLimit.ts
  prisma/schema.prisma (or migrations)

/web
  src/pages/admin/*
  src/pages/client/*
  src/auth/*
  src/pwa/service-worker.ts

/shared
  types.ts
  permissions.ts

---

### Phase 1 - Database + core domain model

Deliverables:
- DB schema + migrations for users/clients/loans/loan_events/sessions
- Seed script:
  - 1 admin user
  - 1 client user linked to a client record
  - 1 sample loan

Acceptance criteria:
- Can run migrations locally
- Can query sample data

Pseudo-code:

createClient({ fullName, accountNumber, email? })
createUser({ email, password, role, clientId? })
createLoan({ clientId, principal, termMonths, ... })
appendLoanEvent({ loanId, eventType, actorUserId, before, after, reason })

---

### Phase 2 - Authentication (sessions) + RBAC + CSRF

Deliverables:
- /auth/login, /auth/logout, /auth/me
- Session cookie configuration (Secure/HttpOnly/SameSite)
- RBAC middleware:
  - requireAuth()
  - requireRole('ADMIN'|'CLIENT')
- CSRF protection (for cookie-based auth):
  - CSRF token endpoint + header validation on POST/PATCH/DELETE
- Rate limiting on /auth/login and password reset routes

Acceptance criteria:
- Login works for admin and client
- Role-based pages/routes are blocked correctly
- CSRF required for state-changing requests

Auth pseudo-code:

POST /auth/login:
  validate(email, password, totp?)
  user = db.users.findByEmail(email)
  if user not found or user.status != ACTIVE:
    sleepRandom()
    return 401 generic
  if !verifyPassword(password, user.password_hash):
    recordFailedAttempt()
    return 401 generic
  if user.role == ADMIN and user.mfa_enabled:
    require valid TOTP
  session = createSession(user.id)
  setCookie("session", session.id, httpOnly=true, secure=true, sameSite="Lax")
  return { user: safeUser(user) }

Authorization pseudo-code:

requireLoanOwnership(request, loanId):
  loan = db.loans.findById(loanId)
  if request.user.role == ADMIN:
    return OK
  if request.user.role == CLIENT and loan.client_id == request.user.client_id:
    return OK
  return 403

---

### Phase 3 - Admin MVP (create/read clients + loans, event ledger)

Deliverables:
- Admin UI:
  - login
  - list clients
  - create client
  - create loan for client
  - view loan details + events
- Backend:
  - /admin/clients, /admin/loans
  - loan_events ledger writes on every mutation

Acceptance criteria:
- Admin can create a client and loan
- Loan creation generates a loan_event "CREATED" with before/after
- All admin actions are audited

Loan creation pseudo-code:

POST /admin/loans:
  requireRole(ADMIN)
  validate(input)
  loan = db.loans.create(input)
  db.loan_events.insert({
    loan_id: loan.id,
    event_type: "CREATED",
    actor_user_id: req.user.id,
    before_json: null,
    after_json: snapshotLoan(loan),
    diff_json: computeDiff(null, snapshotLoan(loan))
  })
  return loan

---

### Phase 4 - Client portal (read-only, strict ownership)

Deliverables:
- Client UI:
  - login
  - "My Loans" list (only own loans)
  - loan detail (balances, schedule summary, events timeline)
- Backend:
  - /client/loans, /client/loans/:loanId, /client/loans/:loanId/events
  - All endpoints enforce ownership

Acceptance criteria:
- Client can only see their own loans
- Attempting to access another loanId returns 403
- API responses include Cache-Control: no-store

---

### Phase 5 - Payments and controlled self-management

Deliverables:
- Admin: record payments (authoritative)
- Client: submit payment notification (non-authoritative) or upload proof
  - Admin reviews/accepts -> generates authoritative PAYMENT event
- Payment events store a breakdown in metadata_json:
  - principal_paid, interest_paid, fees_paid, remaining balances

Acceptance criteria:
- Payment creates a loan_event PAYMENT with before/after snapshot
- Statement timeline renders payments from events
- Client cannot directly mutate balances without admin validation (recommended)

Pseudo-code (authoritative payment):

POST /admin/loans/:loanId/payments:
  requireRole(ADMIN)
  requireLoanExists(loanId)
  before = snapshotLoan(loan)
  loan = applyPayment(loan, amount, paymentDate)
  after = snapshotLoan(loan)
  db.transaction(() => {
    db.loans.update(loanId, loan)
    db.loan_events.insert({
      loan_id: loanId,
      event_type: "PAYMENT",
      actor_user_id: req.user.id,
      reason: input.note,
      before_json: before,
      after_json: after,
      diff_json: computeDiff(before, after),
      metadata_json: { amount, breakdown: ... }
    })
  })
  return after

---

### Phase 6 - Adjustments + Statements + PDF generation

Deliverables:
- Admin: apply adjustments (term change, top-up/add amount, interest recalculation policy)
- All adjustments create ADJUSTMENT events with before/after + diff + reason
- Statement endpoints:
  - /client/loans/:loanId/statement.pdf
  - /admin/loans/:loanId/statement.pdf
- PDF generation approach:
  - Recommended: server-side PDF generation from loan_events
  - Alternative: client-side PDF rendering from fetched events (ensure no caching)

Acceptance criteria:
- Statement PDF includes:
  - loan summary
  - current position
  - timeline of events (CREATED, PAYMENT, ADJUSTMENT, STATUS_CHANGE)
  - for ADJUSTMENT: show each changed field as "before -> after"
- No sensitive caching (no-store; SW bypass)

PDF pseudo-code:

GET /client/loans/:loanId/statement.pdf:
  requireAuth()
  requireLoanOwnership(loanId)
  loan = db.loans.findById(loanId)
  events = db.loan_events.listByLoanId(loanId).orderBy(timestamp asc)
  pdf = renderStatementPdf({ loan, events })
  setHeader("Content-Type", "application/pdf")
  setHeader("Cache-Control", "no-store")
  return pdf

---

### Phase 7 - PWA hardening (installable, safe caching, secure headers)

Deliverables:
- Manifest + icons
- Service worker caching rules:
  - cache static assets only
  - never cache /api or /statement.pdf
- Security headers (from reverse proxy and/or server)
- CSP tuned to your frontend

Acceptance criteria:
- Lighthouse PWA basics pass
- Offline mode:
  - app shell loads (optional)
  - client data actions show "online required"

---

### Phase 8 - Monitoring, audits, and admin safety features

Deliverables:
- Admin audit viewer:
  - filter by actor, event type, date range
- "Impersonate client" (optional):
  - strongly logged
  - time-limited
  - explicit banner in UI
- Export backups and restore procedure

Acceptance criteria:
- Every privileged action is logged
- Audit logs are tamper-evident (at least append-only constraints)

Tamper-evidence idea (optional):
- Add a hash chain:
  - event_hash = sha256(prev_hash + event_payload)

---

### Phase 9 - Mac hosting + deployment hardening

Deliverables:
- Reverse proxy (Caddy recommended) with:
  - HTTPS (LetsEncrypt) for a real domain
  - HSTS, gzip/brotli, request size limits
  - rate limiting / basic WAF rules (as feasible)
- Process manager:
  - launchd service for server
  - automatic restarts
- Backups:
  - encrypted DB backup schedule
  - off-device backups (recommended)

Acceptance criteria:
- Public HTTPS endpoint works (or VPN-only access)
- Regular backups verified by test restore
- Admin MFA enforced

Deployment checklist:
- Enable FileVault on Mac host
- OS updates and firewall enabled
- Use a dedicated low-privilege user account for running the server
- Secrets stored securely (not in repo)

---

## 7) Test Plan (minimum for confidence)

### 7.1 Automated tests
- Unit tests:
  - auth policy checks (RBAC + ownership)
  - loan calculation functions
  - diff computation for events
- Integration tests:
  - login -> access routes -> logout
  - client cannot access other client's loan
  - admin can access everything
- Security tests:
  - rate limiting works
  - CSRF blocks missing/invalid tokens

### 7.2 Manual tests (each phase)
- Attempt IDOR (insecure direct object reference):
  - as CLIENT, request /client/loans/:otherLoanId -> must be 403
- PWA caching:
  - check devtools "Application -> Cache Storage"
  - ensure no /api responses are present
- Session security:
  - cookie flags set correctly

---

## 8) Acceptance Criteria Summary (definition of done)

The project is "secure enough to pilot" only if:
- All client data access is enforced server-side with ownership checks.
- Admin MFA is enabled and required.
- No sensitive data is cached offline by the service worker.
- All loan changes are recorded as append-only events and statements are rendered from those events.
- Backups exist and restore is tested.

---

## 9) Assumptions (edit these before you start)

- Registration is invite-only for clients.
- Clients can self-manage via controlled requests; admins remain authoritative for loan mutations (safer).
- The Mac host is secure, encrypted, and maintained.
- You will comply with local privacy laws (example: POPIA) for client PII handling.

