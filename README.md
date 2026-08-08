# AMTS — Asset Management & Tracking System

A full-stack web application for managing organizational assets — tracking inventory, transfers, repairs, and returns — with role-based access control and QR code support.

---

## Overview

AMTS helps organizations keep control of their physical assets (laptops, equipment, furniture, etc.) across departments. It supports the full lifecycle of an asset: procurement → assignment → transfer → repair → retirement.

**Tech Stack:**
- **Backend:** Python · FastAPI · SQLAlchemy · Alembic · MySQL · JWT Authentication
- **Frontend:** Vanilla HTML/CSS/JavaScript (dark theme), no build step

### Why the frontend has no framework

This system targets isolated government networks where the only reliable client-side capability is plain HTML, CSS and vanilla JavaScript. There is no build tooling, no package manager and no CDN dependency anywhere in `frontend/` — the two third-party libraries (Chart.js and jsQR) are vendored into `frontend/vendor/` precisely because an air-gapped machine cannot reach a CDN.

---

## Features

- **Asset Management** — Add, retire and delete assets with full metadata (type, purchase order, procurement details, value)
- **Transfer Tracking** — Log asset transfers between users, recording who performed each one
- **Repair Logs** — Send assets for repair and return them, with duplicate-repair protection
- **Return Management** — Return assets to the available pool with status updates
- **QR Code Generation** — Generate and print QR labels; scan by camera, image upload or manual entry
- **Three-Tier RBAC** — Admin / Department Head / Employee, enforced by the API on every route
- **Department Scoping** — Users see the assets their role entitles them to, not the whole organization
- **Audit Trail** — Append-only log of every state-changing action (actor, entity, before/after, IP)
- **Dashboard** — Role-aware summary aggregated server-side

---

## Project Structure

```
AMTS/
├── backend/
│   ├── alembic/                    # Schema migrations
│   │   └── versions/
│   ├── alembic.ini
│   ├── seed.py                     # Reference data + bootstrap admin
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI app entry point
│       ├── config.py               # Settings; fails fast if misconfigured
│       ├── database.py             # SQLAlchemy engine & session
│       ├── deps.py                 # Shared dependencies (get_db, id normalisation)
│       ├── enums.py                # Role, AssetStatusName, AuditAction
│       ├── security.py             # Password hashing, rate limiter
│       ├── exception_handlers.py   # App-wide error translation
│       ├── models/                 # SQLAlchemy models (incl. audit_event.py)
│       ├── schemas/                # Pydantic request/response models
│       ├── services/               # Business logic and queries
│       ├── routes/                 # HTTP layer only
│       ├── auth/                   # JWT creation, verification, RBAC guards
│       └── utils/
│           └── qr_handler.py       # QR code generation
└── frontend/
    ├── *.html                      # One page per view
    ├── css/style.css               # Dark theme design system
    ├── vendor/                     # Chart.js, jsQR (vendored, not CDN)
    └── js/
        ├── config.js               # API base URL (single source)
        ├── utils.js                # Shared helpers, escaping, API wrapper
        └── <page>.js               # One script per page
```

Layering is `routes → services`: routes handle HTTP concerns only, services own the business rules and the queries.

---

## Getting Started

### Prerequisites

- Python 3.11+
- MySQL (running locally or remotely)
- A modern web browser

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/dp-rjt-prsd/AMTS.git
cd AMTS/backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create the database
mysql -u root -p -e "CREATE DATABASE asset_management_system CHARACTER SET utf8mb4;"

# 5. Configure
cp .env.example .env
```

Edit `.env`. `SECRET_KEY` and `DATABASE_URL` are **required** — the application refuses to start without them rather than falling back to a default:

```env
SECRET_KEY=<paste output of the command below>
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost/asset_management_system
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
BOOTSTRAP_ADMIN_EMAIL=admin@example.gov
BOOTSTRAP_ADMIN_PASSWORD=<at least 12 characters>
```

Generate a signing key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

```bash
# 6. Create the schema
alembic upgrade head

# 7. Seed reference data and the first administrator
python seed.py

# 8. Start the server
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`, with interactive docs at `/docs`.

> **Note on accounts:** there is no public sign-up. The first administrator comes from `seed.py`; every subsequent account is created by an admin on the Users page.

### Frontend Setup

The frontend is plain HTML/CSS/JS — no build step.

```bash
cd frontend
python -m http.server 5500
# Then open http://localhost:5500/login.html
```

Serve it rather than opening the file directly, so that the origin matches `CORS_ORIGINS`. If you deploy the API somewhere other than `127.0.0.1:8000`, change `API_BASE_URL` in `frontend/js/config.js` — that is the only place it is defined.

---

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/login` | Public | Exchange credentials for a JWT (rate limited) |
| GET | `/me` | Any | Current user's own profile |
| POST | `/register` | Admin | Create a user account |
| GET | `/users` | Head+ | List users (scoped by department) |
| GET | `/users/{id}` | Self/Admin | Get a user |
| PATCH | `/users/{id}/role` | Admin | Change a user's role |
| GET | `/departments` | Any | List departments |
| GET | `/asset-types` | Any | List asset types |
| GET | `/asset-statuses` | Any | List asset statuses |
| GET | `/assets` | Any | List assets visible to the caller |
| POST | `/assets` | Admin | Create an asset |
| GET | `/assets/{id}` | Any | Asset details, including QR image |
| PUT | `/assets/{id}/status` | Admin | Change asset status |
| PUT | `/assets/{id}/retire` | Admin | Retire an asset |
| DELETE | `/assets/{id}` | Admin | Delete an asset |
| POST | `/scan` | Any | Check out a scanned asset to yourself |
| POST | `/transfer` | Admin | Transfer an asset to another user |
| GET | `/transfers` | Any | Transfer history for visible assets |
| GET | `/assets/{id}/transfers` | Any | Transfer history for one asset |
| POST | `/return/{id}` | Admin | Return an asset to inventory |
| POST | `/repair/{id}` | Admin | Open a repair |
| PUT | `/repair/{id}/return` | Admin | Close a repair |
| GET | `/repair/logs` | Any | Repair history for visible assets |
| GET | `/assets/{id}/repairs` | Any | Repair history for one asset |
| GET | `/dashboard` | Any | Role-aware summary statistics |
| GET | `/health` | Public | Liveness check |

Full interactive documentation is at `/docs` (Swagger UI) when the backend is running.

---

## Asset Statuses

| ID | Status |
|----|--------|
| 1 | Available |
| 2 | Assigned |
| 3 | Repair |
| 4 | Retired |

Seeded with fixed IDs by `seed.py`, but application code resolves them by name.

---

## User Roles

| Role | Sees | Can do |
|------|------|--------|
| **Admin** | Everything | Create/retire/delete assets, transfer, manage repairs, create users, assign roles |
| **Department Head** | Assets held by their department, plus unassigned; users in their department | Scan out unassigned assets |
| **Employee** | Assets they hold, plus unassigned | Scan out unassigned assets |

Unassigned assets are visible to everyone by design — they are the pool people check out from.

Role checks in the frontend only hide UI. Every action is independently enforced by the API.

---

## Database

MySQL, with the schema under Alembic migration control.

```bash
alembic upgrade head          # apply migrations
alembic revision --autogenerate -m "description"   # after changing a model
alembic downgrade -1          # roll back one revision
```

**Core tables:** `assets`, `asset_types`, `asset_statuses`, `users`, `departments`, `asset_transfer_logs`, `repair_logs`, `audit_events`

---

## Security Notes

- Passwords are hashed with bcrypt (cost 12); login is rate limited and does not reveal whether an address exists.
- JWTs carry `sub`, `jti` and `iat`; tokens are rejected as expired and invalid distinctly.
- All server data is HTML-escaped before rendering — see `esc()` in `frontend/js/utils.js`.
- Scanned QR content is validated against the asset-ID format before use.
- CORS is restricted to configured origins; a wildcard is rejected at startup.
- Every state-changing action writes an `audit_events` row in the same transaction as the change.

The access token is stored in `localStorage`. Moving it to an `HttpOnly` cookie with CSRF protection is the next meaningful hardening step.

---

## License

This project is currently unlicensed. All rights reserved by the author.
