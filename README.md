# Kepler Club PPC Marketing Dashboard

Real-time dashboard aggregating live performance data from **Google Ads, Meta Ads, and Yandex Ads** for Kepler Club's three airport locations: SAW (Istanbul), KLIA (Kuala Lumpur), and RIX (Riga).

## Architecture

```
Google / Meta / Yandex APIs
        ↓
Python fetchers → normalize → enrich (ROAS, CPA, CTR, CPC) → segment by location
        ↓
Supabase PostgreSQL
        ↓
Redis cache ←→ FastAPI REST API ←→ React dashboard (Hostinger)
        ↓
Alert engine → email (marketing@keplerclub.com)
```

| Component | Tech | Hosting |
|---|---|---|
| Database | PostgreSQL | Supabase |
| API + sync jobs | FastAPI, SQLAlchemy, APScheduler | Hostinger VPS (Docker) |
| Cache | Redis | Same VPS (docker-compose) |
| Frontend (Phase 3) | React + TypeScript | Hostinger web hosting |

## Quick Start

```bash
# 1. Configure secrets
cp backend/.env.example backend/.env   # fill in Supabase URL, Google Ads creds, SMTP

# 2. Start API + Redis
docker compose up -d --build

# 3. Initialize database (first time only)
docker compose exec api python init_db.py

# 4. Verify
curl http://localhost:8000/health
```

API docs: `http://localhost:8000/docs`

Full deployment guide: [DEPLOYMENT_HOSTINGER.md](DEPLOYMENT_HOSTINGER.md)
Backend details: [backend/README.md](backend/README.md)

## Roadmap

- [x] **Phase 1** — Google Ads sync, PostgreSQL schema, REST API, email alerts
- [ ] **Phase 2** — Meta Ads + Yandex Ads integration (RUB→EUR conversion)
- [ ] **Phase 3** — React frontend with real-time WebSocket updates
- [ ] **Phase 4** — Microsoft Clarity friction integration, anomaly detection, daily reports
