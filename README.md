# DismissFlow — EPS

**Web-based school e-dismissal & digital pickup system**
*Prototype: Nursery / Tulip · 18 students · 2-developer team*

DismissFlow replaces manual, card-based student dismissal with a secure digital chain:

**Parent Request → QR Verification → Teacher Confirmation → Dismissed**

A parent requests pickup from their phone and gets a short-lived, single-use QR code. Gate staff scans it with a browser camera; the backend validates it and instantly pushes the request to the responsible teacher's live queue. The teacher makes the final approve/reject call, and the parent sees the result in real time — no refresh, no paper, no pickup cards.

---

## Why this exists

Manual dismissal relies on visual recognition, verbal hand-offs, and paper logs. That creates queues, miscommunication, and weak auditability — it is hard to prove *who* authorized a release. DismissFlow builds a clear, traceable digital chain that is safer, faster, and cardless, while staying small enough for a two-person team to build end to end.

The prototype deliberately demonstrates a **digital dismissal module**, not a full PTS replacement. The data model is designed so it can later drop into an existing school PTS rather than replace it.

---

## What we are building

One responsive **Next.js** web app delivering four role-specific experiences, all backed by a single realtime **Supabase** system:

| Portal | Who | What it does |
| ------ | --- | ------------ |
| **Parent** | Guardian | Requests pickup for their linked child, displays the QR, watches live dismissal status. |
| **Gate / Scanner** | Gate staff | Authenticates the shared gate device, scans the parent QR with a browser camera, sees only minimum verification info. |
| **Teacher** | Teacher | Views a realtime pickup queue for their class and makes the final approve/reject decision. |
| **Admin** | Admin | Imports the roster, assigns students to class/teacher, reviews dismissal logs. |

The product is **web-first** (no app install) and **realtime-first** — state propagates over Supabase Realtime; polling and manual refresh are explicitly forbidden.

---

## Architecture at a glance

```
Browser (responsive web app)
  Parent · Gate · Teacher · Admin  ──▶  Supabase
                                         ├─ Auth (JWT)
                                         ├─ PostgreSQL + Row Level Security
                                         ├─ Realtime (postgres_changes)
                                         └─ Edge Functions (server-trusted logic)
```

The **security boundary is the whole point**: the browser is never the authority. The client only renders the QR, decodes a scan, and sends tokens/actions. All QR validation, authorization, state transitions, single-use/expiry enforcement, and audit logging happen **server-side** in Edge Functions and PostgreSQL. The QR encodes *only* a random, server-issued token — no student or guardian PII ever lives in it.

The full architecture — state machine, QR security lifecycle, RLS scopes, realtime flows, and the implementation blueprint — lives in [`Docs/architecture.md`](Docs/architecture.md).

---

## Design direction

**Revora structure + Kernel motion + soft kernel-blue accent.** Dark, technical, command-deck feel — not a child app, not AI slop. Revora gives the editorial mono metadata, hairline 1px borders, and capability-grid layout; Kernel Agent gives the Framer Motion reveals, Lenis smooth scroll, cursor glow, and bento card motion. Tokens and patterns are documented in [`Docs/design/README.md`](Docs/design/README.md).

---

## Repository layout

```
DismissFlow-EPS/
├── Docs/
│   ├── PRD.md                # Product requirements (source of truth)
│   ├── architecture.md       # Architecture specification
│   └── design/               # Design system docs
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout, fonts, smooth scroll, cursor glow
│   ├── globals.css           # Design tokens (CSS) + motion utilities
│   ├── page.tsx              # Landing / role selection
│   └── parent/               # Parent portal scaffold
├── components/
│   ├── effects/              # CursorGlow, SmoothScroll (Lenis)
│   └── ui/                   # Panel, MonoLabel, StatusPill, TopNav, Icon, PrimaryButton
├── lib/
│   ├── supabase/             # Browser client (RLS-constrained)
│   ├── auth/                 # Session / role guard types
│   └── dismissal/            # State types (matches §7)
├── tailwind.config.ts        # Color tokens, fonts, motion
├── next.config.js
├── package.json
└── README.md
```

> **Status: scaffolded.** As of this commit the parent portal is the first end-to-end page wired with real state, animations, and the design system. Gate, Teacher, and Admin portals are next. The Supabase schema, Edge Functions, and RLS are not yet implemented — see `Docs/architecture.md` for the blueprint.

---

## Tech stack

- **Frontend:** Next.js (App Router) + TypeScript, Tailwind CSS, Framer Motion, Lenis
- **Backend (all of it):** Supabase — Auth, PostgreSQL, RLS, Realtime, Edge Functions
- **Hosting:** Vercel (web app) + Supabase (backend), GitHub for source and CI

No separate Node server. No native client for the prototype.

---

## Getting started

```bash
cd DismissFlow-EPS
npm install
npm run dev
```

The parent portal renders without env vars. To wire it to a real Supabase project, copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Dismissal state machine (simplified for the prototype)

```
IDLE → REQUESTED → AWAITING_TEACHER → DISMISSED
                                  ↘ REJECTED
REQUESTED / AWAITING_TEACHER → EXPIRED
REQUESTED → CANCELLED
```

A valid gate scan is recorded as an **event** (not a separate persisted state); teacher approval transitions directly to `DISMISSED`, with `approval_time` captured in the audit log. The full transitions and failure behavior are in `Docs/architecture.md` §7.

---

## License

See [LICENSE](LICENSE).
