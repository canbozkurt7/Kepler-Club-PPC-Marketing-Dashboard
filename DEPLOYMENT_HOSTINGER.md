# Deploying the PPC Dashboard on Hostinger (via GitHub)

## Important: What Hostinger Can and Can't Run

| Hostinger Plan | Can it run this project? |
|---|---|
| **Shared / Web Hosting (hPanel)** | ❌ Backend (PHP + static files only — no Python/FastAPI). ✅ Frontend (React build via Git deploy) |
| **Hostinger VPS** | ✅ Everything (FastAPI + Redis + scheduled syncs via Docker) |

So the deployment shape is:

```
GitHub repo (canbozkurt7/Kepler-Club-Marketing-Automations)
        │
        ├──► Hostinger VPS ──── docker compose ──► FastAPI API + Redis
        │                                          (api.keplerclub.com)
        │
        └──► Hostinger Web Hosting (hPanel Git) ──► React build
                                                    (dashboard.keplerclub.com)

Database: Supabase (already external — nothing to host)
```

---

## Part 1: Backend on Hostinger VPS

### 1. Get a VPS
Any Hostinger VPS plan works (KVM 1 is enough to start). Choose **Ubuntu 22.04 with Docker** template — Docker comes pre-installed.

### 2. Clone the repo from GitHub
SSH into the VPS:
```bash
ssh root@your-vps-ip
git clone https://github.com/canbozkurt7/Kepler-Club-Marketing-Automations.git
cd Kepler-Club-Marketing-Automations
```

### 3. Create the .env file
`.env` is git-ignored (correctly — it holds secrets), so create it on the server:
```bash
cp backend/.env.example backend/.env
nano backend/.env   # fill in Supabase URL, Google Ads credentials, SMTP
```

### 4. Start everything
```bash
docker compose up -d --build
```
This starts the FastAPI API on port 8000 and Redis. Verify:
```bash
curl http://localhost:8000/health
```

### 5. Initialize the database (first time only)
```bash
docker compose exec api python init_db.py
```

### 6. Point a domain + HTTPS
In Hostinger DNS, add an A record: `api.keplerclub.com` → your VPS IP.
Then install Caddy (simplest auto-HTTPS reverse proxy):
```bash
apt install -y caddy
cat > /etc/caddy/Caddyfile <<'EOF'
api.keplerclub.com {
    reverse_proxy localhost:8000
}
EOF
systemctl restart caddy
```
Done — `https://api.keplerclub.com/docs` is live.

### 7. Deploy updates from GitHub
```bash
cd Kepler-Club-Marketing-Automations
git pull
docker compose up -d --build
```
(Optional: automate this with a GitHub Actions workflow that SSHes in and runs these two commands on every push to master.)

---

## Part 2: Frontend on Hostinger Web Hosting (Phase 3)

When the React dashboard is built (Phase 3), Hostinger's hPanel has native **Git deployment**:

1. hPanel → Websites → your domain → **Advanced → Git**
2. Repository: `https://github.com/canbozkurt7/Kepler-Club-Marketing-Automations`
3. Branch: `master`, Directory: `frontend/dist` (the production build)
4. Enable auto-deploy webhook so every push redeploys

Caveat: hPanel Git deploy copies files but does **not run `npm build`**. Two options:
- **Option A (simple):** commit the built `frontend/dist` folder to a `deploy` branch and point hPanel at that
- **Option B (clean):** GitHub Action builds the React app and pushes the build output to the `deploy` branch automatically

The frontend will call `https://api.keplerclub.com` (already allowed in CORS in `backend/app/main.py`).

---

## Checklist

- [ ] Hostinger VPS provisioned (Ubuntu 22.04 + Docker template)
- [ ] Repo cloned on VPS, `backend/.env` filled in
- [ ] `docker compose up -d --build` running
- [ ] `init_db.py` run once (creates tables + seeds SAW/KLIA/RIX + alert rules)
- [ ] DNS: `api.keplerclub.com` → VPS IP, Caddy installed for HTTPS
- [ ] Supabase connection string tested (`/health` and `/api/v1/dashboard/summary` respond)
- [ ] (Phase 3) hPanel Git deploy configured for the React frontend
