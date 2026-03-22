# EMP Exit

> Simplify exit formalities and manage background verification portfolio efficiently

[![Part of EmpCloud](https://img.shields.io/badge/EmpCloud-Module-blue)]()
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-green.svg)](LICENSE)

EMP Exit is the offboarding and exit management module of the EmpCloud ecosystem. It provides configurable exit workflows, clearance management, exit interviews, full and final settlement calculation, asset return tracking, knowledge transfer, letter generation, background verification portfolios, and an alumni network.

---

## Features

| Feature | Description |
|---------|-------------|
| Offboarding Workflows | Configurable exit checklists per role/department, multi-department sign-off |
| Exit Interviews | Structured feedback forms, reason for leaving, ratings, suggestions |
| Full & Final Settlement | Calculate pending salary, leave encashment, gratuity, deductions, notice recovery |
| Asset Return Tracking | Track asset returns, verify condition, damage assessment |
| Knowledge Transfer | KT documentation, handover checklists, successor assignment |
| Clearance Workflow | Department-wise clearance (IT, Finance, HR, Admin, Manager), approval chain |
| Letter Generation | Experience letter, relieving letter, service certificate with Handlebars templates |
| Background Verification | Store verification results, reference checks, employment history |
| Rehire Eligibility | Flag ex-employees as rehire eligible/not, with notes |
| Exit Analytics | Attrition rate, reason analysis, department-wise trends, tenure at exit |
| Alumni Network | Optional alumni directory for ex-employees |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Backend | Express 5, TypeScript |
| Frontend | React 19, Vite 6, TypeScript |
| Styling | Tailwind CSS, Radix UI |
| Database | MySQL 8 via Knex.js (`emp_exit` database) |
| Cache / Queue | Redis 7, BullMQ |
| Auth | OAuth2/OIDC via EMP Cloud (RS256 JWT verification) |
| PDF Generation | Puppeteer |
| Charts | Recharts |

---

## Project Structure

```
emp-exit/
  package.json
  pnpm-workspace.yaml
  tsconfig.json
  docker-compose.yml
  .env.example
  packages/
    shared/                     # @emp-exit/shared
      src/
        types/                  # TypeScript interfaces & enums
        validators/             # Zod request validation schemas
        constants/              # Exit types, statuses, defaults
    server/                     # @emp-exit/server (port 4400)
      src/
        config/                 # Environment configuration
        db/
          connection.ts         # Knex connection to emp_exit
          empcloud.ts           # Read-only connection to empcloud DB
          migrations/           # 12 migration files
        api/
          middleware/            # auth, RBAC, error handling
          routes/               # Route handlers per domain
        services/               # Business logic per domain
        jobs/                   # BullMQ workers (notifications, letter gen)
        utils/                  # Logger, errors, response helpers
    client/                     # @emp-exit/client (port 5178)
      src/
        api/                    # API client & hooks
        components/
          layout/               # DashboardLayout, SelfServiceLayout
          ui/                   # Radix-based UI primitives
          exit/                 # ExitStatusBadge, ClearanceProgress, FnFBreakdown, etc.
        pages/                  # Route-based page components
        lib/                    # Auth store, utilities
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `exit_requests` | Central exit record (type, dates, notice period, status, rehire eligibility) |
| `exit_checklist_templates` | Configurable checklists per org/department/role |
| `exit_checklist_template_items` | Items within a checklist template |
| `exit_checklist_instances` | Instantiated checklist items for a specific exit |
| `clearance_departments` | Departments that must sign off (IT, Finance, HR, Admin, Manager) |
| `clearance_records` | Per-exit, per-department clearance approval status |
| `exit_interview_templates` | Configurable exit interview question sets |
| `exit_interview_questions` | Questions within an interview template |
| `exit_interviews` | Completed interview records |
| `exit_interview_responses` | Individual answers to interview questions |
| `fnf_settlements` | Full & final settlement calculation (earnings, deductions, net payable) |
| `asset_returns` | Assets to be returned by exiting employee |
| `knowledge_transfers` | KT record per exit with successor assignment |
| `kt_items` | Individual KT checklist items |
| `letter_templates` | Org-specific Handlebars letter templates |
| `generated_letters` | Generated letter PDFs for specific exits |
| `bgv_records` | Background verification records |
| `reference_checks` | Reference check records linked to BGV |
| `alumni_profiles` | Optional alumni directory entries |
| `audit_logs` | Module-specific audit trail |
| `exit_settings` | Per-org exit configuration |

---

## API Endpoints

All endpoints under `/api/v1/`. Server runs on port **4400**.

### Exit Requests
| Method | Path | Description |
|--------|------|-------------|
| POST | `/exits` | Initiate exit |
| GET | `/exits` | List exits (query: status, employee, date range) |
| GET | `/exits/:id` | Get exit detail |
| PUT | `/exits/:id` | Update exit |
| POST | `/exits/:id/cancel` | Cancel exit |
| POST | `/exits/:id/complete` | Complete exit (deactivates user in empcloud) |

### Self-Service (Employee)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/self-service/resign` | Submit resignation |
| GET | `/self-service/my-exit` | View own exit status |
| GET | `/self-service/my-checklist` | View own checklist items |
| POST | `/self-service/exit-interview` | Submit exit interview responses |

### Checklist Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/checklist-templates` | List templates |
| POST | `/checklist-templates` | Create template |
| PUT | `/checklist-templates/:id` | Update template |
| POST | `/checklist-templates/:id/items` | Add item to template |

### Clearance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/clearance-departments` | List configured departments |
| GET | `/exits/:id/clearance` | Get clearance status |
| PUT | `/exits/:id/clearance/:clearanceId` | Approve/reject clearance |
| GET | `/my-clearances` | Pending clearances assigned to me |

### Exit Interviews
| Method | Path | Description |
|--------|------|-------------|
| GET | `/interview-templates` | List templates |
| POST | `/interview-templates` | Create template |
| GET | `/exits/:id/interview` | Get interview for exit |
| POST | `/exits/:id/interview` | Schedule interview |

### Full & Final Settlement
| Method | Path | Description |
|--------|------|-------------|
| POST | `/exits/:id/fnf/calculate` | Calculate FnF |
| GET | `/exits/:id/fnf` | Get FnF details |
| PUT | `/exits/:id/fnf` | Update FnF (manual adjustments) |
| POST | `/exits/:id/fnf/approve` | Approve FnF |
| POST | `/exits/:id/fnf/mark-paid` | Mark FnF as paid |

### Asset Returns
| Method | Path | Description |
|--------|------|-------------|
| GET | `/exits/:id/assets` | List assets for exit |
| POST | `/exits/:id/assets` | Add asset to return list |
| PUT | `/exits/:id/assets/:assetId` | Update asset status |

### Knowledge Transfer
| Method | Path | Description |
|--------|------|-------------|
| POST | `/exits/:id/kt` | Create KT plan |
| PUT | `/exits/:id/kt` | Update KT (assign successor) |
| POST | `/exits/:id/kt/items` | Add KT item |

### Letters
| Method | Path | Description |
|--------|------|-------------|
| GET | `/letter-templates` | List letter templates |
| POST | `/letter-templates` | Create template |
| POST | `/exits/:id/letters/generate` | Generate letter PDF |
| GET | `/exits/:id/letters/:letterId/download` | Download PDF |
| POST | `/exits/:id/letters/:letterId/send` | Email letter to employee |

### Other Endpoints
- **BGV**: CRUD for background verification records and reference checks
- **Alumni**: Directory listing, profile updates, opt-in
- **Settings**: Get/update org exit settings
- **Analytics**: Attrition rate, reason breakdown, department trends, tenure distribution, rehire pool

---

## Frontend Pages

### Admin Pages
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Active exits, clearance pending, FnF pending, attrition chart |
| `/exits` | Exit List | Table with filters (status, date, department, type) |
| `/exits/new` | Initiate Exit | Form: select employee, exit type, dates, reason |
| `/exits/:id` | Exit Detail | Tabs: Overview, Checklist, Clearance, Interview, FnF, Assets, KT, Letters |
| `/checklist-templates` | Checklist Templates | CRUD for exit checklist templates |
| `/interview-templates` | Interview Templates | CRUD for interview question templates |
| `/letter-templates` | Letter Templates | CRUD with Handlebars preview |
| `/clearance-config` | Clearance Config | Manage clearance departments |
| `/analytics` | Exit Analytics | Attrition rate, reason pie chart, department trends, tenure histogram |
| `/bgv` | BGV | Background verification records management |
| `/alumni` | Alumni Directory | Alumni listing |
| `/settings` | Settings | Module settings |

### Self-Service Pages
| Route | Page | Description |
|-------|------|-------------|
| `/my` | Self-Service Dashboard | Employee self-service overview |
| `/my/exit` | My Exit | Submit resignation, view status, checklist, clearance |
| `/my/exit/interview` | Exit Interview | Complete exit interview form |
| `/my/exit/kt` | Knowledge Transfer | Add KT documentation items |
| `/my/alumni` | My Alumni Profile | Opt in/update alumni profile |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- MySQL 8+
- Redis 7+
- EMP Cloud running (for authentication)
- EMP Payroll (optional, for salary data in FnF calculation)

### Install
```bash
git clone https://github.com/anthropic/emp-exit.git
cd emp-exit
pnpm install
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your database credentials and EMP Cloud URL
```

### Docker
```bash
docker-compose up -d
```

### Development
```bash
# Run all packages in development mode
pnpm dev

# Run individually
pnpm --filter @emp-exit/server dev    # Server on :4400
pnpm --filter @emp-exit/client dev    # Client on :5178

# Run migrations
pnpm --filter @emp-exit/server migrate
```

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Scaffolding + core exit request flow.
- Monorepo scaffold, server/client/shared setup, dual DB connections
- Migrations 001, 011, 012 (exit_requests, audit_logs, exit_settings)
- Core services: exit-request, settings, audit, auth
- Routes: `/exits`, `/settings`, `/health`
- Client: DashboardPage, ExitListPage, InitiateExitPage, basic ExitDetailPage

### Phase 2: Checklists & Clearance (Weeks 3-4)
**Goal:** Configurable exit workflows.
- Migrations 002, 003 (checklist templates/instances, clearance departments/records)
- Checklist service, clearance service
- Auto-creation: instantiate checklist and clearance records when exit is initiated
- Client: ChecklistTemplatesPage, ClearanceConfigPage, tabs in ExitDetailPage

### Phase 3: Exit Interviews & FnF (Weeks 5-6)
**Goal:** Structured feedback + financial settlement.
- Migrations 004, 005 (exit interviews, FnF settlement)
- Exit interview service, FnF service (reads salary data from emp-payroll DB or manual input)
- FnF calculation: pending salary, leave encashment, gratuity (15*basic*years/26), notice recovery
- Client: InterviewTemplatesPage, FnF breakdown tab, self-service interview submission

### Phase 4: Assets, KT & Letters (Weeks 7-8)
**Goal:** Complete operational exit workflow.
- Migrations 006, 007, 008 (asset returns, knowledge transfer, letter templates)
- Asset return, KT, and letter generation services (Handlebars + Puppeteer PDF)
- Client: Assets/KT/Letters tabs in ExitDetailPage, LetterTemplatesPage
- Self-service: view/download letters, manage KT items

### Phase 5: BGV, Alumni & Analytics (Weeks 9-10)
**Goal:** Post-exit capabilities.
- Migrations 009, 010 (BGV records, reference checks, alumni profiles)
- BGV, alumni, and analytics services
- Analytics: attrition rate, reason aggregation, department trends, tenure distribution
- Client: BGVPage, AlumniDirectoryPage, ExitAnalyticsPage

### Phase 6: Polish & Integration (Weeks 11-12)
**Goal:** Production readiness.
- BullMQ notification queues for exit events
- Rate limiting, complete Zod validators, error handling
- Unit tests (Vitest), E2E tests (Playwright)
- Register module in EMP Cloud module registry
- Docker Compose, documentation

---

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
