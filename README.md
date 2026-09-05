# Razorpay Nexus-Agent

Multi-track payment optimization engine for the **Razorpay AI Buildathon 2026** targeting:
- **Track 01**: Agentic Commerce (AI-buyer transactable endpoints)
- **Track 03**: Revenue Recovery (circuit-breaker routing)
- **Track 04**: Finance Controller (batch reconciliation + honest exceptions)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend       │     │  Backend        │     │  Workers        │
│  (Next.js 14)   │────▶│  (FastAPI)      │────▶│  (Celery)       │
│                 │     │                 │     │                 │
│ • Agent Catalog │     │ • Checkout API  │     │ • Compliance    │
│ • Merchant Dash │     │ • Webhooks      │     │ • Reconciliation│
│ • JSON-LD SEO   │     │ • Circuit Breaker│    │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
               ┌─────────┐ ┌──────────┐ ┌──────────┐
               │Supabase │ │ Upstash  │ │ Razorpay │
               │(Postgres)│ │ Redis    │ │ API      │
               └─────────┘ └──────────┘ └──────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)
- Razorpay test credentials
- OpenAI API key (for compliance engine)

### 1. Clone & Configure

```bash
cd Razorpay-Nexus-Agent
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env .env
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp ../.env .env.local
npm run dev
```

**Celery Worker:**
```bash
cd backend
source venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info
```

## Project Structure

```
razorpay-nexus-agent/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # API routes
│   │   │   ├── checkout.py   # Gateway router + circuit breaker
│   │   │   ├── webhooks.py   # Razorpay webhook handler
│   │   │   ├── reconciliation.py  # Batch audit (Track 04)
│   │   │   └── health.py     # Health checks
│   │   ├── core/             # Core infrastructure
│   │   │   ├── config.py     # Pydantic settings
│   │   │   ├── rate_limiter.py  # Upstash Redis token bucket
│   │   │   └── circuit_breaker.py  # Gateway failover
│   │   ├── services/
│   │   │   └── compliance.py # LangChain + GPT-4o-mini RBI extractor
│   │   ├── workers/
│   │   │   ├── celery_app.py # Celery configuration
│   │   │   └── tasks.py      # Background tasks
│   │   └── main.py           # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── agent-catalog/        # Track 01: JSON-LD catalog
│   │   └── merchant-dashboard/   # Track 01/03: Human approval
│   ├── components/               # React components
│   ├── lib/                      # Utilities
│   ├── package.json
│   └── Dockerfile
├── shared/
│   └── schemas/                  # Shared Pydantic models
├── docker-compose.yml
├── .env.example
└── README.md
```

## Key Features

### Track 01: Agentic Commerce
- **AgentCatalog** (`/agent-catalog`): Products with JSON-LD microdata for AI agent discovery
- **Merchant Dashboard** (`/merchant-dashboard`): Human approval gate for payments
- Structured metadata injection for programmatic buyers

### Track 03: Revenue Recovery
- **Circuit Breaker** (`backend/app/core/circuit_breaker.py`): Monitors gateway health, auto-failover
- **Rate Limiter** (`backend/app/core/rate_limiter.py`): Upstash Redis token bucket at edge
- **Graceful Degradation**: Fallback routing with audit trail

### Track 04: Finance Controller
- **Batch Reconciliation** (`backend/app/api/v1/reconciliation.py`): 50+ record processing
- **Honest Exception Matrix**: Three exception classes with full context
- **RBI Purpose Code Validation**: PA-CB compliance checking

## API Endpoints

### Checkout & Payments
```
POST   /api/v1/nexus/checkout-orchestrator  # Process payment intent
GET    /api/v1/gateway/health               # Gateway health check
POST   /api/v1/gateway/simulate-failure     # Test circuit breaker
```

### Webhooks
```
POST   /api/v1/webhooks/razorpay            # Razorpay webhook receiver
```

### Reconciliation
```
POST   /api/v1/reconciliation/batch-audit   # Run batch audit
GET    /api/v1/reconciliation/mock-registry # Get mock webhook data
POST   /api/v1/reconciliation/generate-test-batch  # Generate test data
```

### Health
```
GET    /health                              # Basic health
GET    /healthz                             # Kubernetes probe
GET    /ready                               # Readiness check
GET    /config                              # Non-sensitive config
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret | Yes |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature secret | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | Yes |
| `OPENAI_API_KEY` | OpenAI API key for compliance | Yes |
| `CELERY_BROKER_URL` | Redis URL for Celery | Yes |

## Testing

### Run Backend Tests
```bash
cd backend
pytest -v --cov=app
```

### Test Circuit Breaker
```bash
# Simulate gateway failure
curl -X POST http://localhost:8000/api/v1/gateway/simulate-failure?healthy=false

# Check health
curl http://localhost:8000/api/v1/gateway/health
```

### Test Reconciliation
```bash
# Generate test batch
curl -X POST http://localhost:8000/api/v1/reconciliation/generate-test-batch?count=50

# Run audit
curl -X POST http://localhost:8000/api/v1/reconciliation/batch-audit \
  -H "Content-Type: application/json" \
  -d @test_batch.json
```

## Deployment

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Railway/Render (Backend)
1. Connect repo
2. Set environment variables
3. Add `uvicorn app.main:app --host 0.0.0.0 --port $PORT` as start command

### Supabase
1. Create project at supabase.com
2. Get connection string and API keys
3. Add to environment variables

### Upstash Redis
1. Create database at upstash.com
2. Get REST URL and token
3. Add to environment variables

## Buildathon Demo Script

1. **Start at `/agent-catalog`** - Show JSON-LD in page source for AI agents
2. **Click "Initiate Checkout"** - Watch terminal: cents conversion, circuit breaker, human gate
3. **Go to `/merchant-dashboard`** - Approve/Reject payment
4. **Click "Reconciliation" tab** - Generate 50 records, run audit, show exception matrix

## License

Proprietary - Razorpay AI Buildathon 2026 Submission