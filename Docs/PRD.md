# DismissFlow
## Web-Based School e-Dismissal & Digital Pickup System

**Prototype:** Nursery / Tulip — 18 students  
**Team:** 2 developers  
**Platform:** Responsive Web Application  
**Backend:** Supabase  
**Primary objective:** Demonstrate a production-minded, real-time digital student dismissal workflow that can later integrate with an existing school PTS.

---

# 1. Executive Summary

DismissFlow is a web-based student pickup and dismissal system designed to replace manual dismissal workflows with a secure digital process.

The system connects three web experiences:

1. **Parent Portal**
2. **Gate/Scanner Portal**
3. **Teacher Portal**

A parent requests pickup and receives a temporary QR code. Gate staff scans the QR code using a browser camera. The backend validates the request and immediately updates the responsible teacher's dashboard. The teacher verifies the request and approves or rejects dismissal. The parent receives the final status in real time.

The prototype uses the school's **18-student Nursery/Tulip roster** as its initial dataset. The supplied roster contains admission numbers, student information and guardian contact information. 
The prototype is intentionally web-based to eliminate app installation and reduce development overhead while keeping the backend architecture suitable for future native applications and PTS integration.

---

# 2. Product Vision

> **Request → Scan → Verify → Approve → Dismiss**

DismissFlow should make student pickup:

- safer
- faster
- traceable
- cardless
- real-time
- easy to deploy

The system should not attempt to replace the school's complete PTS.

Instead, it should demonstrate a **digital dismissal module** that can eventually integrate with the school's existing student information and PTS infrastructure.

---

# 3. Problem Statement

The existing manual dismissal process may require teachers and gate staff to:

- visually identify parents
- communicate pickup requests verbally
- maintain paper records
- coordinate between gate and classroom
- manually track completed pickups

This can cause:

- queues
- delays
- communication mistakes
- weak auditability
- difficulty verifying who authorized a dismissal

The prototype should create a clear digital chain:

**Parent Request → QR Verification → Teacher Confirmation → Dismissed**

This is the central workflow defined in the source PRD.

---

# 4. Goals

## Primary goals

- Eliminate the need for physical student pickup cards.
- Allow parents to request dismissal digitally.
- Generate temporary, single-use QR codes.
- Allow gate staff to verify pickup requests quickly.
- Give teachers real-time visibility into pending pickups.
- Allow teachers to make the final release decision.
- Provide real-time status updates without page refreshes.
- Maintain a digital dismissal history.
- Demonstrate architecture suitable for future PTS integration.
- Build the complete prototype with a two-person team.

The original PRD also identifies reducing waiting time, improving verification and creating an audit trail as core goals.

---

# 5. Non-Goals

The prototype will NOT attempt to build:

- complete school ERP
- academic management
- fees/payments
- attendance
- transportation management
- biometric verification
- facial recognition
- complex parent registration
- multi-campus management
- full offline synchronization
- production identity-provider integration
- native mobile applications
- advanced AI functionality

These remain outside the initial prototype scope.

---

# 6. Target Users

## Parent / Guardian

Uses the Parent Portal to:

- log in
- view their child
- request pickup
- display QR
- track dismissal status
- view recent dismissal history

## Gate Staff

Uses the Gate Portal to:

- authenticate the gate device/session
- open scanner
- scan parent QR
- see verification result
- see minimal student information
- initiate the teacher confirmation workflow

## Teacher

Uses the Teacher Portal to:

- view assigned class
- receive live pickup requests
- inspect student/request details
- approve dismissal
- reject dismissal
- request manual verification
- view dismissal history

## Admin

Used for prototype management:

- import roster
- view students
- assign students to class/teacher
- review dismissal logs

These roles correspond to the original product definition.

---

# 7. Platform Strategy

The prototype is **web-first**.

There is one responsive web application with role-specific experiences.

```text
                    DismissFlow Web
                          │
            ┌─────────────┼─────────────┐
            │             │             │
         Parent         Gate         Teacher
         Portal        Portal        Portal
            │             │             │
            └─────────────┼─────────────┘
                          │
                       Backend
```

The same backend can later support:

- native mobile apps
- additional school portals
- existing PTS integrations
- additional campuses

The web prototype is intentionally chosen because the demo does not require app installation.

---

# 8. Technology Stack

## Frontend

**Next.js + TypeScript**

Responsibilities:

- responsive web UI
- routing
- role-specific portals
- QR display
- QR scanner
- realtime subscriptions
- state visualization

## UI

**Tailwind CSS + shadcn/ui**

Goals:

- consistent design system
- fast development
- accessible components
- professional visual quality

## Backend

**Supabase**

Used for:

- PostgreSQL
- Authentication
- Row Level Security
- Realtime
- Edge Functions

## Database

**PostgreSQL**

Chosen for the relational school data model.

## QR

- browser-based QR generation
- browser camera scanning

## Hosting

**Vercel** for the web application.

**Supabase** for backend infrastructure.

## Version Control

**GitHub**

---

# 9. Architecture

```text
┌───────────────────────────────────────────────┐
│                 DismissFlow Web               │
│                                               │
│  Parent Portal   Gate Portal   Teacher Portal │
│        │              │              │        │
└────────┼──────────────┼──────────────┼────────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
                 Supabase Client
                        │
        ┌───────────────┼────────────────┐
        │               │                │
       Auth         PostgreSQL        Realtime
        │               │                │
        └───────────────┼────────────────┘
                        │
                 Edge Functions
                        │
                Server-side logic
```

The architecture maintains one backend and one student database for the different user experiences, as specified in the source PRD.

---

# 10. Core Data Model

## Student

```text
student_id
admission_no
name
gender
dob
class_id
```

## Guardian

```text
guardian_id
name
phone
email
relationship
```

## StudentGuardian

```text
student_id
guardian_id
```

## Class

```text
class_id
class_name
section
teacher_id
```

## User

```text
user_id
role
login_id
credential_status
```

## DismissalRequest

```text
request_id
student_id
guardian_id
status
created_at
expires_at
```

## QRToken

```text
token_id
request_id
token_hash
expires_at
used_at
status
```

## DismissalEvent

```text
event_id
request_id
scanned_by
approved_by
scan_time
approval_time
final_status
```

The structure follows the relational data model from the supplied PRD.

---

# 11. Student Data

The prototype must import the supplied 18-student Nursery/Tulip roster.

Admission number is the unique student identifier.

Admission numbers must be stored as strings so values such as:

```text
040
041
```

retain their leading zeroes.

Guardian information must only be exposed to authorized roles.

---

# 12. Authentication

## Prototype

Parent authentication may use:

```text
Admission Number
+
Admission Number
```

as the temporary prototype credential.

This is explicitly a demo-only shortcut in the source PRD.

## Teacher

Seeded teacher account.

## Gate

Controlled gate account/session or PIN.

## Admin

Seeded admin account.

Production authentication should later use secure passwords, OTP, passkeys or the school's identity provider.

---

# 13. Parent Portal

## Dashboard

Display:

- child name
- class
- admission number
- current dismissal state
- Request Dismissal button

Example:

```text
┌──────────────────────────────┐
│ DismissFlow                  │
│                              │
│ Welcome                      │
│                              │
│ Aarav                        │
│ Tulip • 040                  │
│                              │
│ [ Request Dismissal ]        │
│                              │
│ Status: No active request    │
└──────────────────────────────┘
```

## Request Dismissal

When clicked:

1. backend verifies authorization
2. checks for an existing active request
3. creates dismissal request
4. generates temporary QR
5. returns QR and expiry
6. UI displays QR

Multiple active requests for one student are not allowed.

---

# 14. QR Screen

Display:

```text
PICKUP QR

┌─────────────────┐
│                 │
│       QR        │
│                 │
└─────────────────┘

Aarav
Tulip

Expires in 01:42
```

QR requirements:

- random
- non-guessable
- temporary
- single-use
- server validated

Sensitive guardian data must never be encoded directly into the QR.

The source requirements specify a short 2–5 minute expiry and single-use behavior.

---

# 15. Gate Portal

URL/route:

```text
/gate
```

Primary screen:

```text
GATE SCANNER

[ Camera Scanner ]

Scan parent's pickup QR
```

After scanning:

## Valid

```text
✓ VALID REQUEST

Student
Aarav

Class
Tulip

Status
Awaiting Teacher
```

## Invalid

```text
✕ INVALID QR

This QR is expired,
used or invalid.
```

The gate receives only minimum required verification information.

---

# 16. Teacher Portal

URL/route:

```text
/teacher
```

## Dashboard

```text
TULIP

Pending Pickups: 2

┌──────────────────────────┐
│ Aarav                    │
│ Scanned 08:42 AM         │
│ Awaiting confirmation    │
└──────────────────────────┘
```

The list updates automatically when the gate scans a QR.

No refresh button is required.

---

# 17. Teacher Pickup Detail

Display:

- student name
- admission number
- class
- request time
- scan time
- necessary guardian verification information
- current request state

Actions:

```text
[ APPROVE & DISMISS ]

[ REJECT ]

[ MANUAL VERIFICATION ]
```

The teacher remains the final authority.

A QR code alone never authorizes release.

---

# 18. Realtime System

Realtime is a core requirement.

The application must NOT rely on:

- polling
- periodic refresh
- manual page reload

## Example

Gate scans:

```text
Gate
 ↓
Server validates
 ↓
Database changes
 ↓
Supabase Realtime
 ↓
Teacher dashboard
```

The teacher should see the request appear immediately.

Then:

```text
Teacher approves
 ↓
Database changes
 ↓
Supabase Realtime
 ↓
Parent portal
```

The parent sees:

```text
✓ DISMISSED
```

without refreshing.

The source PRD requires immediate teacher notification after scanning and final parent confirmation after approval.

---

# 19. State Machine

```text
IDLE
  ↓
REQUESTED
  ↓
SCANNED
  ↓
AWAITING_TEACHER
  ↓
APPROVED
  ↓
DISMISSED
```

Alternative states:

```text
REJECTED
EXPIRED
CANCELLED
```

These states follow the source PRD.

---

# 20. Backend Operations

Keep the API surface small.

Required server-side operations:

```text
createDismissalRequest()

scanQr()

approveDismissal()

rejectDismissal()

cancelDismissal()
```

Normal authorized reads can use Supabase queries.

The backend must own:

- QR validation
- authorization
- state transitions
- single-use enforcement
- expiry
- audit logging

---

# 21. Security

## QR

Never put:

- phone number
- email
- guardian information
- sensitive student information

directly into the QR.

Use:

```text
Random Token
     ↓
Backend
     ↓
Request
```

## Authorization

Parent:

```text
Only linked child
```

Teacher:

```text
Only assigned class
```

Gate:

```text
Minimum verification information
```

Admin:

```text
Administrative access
```

## Backend authority

The client must never decide whether a QR is valid or whether a dismissal is authorized.

The source PRD explicitly requires backend validation and atomic protection against duplicate scans.

---

# 22. Audit Trail

Every dismissal should record:

```text
request_id
student_id
scanner/device
teacher
scan time
approval time
final status
```

Example:

```text
Aarav
ADM 040

Requested: 08:39
Scanned:   08:42
Approved:  08:43
Status:    DISMISSED

Gate: Gate 1
Teacher: Tulip Teacher
```

This provides traceability.

---

# 23. Notifications

## Realtime

Used for active web sessions.

## Push/email/SMS

Not required for the first prototype.

The prototype should prioritize realtime browser updates.

Future notification channels can be added later.

The original PRD defines teacher and parent notification events as part of the broader product.

---

# 24. Error States

The UI must explicitly handle:

### QR

- invalid
- expired
- already used
- cancelled

### Parent

- existing active request
- request creation failure
- authentication failure
- network failure

### Gate

- camera permission denied
- invalid QR
- network unavailable

### Teacher

- request already processed
- unauthorized request
- network failure

Every error must have a clear recovery action.

---

# 25. Realtime Connection State

The UI should indicate whether the portal is connected.

```text
● Live
```

or:

```text
⚠ Reconnecting...
```

The system must never silently pretend that a realtime update succeeded when the client is disconnected.

---

# 26. Prototype Demo

The complete demonstration should use three browser windows/tabs.

### Browser 1 — Parent

```text
Login
 ↓
Student
 ↓
Request Dismissal
 ↓
QR
```

### Browser 2 — Gate

```text
Scanner
 ↓
Scan QR
 ↓
Valid
```

### Browser 3 — Teacher

Immediately:

```text
NEW PICKUP REQUEST

Aarav
Tulip

[ Approve & Dismiss ]
```

Teacher clicks approve.

Parent immediately changes to:

```text
✓ DISMISSED
```

No refresh anywhere.

This is the primary "wow" moment of the prototype.

---

# 27. Development Ownership

## Developer 1 — Frontend

Responsible for:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Parent portal
- Gate portal
- Teacher portal
- QR display
- QR scanner
- Realtime subscriptions
- loading/error states
- visual polish

## Developer 2 — Backend

Responsible for:

- Supabase
- PostgreSQL
- authentication
- database schema
- RLS
- Edge Functions
- QR security
- state machine
- Realtime configuration
- roster import
- audit logging

## Shared

- GitHub
- integration
- testing
- final demo
- architecture decisions

---

# 28. Development Sequence

The team must build incrementally.

## Milestone 1

**Student identity**

```text
Login
 ↓
Student
 ↓
Profile
```

## Milestone 2

**Pickup request**

```text
Request Dismissal
 ↓
REQUESTED
```

## Milestone 3

**QR**

```text
REQUESTED
 ↓
Temporary QR
```

## Milestone 4

**Gate**

```text
QR
 ↓
Scan
 ↓
Validation
```

## Milestone 5

**Teacher**

```text
Scan
 ↓
Teacher sees request
```

## Milestone 6

**Approval**

```text
Approve
 ↓
DISMISSED
```

## Milestone 7

**Realtime**

```text
Gate → Teacher
Teacher → Parent
```

## Milestone 8

**Security + Polish**

```text
Expiry
Single-use
RLS
Errors
Animations
Audit
```

---

# 29. MVP Acceptance Criteria

The MVP is complete when:

- 18 Tulip students are seeded.
- A parent can log in.
- Parent can see the linked student.
- Parent can request dismissal.
- System creates a temporary QR.
- Gate can scan the QR through the browser.
- Backend validates the QR.
- Expired QR is rejected.
- Reused QR is rejected.
- Teacher receives the request without refreshing.
- Teacher can approve/reject.
- Approval changes the request to Dismissed.
- Parent sees Dismissed without refreshing.
- Dismissal history is recorded.
- Admission numbers retain leading zeroes.
- Unauthorized users cannot access unrelated student information.

The acceptance criteria are based on the supplied PRD's MVP requirements.

---

# 30. Production Evolution

The prototype should be built so the backend can eventually become a school-wide service.

Future capabilities:

- secure parent authentication
- multiple children per account
- authorized pickup-person management
- photo/ID verification
- multiple gates
- multiple classes
- multiple campuses
- offline scanner synchronization
- emergency/manual dismissal
- analytics
- PTS integration
- native mobile clients

These correspond to the future enhancements identified in the source requirements.

---

# 31. PTS Integration Strategy

DismissFlow is a **module**, not a replacement for the PTS.

Future architecture:

```text
Existing School PTS
        │
        │ Student / Guardian / Teacher data
        ▼
   Integration Layer
        │
        ▼
    DismissFlow
        │
        ├── Pickup Requests
        ├── QR Verification
        ├── Teacher Approval
        └── Dismissal Events
```

The prototype should therefore avoid hard-coded school-specific business logic wherever possible.

---

# 32. Product Principles

### Cardless

No physical student card is required.

### Realtime

Active users see state changes immediately.

### Secure

QR possession alone never authorizes dismissal.

### Minimal

The gate sees only what it needs.

### Traceable

Every important dismissal action is logged.

### Integratable

Student IDs and data structures are designed for future PTS integration.

### Scalable

The prototype starts with 18 students but should not be architecturally limited to 18.

---

# 33. Definition of Success

The prototype succeeds if a reviewer can watch the following happen:

```text
Parent requests pickup
        ↓
QR appears
        ↓
Gate scans QR
        ↓
Teacher instantly sees request
        ↓
Teacher approves
        ↓
Parent instantly sees Dismissed
        ↓
Audit record exists
```

And the reviewer can understand the product's future value:

> **A school can remove physical pickup cards and replace the manual dismissal chain with a secure, real-time digital workflow without replacing its entire PTS.**

---

# 34. Final Technology Decision

**Frontend:** Next.js  
**Language:** TypeScript  
**Styling:** Tailwind CSS  
**Components:** shadcn/ui  
**Backend:** Supabase  
**Database:** PostgreSQL  
**Authentication:** Supabase Auth  
**Authorization:** Row Level Security  
**Server Logic:** Supabase Edge Functions  
**Realtime:** Supabase Realtime  
**QR:** Browser QR generation + browser camera scanning  
**Deployment:** Vercel + Supabase  
**Repository:** GitHub

**No React Native.  
No Expo.  
No separate Node backend.  
No polling.  
No physical cards.**

The prototype is a **single responsive web application with three role-based experiences backed by one realtime Supabase system.**