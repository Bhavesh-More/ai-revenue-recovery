# 🚀 Autonomous AI Revenue Recovery Platform

> **Built for Razorpay Hackathon 2026**

An autonomous, multi-directional AI revenue recovery system that **detects, diagnoses, decides, acts, and verifies** — recovering lost revenue for Razorpay merchants across **7 distinct failure directions** without customer notification storms or manual intervention.

```
Detect → Diagnose → Prioritize → Decide → Act → Observe → Recover / Escalate → Stop → Measure
```

---

## 📌 Table of Contents

- [What This Project Does](#-what-this-project-does)
- [The Problem](#-the-problem)
- [7 Recovery Directions](#-7-recovery-directions)
- [Tech Stack](#-tech-stack)
- [Monorepo Architecture](#-monorepo-architecture)
- [Quick Start Guide](#-quick-start-guide)
- [Environment Variables](#-environment-variables)
- [Docker Setup](#-docker-setup)
- [How the AI Agent Works](#-how-the-ai-agent-works)
- [Policy Engine & Guardrails](#-policy-engine--guardrails)
- [Live Demo Mode](#-live-demo-mode)
- [Batch Simulation Mode](#-batch-simulation-mode)
- [Dashboard](#-dashboard)
- [API Reference](#-api-reference)
- [Testing & Verification](#-testing--verification)
- [Key Design Decisions](#-key-design-decisions)
- [License](#-license)

---

## ✨ What This Project Does

This is **not** a passive dashboard that shows charts about lost revenue. It is an **autonomous agent system** that actively closes the operational loop:

- **Ingests** revenue-risk events (payment failures, checkout abandonments, failed subscriptions, overdue B2B invoices, failed mandates, broken promises) via webhooks and API calls
- **Diagnoses** root causes using an LLM (Ollama Cloud with GPT-OSS 120B)
- **Validates** planned interventions against deterministic policies and guardrails
- **Executes** bounded recovery actions — generating Razorpay payment links, scheduling smart retries, sending multi-channel notifications (Email, SMS, WhatsApp), or initiating Hinglish voice calls
- **Observes** payment outcomes via Razorpay webhooks
- **Verifies** exactly how much revenue was actually recovered (confirmed cash, not estimates)

All autonomously, without manual intervention, and without spamming customers.

---

## 🔴 The Problem

Revenue leakage happens across diverse payment lifecycles and **traditional solutions fail**:

| Failure Type | What Happens |
|---|---|
| **Payment Failures** | Cards expire, banks go down temporarily, insufficient funds |
| **Checkout Abandonment** | Customers drop off mid-payment due to friction or unexpected fees |
| **Subscription Churn** | Recurring payments fail silently — involuntary churn |
| **B2B Invoices** | Invoices go unpaid — missing POs, approval delays |
| **Mandate Failures** | UPI AutoPay/eNACH debits fail at the bank level |
| **Customer Promises** | Verbal/written commitments get lost and are never tracked |

- 🔴 **Brute-force retry storms** — blindly retry, annoying customers and banks
- 🟡 **Passive dashboards** — show metrics but don't *act*
- 🟠 **Manual operations** — unsustainable at scale

**This platform bridges the gap** with autonomous execution constrained by strict financial and communication guardrails.

---

## 🎯 7 Recovery Directions

### Direction 01 — Payment Degradation Recovery
Detect sudden spikes in payment failures, determine whether degradation is systemic or customer-specific, and prevent self-inflicted retry storms. Auto-throttles retries during provider outages and resumes gradually once health probes recover.

### Direction 02 — Checkout Drop-Off Recovery
Recover revenue from abandoned checkout sessions without blindly spamming discount codes. Uses intent scoring based on cart value, funnel depth, customer history, and abandonment reason.

### Direction 03 — Failed Subscription Renewal Recovery
Recover failed recurring subscription renewals and eliminate involuntary churn. Recovery ladder: automatic retry → delayed retry → customer notification → payment method update → alternative payment → human escalation → stop.

### Direction 04 — B2B Receivables Chaser
Accelerate collections of overdue high-value B2B invoices through context-aware, professional communication. Classifies intent (administrative, approval delay, cash-flow, dispute, intentional avoidance) and responds accordingly.

### Direction 05 — Mandate Failure Recovery (Retry Sequencer)
Intelligently sequence recurring debit retries on e-mandates (UPI AutoPay, eNACH, Card mandates) based on failure codes and banking processing cycles. Never blindly retries revoked/expired mandates.

### Direction 06 — Hinglish AI Voice Agent Recovery
Resolve high-value, complex, or unresponsive payment failures through natural, conversational voice calls in Hinglish (mixed Hindi + English). Voice is expensive and intrusive — **never the default**.

### Direction 07 — Promise-to-Pay (PTP) Commitment Tracker
Extract unstructured, natural-language customer commitments into structured, trackable financial obligations. Lifecycle: `pending` → `due_soon` → `due_today` → `fulfilled` / `partial` / `broken` / `rescheduled`.

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Monorepo** | Turborepo + Yarn 4 Workspaces | Fast, cached, incremental builds across 3 apps and 13 packages |
| **Backend API** | Node.js + Express 5 + TypeScript | High-throughput async I/O for webhooks and SSE streaming |
| **Background Jobs** | Redis + BullMQ | Job durability, delayed scheduling, concurrency control, exponential backoff |
| **Agent Orchestration** | LangGraph.js | Stateful cyclic workflow graphs with durable checkpoints and HITL semantics |
| **LLM Provider** | Ollama Cloud (GPT-OSS 120B) | OpenAI SDK compatible; multi-key pool with auto-rotation |
| **Validation** | Zod | Runtime boundary validation — LLM outputs strictly validated against typed schemas |
| **Database + ORM** | PostgreSQL 16 + Drizzle ORM | ACID transactions; zero-overhead TypeScript type inference |
| **Frontend** | Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui | App Router, server/client components, accessible UI, interactive charts |
| **Auth** | Clerk | Drop-in auth with dev sandbox fallback |
| **Payments** | Razorpay APIs + Webhooks + Payment Links | Authoritative payment state; webhook-driven case ingestion |
| **Voice** | Twilio | Cloud telephony for Hinglish voice recovery |
| **Email** | Resend | Transactional email delivery with styled HTML templates |
| **Logging** | Pino | Structured JSON logging with automatic PII redaction |
| **Tracing** | LangSmith | Step-by-step tracing and debugging of LangGraph agent runs |
| **Infrastructure** | Docker + Docker Compose | Isolated, reproducible container environment |

---

## 🏗️ Monorepo Architecture

```
ai-revenue-recovery/
├── apps/
│   ├── api/              # Express REST API & Webhook Listeners (Port 4000)
│   ├── worker/           # BullMQ Background Worker Process
│   └── web/              # Next.js 16 Web Dashboard (Port 3000)
│
├── packages/
│   ├── agent/            # 🧠 LangGraph Autonomous Agent & Analyzers
│   ├── audit/            # 📋 Audit Trail & Event Lineage Recording
│   ├── case-lifecycle/   # 🔄 State Machine, Recovery Metrics, Demo Scenarios
│   ├── config/           # ⚙️ Environment & App Configuration (Zod-validated)
│   ├── db/               # 🗄️ Drizzle ORM PostgreSQL Schemas & Migrations
│   ├── event-ingestion/  # 📥 Event Normalization & Directional Routing
│   ├── integrations/     # 🔌 Razorpay, Email, SMS, WhatsApp, Voice APIs
│   ├── llm/              # 🤖 Ollama Cloud Client & Retry Handler
│   ├── logger/           # 📝 Structured Logger (Pino) with PII Redaction
│   ├── policy/           # 🛡️ Policy Engine, Guardrails & Execution Limits
│   ├── queue/            # 📮 BullMQ Redis Queue Setup
│   ├── types/            # 📐 TypeScript Shared Types & Enums
│   └── validation/       # ✅ Zod Schemas & Validators
│
├── scripts/              # Dev tooling, seed scripts, verification scripts
├── docker-compose.yml    # Multi-service orchestrator
├── turbo.json            # Build pipeline configuration
└── package.json          # Root workspace configuration
```

### Why a Monorepo?
- **Shared types** — `@recovery/types` ensures type safety across API, Worker, Agent, and Dashboard
- **Atomic changes** — schema + validation + route changes in a single commit
- **Dependency graph** — Turborepo builds packages in topological order with caching
- **No version mismatch** — all apps always use the same version of every shared package

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js 20+**
- **Yarn 4** (`corepack enable`)
- **Docker** (for PostgreSQL 16 & Redis 7)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-org/ai-revenue-recovery.git
cd ai-revenue-recovery
yarn install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Fill in your API keys (Ollama Cloud, Razorpay, Resend, etc.)
```

### 3. Start Infrastructure (PostgreSQL & Redis)

```bash
yarn docker:up
```

This starts:
- **PostgreSQL 16** on port `5433` (mapped from container 5432 to avoid macOS conflicts)
- **Redis 7** on port `6379`

### 4. Build Monorepo

```bash
yarn build
```

### 5. Run All Services

```bash
yarn dev
```

| Service | URL |
|---|---|
| **Web Dashboard** | `http://localhost:3000` |
| **Express API** | `http://localhost:4000` |

### 6. (Optional) Run Worker Separately

```bash
yarn worker
```

### 7. (Optional) Expose API via Ngrok Tunnel

For receiving Razorpay webhooks locally:
```bash
yarn tunnel
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in your values. All variables are validated at startup via Zod.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | ✅ | `development` | Environment mode |
| `API_PORT` | | `4000` | API server port |
| `API_HOST` | | `0.0.0.0` | API bind address |
| `API_VERSION` | | `v1` | API version prefix |
| `CORS_ORIGIN` | | `http://localhost:3000` | Allowed CORS origin |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string (port **5433** on host) |
| `DATABASE_POOL_MAX` | | `10` | DB connection pool size |
| `REDIS_URL` | | `redis://localhost:6379` | Redis connection for BullMQ |
| `OLLAMA_API_KEY` | ✅ | — | Ollama Cloud API key (single key) |
| `OLLAMA_API_KEY_1..N` | | — | Multi-key pool with auto-rotation |
| `OLLAMA_BASE_URL` | | `https://ollama.com/v1` | LLM API base URL |
| `OLLAMA_MODEL` | | `gpt-oss:120b` | LLM model identifier |
| `OLLAMA_TIMEOUT_MS` | | `30000` | LLM request timeout |
| `RAZORPAY_KEY_ID` | ✅ | — | Razorpay test/live key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | — | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | — | HMAC webhook verification secret |
| `RESEND_API_KEY` | | — | Resend email API key |
| `EMAIL_FROM` | | — | Sender email address |
| `CLERK_AUTH_ENABLED` | | `false` | Enable Clerk authentication |
| `CLERK_SECRET_KEY` | | — | Clerk secret key |
| `WORKER_CONCURRENCY` | | `2` | BullMQ worker concurrency |
| `LOG_LEVEL` | | `info` | Pino log level |
| `LANGSMITH_TRACING` | | `false` | Enable LangSmith tracing |
| `LANGSMITH_API_KEY` | | — | LangSmith API key |
| `LANGSMITH_PROJECT` | | `ai-revenue-recovery` | LangSmith project name |

**Next.js Dashboard** (`apps/web/.env.local`):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API base URL for the frontend |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | dev fallback | Clerk publishable key (optional) |

---

## 🐳 Docker Setup

### Development (Infrastructure Only)

```bash
yarn docker:up      # Start PostgreSQL + Redis
yarn docker:down    # Stop all containers
yarn docker:logs    # Tail container logs
```

### Full Containerized Stack

```bash
yarn docker:full    # Build and run all 5 services
```

| Service | Image | Port | Purpose |
|---|---|---|---|
| `recovery-postgres` | `postgres:16-alpine` | **5433**:5432 | PostgreSQL database |
| `recovery-redis` | `redis:7-alpine` | 6379:6379 | Redis for BullMQ |
| `recovery-api` | Custom Dockerfile | 4000:4000 | Express API server |
| `recovery-worker` | Custom Dockerfile | — | BullMQ background worker |
| `recovery-web` | Custom Dockerfile | 3000:3000 | Next.js dashboard |

---

## 🧠 How the AI Agent Works

The agent core (`@recovery/agent`) is built as a reusable **LangGraph StateGraph** shared across all 7 recovery directions:

```
[START]
   │
   ▼
[loadContext]        ← Loads case, customer profile, last 25 actions, applicable policy
   │
   ▼
  [reason]           ← Invokes Ollama Cloud (GPT-OSS 120B) for root-cause diagnosis
   │
   ▼
[checkPolicy] ────── (deny) ──────────────────────────► [recordOutcome] ──► [END]
   │
   ├── (require_approval) ──► [waitForApproval] ──────► [execute] ─────► [recordOutcome] ──► [END]
   │                              ▲ (resume via Command)
   └── (allow) ───────────────────┴───────────────────► [execute] ─────► [recordOutcome] ──► [END]
```

### Safety Chain

Every AI decision passes through this chain before any real-world action:

```
LLM Proposal → Zod Validation → Policy Validation → Authorization → Tool Execution → Audit Log
```

The LLM **proposes**. Zod **validates structure**. Policy **authorizes**. Only then does the tool **execute**. And everything is **audited**.

### Human-in-the-Loop (HITL)

If the policy engine returns `require_approval`, the LangGraph `interrupt()` pauses execution. State is preserved in the checkpointer (keyed by `caseId`). An operator approves via the API, and execution resumes exactly where it paused.

---

## 🛡️ Policy Engine & Guardrails

The policy engine (`@recovery/policy`) is the **deterministic guardrail** that the LLM cannot bypass:

```
1. STOP RULES (Hard Deny)
   ├── Customer opted out        → DENY
   ├── Customer cancelled        → DENY
   └── Human takeover in progress → DENY

2. RETRY LIMITS (Hard Deny)
   ├── Attempts ≥ maxPaymentRetries (3)          → DENY
   └── Time since last attempt < 3600s           → DENY

3. COMMUNICATION LIMITS (Hard Deny)
   ├── Messages sent ≥ maxMessages (3)           → DENY
   └── Channel not in allowedChannels            → DENY

4. FINANCIAL LIMITS (Requires Approval)
   └── Amount ≥ ₹5,00,000                       → REQUIRE_APPROVAL

5. ESCALATION RULES (Requires Approval)
   ├── High-value + amount ≥ threshold           → REQUIRE_APPROVAL
   └── Repeated failures ≥ threshold             → REQUIRE_APPROVAL

6. ALL CHECKS PASS                               → ALLOW
```

All monetary values use `BigInt` in minor units (paise) to prevent floating-point errors.

---

## 🎮 Live Demo Mode

Live Demo Mode executes a **real, end-to-end recovery scenario** using actual external APIs (Razorpay TEST mode + Resend email):

1. User selects a direction (1–7) and enters customer details
2. System creates a customer, synthesizes a direction-specific event, and creates a recovery case
3. AI Reasoner performs root-cause diagnosis and recommends an action
4. Policy engine evaluates → **Allow** or **Require Approval**
5. On approval: creates a **real Razorpay payment link** (TEST mode) and sends a **real email** via Resend
6. User receives the email, clicks the link, pays on Razorpay checkout
7. Razorpay fires a webhook → case **auto-recovers**
8. Dashboard updates in **real-time via SSE**

---

## 📊 Batch Simulation Mode

Large-scale, **reproducible evaluation** of AI recovery strategies against synthetic customer populations (up to 2,000 cases per batch).

- Configurable: generation mode, case count, amount bounds, random seed
- Edge case injection: hardship claims (4%), high-exposure overrides (4%), repeated degradation surges (5%), disputed charges (3%)
- Both Live Demo and Batch Simulation write to the **identical database schema** — same dashboard, same metrics, same audit viewer

---

## 📱 Dashboard

| Page | Route | Highlights |
|---|---|---|
| **Overview** | `/` | 5 KPI cards, Live Agent Activity, Recovery by Direction, Autonomous Funnel |
| **Recovery Cases** | `/recovery-cases` | Sortable/filterable table, pagination, CSV export |
| **Case Detail** | `/recovery-cases/[caseId]` | Timeline, AI Rationale, Policy Decision, Recovery Outcome |
| **Batches** | `/batches` | Synthetic batch generator, live streaming progress |
| **Approvals** | `/approvals` | HITL review queue with Approve/Reject/Request Info |
| **Policies** | `/policies` | Global limits editor, direction-specific overrides |
| **Audit Log** | `/audit-log` | Full audit trail with filters, expandable JSON, CSV export |
| **7 Directions** | `/directions/*` | Direction-specific dashboards with KPIs and risk charts |

All monetary values formatted in Indian notation (₹, Lakhs, Crores).

---

## 🌐 API Reference

### Core Endpoints

| Category | Endpoints | Purpose |
|---|---|---|
| **Health** | `GET /health`, `GET /health/llm` | DB check, Ollama Cloud ping, key pool stats |
| **Stream** | `GET /stream` | SSE real-time event pipeline (heartbeat every 10s) |
| **Events** | `POST /events` | Ingest revenue events, create recovery cases |
| **Cases** | CRUD + transitions + payment links | Core case management |
| **Agent** | `/cases/:id/analyze`, `/recover`, `/decisions` | Trigger AI reasoner, HITL approve/reject |
| **Live Demo** | `POST /live-demo/execute`, `/approve` | End-to-end real execution |
| **Batches** | `POST /batches`, `GET /batches/:id/evaluate` | Synthetic batch generation and evaluation |
| **Metrics** | `GET /metrics`, `/metrics/evaluate` | Platform-wide recovery metrics |
| **Policies** | CRUD + `/policy-check` | Policy management and evaluation |
| **Audit** | `GET /audit-events` | Paginated audit trail with filtering |
| **Webhooks** | `POST /webhooks/razorpay` | HMAC-verified Razorpay webhook ingestion |
| **Promises** | CRUD + `/check` + `/history` | PTP lifecycle tracking |

### Webhook Hardening
- **HMAC SHA256** signature verification on `x-razorpay-signature`
- **Replay protection** — rejects webhooks with timestamp drift > 300 seconds
- Webhook endpoints excluded from Clerk auth middleware

---

## 🧪 Testing & Verification

### Seed Demo Scenarios
```bash
yarn seed:scenarios    # Seed 7 pre-configured realistic scenarios
```

### Run End-to-End Tests
```bash
npx tsx apps/api/src/test-direction-01-e2e.ts    # Direction 01 E2E
npx tsx apps/api/src/test-multi-direction.ts      # Multi-direction benchmark
npx tsx apps/api/src/test-error-handling.ts        # Error handling
```

### Automated Playwright E2E
```bash
yarn test:e2e
```

### Monorepo-wide
```bash
yarn lint        # Lint all packages
yarn typecheck   # Type-check all packages
yarn test        # Run all tests
```

---

## 💡 Key Design Decisions

| Decision | Rationale |
|---|---|
| **Policy-as-Code Guardrails** | No recovery action executes without passing through `@recovery/policy`. LLMs cannot unilaterally issue refunds, invent discounts, or spam customers |
| **Deterministic Dual-Mode** | Live Demo and Batch Simulation write to the identical schema — eliminates "works in test, breaks in prod" |
| **Immutable Audit Trail** | Every transition + audit entry in the same DB transaction — audit logs can never drift from actual state |
| **SSE over WebSockets** | Simpler, auto-reconnects natively, works through proxies — sufficient for unidirectional push |
| **BigInt for Money** | `0.1 + 0.2 !== 0.3` in JS. All values stored as `bigint` in minor units (paise) |
| **Drizzle over Prisma** | Zero code generation, no heavy runtime client, full TypeScript type inference from schema |
| **Webhook Hardening** | HMAC SHA256 + 300s replay protection — unsecured webhooks are a trivial financial attack vector |
| **Decoupled Worker** | Prevents webhook timeouts, enables horizontal scaling, fault-tolerant via Redis job persistence |

---

## 📜 License

MIT License. Built with ❤️ for Razorpay Hackathon 2026.
