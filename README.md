# Autonomous AI Revenue Recovery Platform

An autonomous, multi-directional AI revenue recovery system built for Razorpay merchants to recover lost revenue across 7 distinct failure directions without customer notification storms or manual intervention.

---

## 🌟 Key Features & 7 Recovery Directions

1. **Direction 01 — Payment Degradation Recovery**: Gateway failover (e.g. HDFC Netbanking drop → ICICI failover), optimal retry scheduling, payment link generation for expired cards.
2. **Direction 02 — Checkout Drop-Off Recovery**: Cart abandonment risk scoring, dynamic recovery incentives (5% instant discount links), exit-intent touchpoints.
3. **Direction 03 — Failed Subscription Renewal Recovery**: Dunning timeline optimization, grace period management, payment method update links.
4. **Direction 04 — B2B Receivables Recovery**: High-value invoice dunning, CFO/AE escalation rules, formal payment reminders.
5. **Direction 05 — Mandate Failure Recovery**: UPI AutoPay debit failure re-presentment, salary-day optimal retry windows.
6. **Direction 06 — Hinglish AI Voice Agent Recovery**: High-touch EMI & subscription recovery via natural Hinglish AI voice calls, automated PTP commitments.
7. **Direction 07 — Promise-to-Pay (PTP) Commitment Tracker**: PTP lifecycle tracking, pre-due reminders, broken promise escalation.

---

## 🏗️ Monorepo Architecture

Managed via Yarn 4 and Turborepo:

```text
ai-revenue-recovery/
├── apps/
│   ├── api/          # Express REST API & Webhook Listeners (Port 3001)
│   ├── worker/       # BullMQ Worker Process (Async Retry Jobs)
│   └── web/          # Next.js 16 Web Dashboard (Port 3000)
├── packages/
│   ├── agent/        # LangChain / LangGraph Autonomous Agent & Analyzers
│   ├── audit/        # Audit Trail & Event Lineage Recording
│   ├── case-lifecycle/ # State Machine, Recovery Metrics, Demo Scenarios
│   ├── config/       # Environment & App Configuration
│   ├── db/           # Drizzle ORM PostgreSQL Schemas & Migrations
│   ├── event-ingestion/# Event Normalization & Directional Routing
│   ├── integrations/ # Razorpay, Email, SMS, WhatsApp, Voice APIs
│   ├── llm/          # Ollama / Local LLM Client & Retry Handler
│   ├── logger/       # Structured Logger (Pino)
│   ├── policy/       # Policy Engine, Guardrails & Execution Limits
│   ├── queue/        # BullMQ Redis Queue Setup
│   ├── types/        # TypeScript Shared Types & Enums
│   ├── ui/           # Shared UI Component Library
│   └── validation/   # Zod Schemas & Validators
├── docker-compose.yml# Multi-stage Docker Compose orchestrator
└── package.json
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 20+
- Yarn 4 (`corepack enable`)
- PostgreSQL 16
- Redis 7

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/ai-revenue-recovery.git
cd ai-revenue-recovery
yarn install
```

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Docker Local Infrastructure
Start PostgreSQL and Redis:
```bash
yarn docker:up
```

### 4. Build Monorepo
```bash
yarn build
```

### 5. Run All Services
```bash
yarn dev
```
- **Web Dashboard**: `http://localhost:3000`
- **Express API**: `http://localhost:3001`

---

## 🧪 Testing & Verification Commands

### Seed Demo Scenarios
Seed 7 pre-configured realistic scenarios across all recovery directions:
```bash
yarn seed:scenarios
```

### Run Direction 01 End-to-End Test
```bash
npx tsx apps/api/src/test-direction-01-e2e.ts
```

### Run Multi-Direction Benchmark Test
```bash
npx tsx apps/api/src/test-multi-direction.ts
```

### Run Production Error Handling Test
```bash
npx tsx apps/api/src/test-error-handling.ts
```

### Run Automated Playwright E2E Browser Test
```bash
yarn test:e2e
```

---

## 🐳 Docker Production Setup

Run the full containerized stack:
```bash
yarn docker:full
```

---

## 📜 License

MIT License. Developed for Razorpay Hackathon 2026.
