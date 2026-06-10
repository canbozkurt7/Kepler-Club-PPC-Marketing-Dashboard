# Kepler Club PPC Marketing Dashboard - Backend

Real-time dashboard for aggregating and monitoring Google Ads, Meta Ads, and Yandex Ads performance across 3 airport lounges (Istanbul, Kuala Lumpur, Riga).

## Project Structure

```
backend/
├── app/
│   ├── models/              # SQLAlchemy ORM models (campaigns, metrics, alerts)
│   ├── fetchers/            # API clients for Google Ads, Meta, Yandex
│   ├── processors/          # Data normalization, enrichment, segmentation
│   ├── jobs/                # Scheduled sync jobs (hourly)
│   ├── alerts/              # Alert engine and notifiers (email, WebSocket)
│   ├── api/
│   │   └── v1/              # FastAPI REST endpoints
│   ├── config.py            # Pydantic settings (loads from .env)
│   ├── database.py          # SQLAlchemy setup
│   └── main.py              # FastAPI app initialization
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variables template
└── init_db.py               # Database initialization script
```

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required:**
- `DATABASE_URL` - Supabase or local PostgreSQL connection string
- `GOOGLE_ADS_*` - Google Ads API credentials
- `SMTP_*` - Email configuration for alerts

**Optional (Phase 2):**
- `META_ACCESS_TOKEN` - Meta Ads API token
- `YANDEX_API_TOKEN` - Yandex Ads API token

### 4. Initialize Database

```bash
python init_db.py
```

This will:
- Create all database tables
- Seed platforms (google, meta, yandex)
- Seed locations (SAW, KLIA, RIX)
- Create default alert rules

### 5. Run the Server

```bash
python -m uvicorn app.main:app --reload
```

Access:
- API: http://localhost:8000/
- API Docs: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc

## API Endpoints (Phase 1)

### Dashboard Summary
```
GET /api/v1/dashboard/summary
  ?date_from=2026-05-10
  &date_to=2026-06-10
  &location=SAW
```

Returns aggregated metrics for the date range and location.

### Campaigns
```
GET /api/v1/campaigns?location=SAW&sort_by=roas
```

Returns campaigns with aggregated metrics (last 30 days).

### Alerts
```
GET /api/v1/alerts?status=TRIGGERED
```

Returns recent alert history.

## Data Pipeline

```
Google Ads API
    ↓
GoogleAdsClientWrapper (fetch_google_ads.py)
    ↓
DataNormalizer (normalizer.py)
    ↓
DataEnricher (enricher.py) - Calculate KPIs
    ↓
CampaignSegmenter (segmenter.py) - Parse location from campaign name
    ↓
PlatformSyncer (fetch_all_platforms.py) - Store in PostgreSQL
    ↓
AlertEngine (engine.py) - Evaluate rules
    ↓
EmailNotifier (notifiers.py) - Send alerts
```

## Alert Rules (Phase 1)

1. **ROAS < 1.5** (CRITICAL) → Email + Dashboard
2. **ROAS < 2.0** (HIGH) → Dashboard only
3. **CPA > €200** (HIGH) → Email + Dashboard
4. **Zero Conversions in 24h** (CRITICAL) → Email + Dashboard
5. **CTR < 2%** (LOW) → Dashboard only

## Database Schema (Phase 1)

### Core Tables

- `platforms` - google, meta, yandex
- `locations` - SAW, KLIA, RIX
- `campaigns` - Campaign details with location mapping
- `ad_groups` - Ad groups within campaigns
- `daily_metrics` - Daily performance metrics (impressions, clicks, conversions, spend, KPIs)
- `alert_rules` - Alert configuration
- `alert_history` - Alert trigger events
- `sync_logs` - Data sync logs (for debugging)

### Upcoming (Phase 2-4)

- `hourly_metrics_snapshot` - Fast "today's spend" queries
- `clarity_friction_metrics` - Microsoft Clarity friction data
- `sessions` - User session tracking
- `conversions` - Detailed conversion logs

## Configuration

### Database (Supabase)

```python
DATABASE_URL=postgresql://[user]:[password]@db.supabase.co:5432/postgres
```

### Google Ads

Get credentials from Google Cloud Console:
1. Create OAuth 2.0 Desktop Application
2. Generate refresh token using `oauth2l`
3. Get developer token from Google Ads

### Email Alerts

Gmail example with app password:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
```

## Scheduled Jobs (APScheduler)

**Phase 1 MVP:**
- Hourly Google Ads sync (next phase: add Meta + Yandex)
- Hourly alert evaluation

**Phase 4:**
- 6-hourly Clarity friction data sync
- Daily report generation

## Testing

```bash
pytest tests/ -v
```

## Debugging

Enable debug logging in `.env`:
```
DEBUG=true
```

Check sync logs:
```sql
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10;
```

Check recent alerts:
```sql
SELECT a.*, r.alert_type FROM alert_history a
JOIN alert_rules r ON a.rule_id = r.id
ORDER BY a.triggered_at DESC LIMIT 20;
```

## Deployment

### Development
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Production (with Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

### With Docker
```bash
docker build -t kepler-ppc-dashboard:latest .
docker run -p 8000:8000 --env-file .env kepler-ppc-dashboard:latest
```

## Next Steps (Phase 2-4)

- [ ] Meta Ads API integration
- [ ] Yandex Ads API integration (with RUB→EUR conversion)
- [ ] React frontend with Stripe design system
- [ ] WebSocket real-time updates
- [ ] Microsoft Clarity friction integration
- [ ] Anomaly detection (Z-score based)
- [ ] Daily email reports

## Support

Check the planning document: `../../CLAUDE.md`
Project guide: `../../.claude/plans/i-want-to-design-jiggly-steele.md`
