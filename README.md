# EMP Exit

> Simplify exit formalities and manage background verification portfolio efficiently

[![Part of EmpCloud](https://img.shields.io/badge/EmpCloud-Module-blue)]()
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-green.svg)](LICENSE)
[![Status: Built](https://img.shields.io/badge/Status-Built-green)]()

EMP Exit is the offboarding and exit management module of the EmpCloud ecosystem. It provides configurable exit workflows, clearance management, exit interviews, full and final settlement calculation, asset return tracking, knowledge transfer, letter generation, background verification portfolios, alumni network, predictive attrition dashboard, notice period buyout calculator, exit stage email notifications, rehire workflow, and exit survey NPS tracking.

---

## Project Status

**Built** -- all phases implemented and tested.

| Metric | Count |
|--------|-------|
| Database tables | 24+ |
| Frontend pages | 25+ |
| Migrations | 5 |

---

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| Offboarding Workflows | Built | Configurable exit checklists per role/department, multi-department sign-off |
| Exit Interviews | Built | Structured feedback forms, reason for leaving, ratings, suggestions |
| Full & Final Settlement | Built | Calculate pending salary, leave encashment, gratuity, deductions, notice recovery |
| Asset Return Tracking | Built | Track asset returns, verify condition, damage assessment |
| Knowledge Transfer | Built | KT documentation, handover checklists, successor assignment |
| Clearance Workflow | Built | Department-wise clearance (IT, Finance, HR, Admin, Manager), approval chain |
| Letter Generation | Built | Experience letter, relieving letter, service certificate with Handlebars templates |
| Background Verification | Built | Store verification results, reference checks, employment history |
| Rehire Eligibility | Built | Flag ex-employees as rehire eligible/not, with notes |
| Exit Analytics | Built | Attrition rate, reason analysis, department-wise trends, tenure at exit |
| Alumni Network | Built | Optional alumni directory for ex-employees |
| Predictive Attrition Dashboard | Built | Flight risk scoring 0-100, risk factors analysis, department heatmap visualization |
| Notice Period Buyout Calculator | Built | Calculate buyout amount, request/approve workflow, F&F integration |
| Exit Stage Email Notifications | Built | 6 branded email templates for each exit milestone (initiation, clearance, interview, FnF, letter, completion) |
| Rehire Workflow | Built | Alumni -> screening -> approved -> hired pipeline, reactivate user in EMP Cloud |
| Exit Survey NPS | Built | Net Promoter Score calculation, gauge visualization, trend tracking over time |
| API Documentation | Built | Swagger UI at /api/docs with OpenAPI 3.0 spec |

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
| Email | Handlebars templates + Nodemailer |

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
          migrations/           # 5 migration files
        api/
          middleware/            # auth, RBAC, error handling
          routes/               # Route handlers per domain
        services/               # Business logic per domain
        jobs/                   # BullMQ workers (notifications, letter gen, attrition scoring, email)
        utils/                  # Logger, errors, response helpers
        swagger/                # OpenAPI spec & Swagger UI setup
        templates/              # Handlebars email templates (6 exit stage templates)
    client/                     # @emp-exit/client (port 5178)
      src/
        api/                    # API client & hooks
        components/
          layout/               # DashboardLayout, SelfServiceLayout
          ui/                   # Radix-based UI primitives
          exit/                 # ExitStatusBadge, ClearanceProgress, FnFBreakdown, NPSGauge, RiskHeatmap, etc.
        pages/                  # Route-based page components
        lib/                    # Auth store, utilities
```

---

## Database Tables (24+)

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
| `attrition_scores` | Predictive flight risk scores (0-100) with risk factors |
| `buyout_requests` | Notice period buyout requests with calculated amounts and approval status |
| `exit_survey_responses` | NPS survey responses with score and comments |
| `rehire_applications` | Rehire pipeline records (alumni -> screening -> approved -> hired) |
| `exit_email_logs` | Log of sent exit stage notification emails |

**5 migrations** across the database schema.

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
| POST | `/self-service/nps-survey` | Submit NPS survey response |

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

### Predictive Attrition Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/attrition/scores` | Get flight risk scores for all employees (0-100) |
| GET | `/attrition/scores/:employeeId` | Get individual risk score with factors |
| GET | `/attrition/heatmap` | Department-level attrition heatmap |
| POST | `/attrition/recalculate` | Trigger risk score recalculation |
| GET | `/attrition/trends` | Attrition trend over time |

### Notice Period Buyout Calculator
| Method | Path | Description |
|--------|------|-------------|
| POST | `/exits/:id/buyout/calculate` | Calculate buyout amount |
| POST | `/exits/:id/buyout/request` | Submit buyout request |
| PUT | `/exits/:id/buyout/approve` | Approve/reject buyout request |
| GET | `/exits/:id/buyout` | Get buyout details and status |

### Exit Stage Email Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/email-templates` | List exit stage email templates |
| PUT | `/email-templates/:stage` | Update email template for a stage |
| POST | `/email-templates/:stage/preview` | Preview rendered email template |
| GET | `/exits/:id/email-log` | View sent emails for an exit |

### Rehire Workflow
| Method | Path | Description |
|--------|------|-------------|
| GET | `/rehire` | List rehire applications |
| POST | `/rehire` | Create rehire application from alumni |
| PUT | `/rehire/:id/screen` | Move to screening stage |
| PUT | `/rehire/:id/approve` | Approve for rehire |
| POST | `/rehire/:id/hire` | Complete rehire (reactivate user in EMP Cloud) |
| GET | `/rehire/eligible` | List alumni eligible for rehire |

### Exit Survey NPS
| Method | Path | Description |
|--------|------|-------------|
| GET | `/nps/scores` | Get NPS calculation (promoters, passives, detractors) |
| GET | `/nps/trends` | NPS trend over time (monthly/quarterly) |
| GET | `/nps/responses` | List all survey responses |
| GET | `/nps/department/:deptId` | Department-level NPS breakdown |

### Other Endpoints
- **BGV**: CRUD for background verification records and reference checks
- **Alumni**: Directory listing, profile updates, opt-in
- **Settings**: Get/update org exit settings
- **Analytics**: Attrition rate, reason breakdown, department trends, tenure distribution, rehire pool
- **API Docs**: Swagger UI at `/api/docs`

---

## Frontend Pages (25+)

### Admin Pages
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Active exits, clearance pending, FnF pending, attrition chart |
| `/exits` | Exit List | Table with filters (status, date, department, type) |
| `/exits/new` | Initiate Exit | Form: select employee, exit type, dates, reason |
| `/exits/:id` | Exit Detail | Tabs: Overview, Checklist, Clearance, Interview, FnF, Assets, KT, Letters, Buyout |
| `/checklist-templates` | Checklist Templates | CRUD for exit checklist templates |
| `/interview-templates` | Interview Templates | CRUD for interview question templates |
| `/letter-templates` | Letter Templates | CRUD with Handlebars preview |
| `/email-templates` | Email Templates | Configure 6 exit stage email templates |
| `/clearance-config` | Clearance Config | Manage clearance departments |
| `/attrition` | Predictive Attrition | Flight risk scores, department heatmap, risk factor analysis |
| `/attrition/:employeeId` | Employee Risk Detail | Individual risk score breakdown with factors |
| `/nps` | Exit Survey NPS | NPS gauge visualization, trend charts, response breakdown |
| `/rehire` | Rehire Management | Pipeline view: alumni -> screening -> approved -> hired |
| `/analytics` | Exit Analytics | Attrition rate, reason pie chart, department trends, tenure histogram |
| `/bgv` | BGV | Background verification records management |
| `/alumni` | Alumni Directory | Alumni listing with rehire eligibility indicators |
| `/settings` | Settings | Module settings, buyout rules, email config |

### Self-Service Pages
| Route | Page | Description |
|-------|------|-------------|
| `/my` | Self-Service Dashboard | Employee self-service overview |
| `/my/exit` | My Exit | Submit resignation, view status, checklist, clearance |
| `/my/exit/interview` | Exit Interview | Complete exit interview form |
| `/my/exit/kt` | Knowledge Transfer | Add KT documentation items |
| `/my/exit/buyout` | Notice Buyout | Request notice period buyout, view calculation |
| `/my/exit/nps` | NPS Survey | Submit exit NPS survey |
| `/my/exit/letters` | My Letters | View and download exit letters |
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

Once running, visit:
- **Client**: http://localhost:5178
- **API**: http://localhost:4400
- **API Documentation**: http://localhost:4400/api/docs

---

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
