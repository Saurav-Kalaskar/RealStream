## Plan: OCI Free Tier 24/7 Migration (DRAFT)

Move RealStream from local machine + Cloudflare Tunnel to a single Oracle Cloud Free Tier VM running the existing Docker Compose stack continuously. Based on your choices, the target is direct DNS to OCI public IP, TLS termination on nginx using Let’s Encrypt, and fresh databases (no data migration). This keeps the architecture closest to today’s setup while removing local-machine dependency and minimizing code churn. The plan also includes a small hardening pass to eliminate secret leakage risks and align runtime configs for stable public hosting.

**Steps**
1. Baseline deployment contract and env matrix using [docker-compose.prod.yml](docker-compose.prod.yml), [deployment/docker-compose/docker-compose.yml](deployment/docker-compose/docker-compose.yml), [frontend/next.config.ts](frontend/next.config.ts), [frontend/src/lib/api.ts](frontend/src/lib/api.ts), and [nginx/nginx.conf](nginx/nginx.conf) so OCI runtime variables and service routing are unambiguous.
2. Prepare OCI VM foundation (single A1 instance, Ubuntu path matching [DEPLOY.md](DEPLOY.md)) and install Docker + Compose + firewall baseline; keep only 80/443 public and isolate internal service ports to Docker network.
3. Refactor runtime config for cloud host readiness: remove localhost assumptions in [frontend/next.config.ts](frontend/next.config.ts), ensure nginx upstream routes match backend controllers, and standardize API base usage in [frontend/src/lib/api.ts](frontend/src/lib/api.ts).
4. Implement native HTTPS on OCI nginx: add Let’s Encrypt issuance/renewal workflow and update reverse-proxy config in [nginx/nginx.conf](nginx/nginx.conf) to enforce HTTP→HTTPS redirect and secure headers.
5. Remove Cloudflare Tunnel coupling from ops flow by replacing tunnel-oriented scripts in [start_live.sh](start_live.sh) and [stop_live.sh](stop_live.sh) with OCI service lifecycle scripts (compose up/down, health checks, restart policy).
6. Harden secrets and bootstrap envs before go-live: rotate auth secret defaults in [backend/auth-service/src/main/java/com/realstream/auth/config/AppProperties.java](backend/auth-service/src/main/java/com/realstream/auth/config/AppProperties.java), externalize scraper API key from [backend/scraper-service/.env](backend/scraper-service/.env), and define canonical production env file(s).
7. Cutover domain and validate end-to-end: point DNS A record to OCI public IP, deploy stack, run smoke tests across auth/content/comment/interaction paths via nginx, and verify frontend SSR/API behavior.
8. Add 24/7 operations essentials: systemd wrapper for compose auto-start, basic backup jobs for Docker volumes (Postgres/Mongo), log rotation, and lightweight health monitoring.

**Verification**
- Build and run stack on OCI: `docker compose -f docker-compose.prod.yml up -d --build`
- Service health checks from VM: `docker compose ps` and HTTP checks on nginx upstream routes.
- Public checks after DNS cutover: `https://realstream.site/`, auth/login flow, feed load, profile/actions, comments/interactions.
- TLS checks: valid cert chain, auto-renew dry-run, HTTP to HTTPS redirect.
- Restart resilience: reboot VM and confirm services auto-recover without manual action.

**Decisions**
- Edge/DNS: direct DNS to OCI public IP.
- TLS: terminate on nginx in OCI with Let’s Encrypt.
- Data: fresh start with empty Postgres/Mongo.
- Footprint: single OCI VM with current compose architecture.

If you approve this draft, the next handoff can execute it phase-by-phase with minimal downtime and a rollback point before DNS cutover.
