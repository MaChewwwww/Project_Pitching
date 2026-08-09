---
name: staging-maintenance
description: Perform deployment, maintenance, container rebuilds, database operations, or server inspection on the SAGIP-SJ (Project_Pitching) staging server over SSH. Read .env.devops for host, user, SSH keys, and admin PEM credentials.
---

# Staging Maintenance & Operations Guide

## Environment Overview & Access

| Property                   | Value                                                 |
| -------------------------- | ----------------------------------------------------- |
| **Staging VPS Public IP**  | `57.155.90.155`                                       |
| **Primary HTTPS URL**      | `https://57-155-90-155.sslip.io`                      |
| **HTTP Staging URL**       | `http://57.155.90.155:8080` or `http://57.155.90.155` |
| **SSH User & Host**        | `deploy@57.155.90.155`                                |
| **SSH Key Path**           | `C:\Users\MaChew\.ssh\bgh_azure_ed25519`              |
| **Admin PEM Key Path**     | `C:\Users\MaChew\.ssh\bgh_deployment_admin.pem`       |
| **Server Repository Path** | `/opt/bgh/Project_Pitching`                           |
| **Compose Project Name**   | `sagip-staging`                                       |
| **Compose File**           | `infra/compose.yml`                                   |
| **Env File**               | `.env.staging`                                        |

## Devops Credentials (.env.devops)

Connection settings and credentials are recorded in `.env.devops` (gitignored, repo root — **not**
this file). Copy `resources/.env.devops.example` to `.env.devops` and fill in the real values
locally; never commit or paste actual secrets into this file.

```env
STAGING_SSH_HOST=57.155.90.155
STAGING_SSH_USER=deploy
STAGING_SSH_PORT=22
STAGING_SSH_KEY_PATH=C:\Users\<user>\.ssh\bgh_azure_ed25519
DEPLOY_USER_PASSWORD=change-me-in-local-env
GITHUB_PAT=ghp_000000000000000000000000000000000000
PEM_Location=C:\Users\<user>\.ssh\bgh_deployment_admin.pem
```

> **A previous version of this file committed a real `GITHUB_PAT` and `DEPLOY_USER_PASSWORD` in
> plaintext.** Both must be treated as compromised: the PAT revoked and reissued, and the
> `deploy` user's password rotated on the server. A doc edit alone does not remove them from git
> history — history should be scrubbed or the repo re-created if that exposure matters.

## Standard SSH Connection

Connect to the staging server using `ssh`:

```powershell
ssh -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155
```

Execute remote commands directly:

```powershell
ssh -o BatchMode=yes -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155 "cd /opt/bgh/Project_Pitching && docker compose -p sagip-staging --env-file .env.staging -f infra/compose.yml ps"
```

For root-level host administration via admin PEM key:

```powershell
ssh -i C:\Users\MaChew\.ssh\bgh_deployment_admin.pem azureuser@57.155.90.155 "sudo systemctl status docker"
```

---

## Deploying Updates & Rebuilding Containers

To push local code changes to the staging server and rebuild containers:

### 1. Push Code to Server Remote

```powershell
$env:GIT_SSH_COMMAND="ssh -i C:/Users/MaChew/.ssh/bgh_azure_ed25519"
git push ssh://deploy@57.155.90.155/opt/bgh/Project_Pitching main
```

### 2. Rebuild Container Services

To rebuild and restart specific services (e.g. `web` and `api`):

```powershell
ssh -o BatchMode=yes -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155 "cd /opt/bgh/Project_Pitching && docker compose -p sagip-staging --env-file .env.staging -f infra/compose.yml up -d --build api web"
```

To rebuild the entire stack:

```powershell
ssh -o BatchMode=yes -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155 "cd /opt/bgh/Project_Pitching && docker compose -p sagip-staging --env-file .env.staging -f infra/compose.yml up -d --build"
```

---

## Service Architecture & Port Mapping

| Service   | Container Name          | Internal Port | External Port | Function                                     |
| --------- | ----------------------- | ------------- | ------------- | -------------------------------------------- |
| **proxy** | `sagip-staging-proxy-1` | 80, 443       | 80, 443, 8080 | Caddy 2 reverse proxy with Let's Encrypt SSL |
| **web**   | `sagip-staging-web-1`   | 3000          | -             | Next.js App Router frontend                  |
| **api**   | `sagip-staging-api-1`   | 8000          | -             | FastAPI backend (SQLAlchemy 2.0, Alembic)    |
| **db**    | `sagip-staging-db-1`    | 5432          | 5433          | PostGIS 16-3.4 database                      |
| **cron**  | `sagip-staging-cron-1`  | -             | -             | Background weather & river level scheduler   |

---

## Log Inspection & Troubleshooting

Check container status:

```powershell
ssh -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155 "cd /opt/bgh/Project_Pitching && docker compose -p sagip-staging --env-file .env.staging -f infra/compose.yml ps"
```

View Caddy SSL / Proxy logs:

```powershell
ssh -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155 "cd /opt/bgh/Project_Pitching && docker compose -p sagip-staging --env-file .env.staging -f infra/compose.yml logs proxy --tail=50"
```

View API backend logs:

```powershell
ssh -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155 "cd /opt/bgh/Project_Pitching && docker compose -p sagip-staging --env-file .env.staging -f infra/compose.yml logs api --tail=50"
```

---

## Verification & Health Check Endpoints

- **Public Site**: `https://57-155-90-155.sslip.io`
- **Admin Console**: `https://57-155-90-155.sslip.io/admin`
- **API Health Endpoint**: `https://57-155-90-155.sslip.io/api/v1/health`
- **OpenAPI Docs**: `https://57-155-90-155.sslip.io/api/docs`

---

## Demo Accounts Credentials

- **Superadmin**: `superadmin-demo@sanjose.gov.ph` / `Sagip-SJ-Demo-2026!`
- **Admin**: `admin-demo@sanjose.gov.ph` / `Sagip-SJ-Demo-2026!`
- **BHW**: `bhw-demo@sanjose.gov.ph` / `Sagip-SJ-Demo-2026!`
- **SK**: `sk-demo@sanjose.gov.ph` / `Sagip-SJ-Demo-2026!`
- **Resident Head**: `head-demo@sanjose.gov.ph` / `Sagip-SJ-Demo-2026!`
