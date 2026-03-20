# HomeBeacon Production Checklist

**Based on Vercel Production Checklist** — Operational Excellence, Security, Reliability, Performance, Cost Optimization

---

## Status: 🟡 PARTIAL (Git Connection Missing)

---

## 1. Operational Excellence

### Deployment Pipeline

| Item | Status | Notes |
|------|--------|-------|
| Git repository connected | ❌ **MISSING** | Vercel project not linked to GitHub |
| Auto-deploy on push | ❌ Not working | No webhook configured |
| Branch protection | ⚠️ Not set | `master` branch unprotected |
| Preview deployments | ✅ Available | Working but manual |
| Production promotions | ✅ Available | CLI `vercel promote` works |
| Deployment rollback | ✅ Available | Vercel dashboard rollback |
| Build logs accessible | ✅ Yes | Vercel dashboard |

**Action Required:**
- Go to vercel.com → wellness-check-code → Settings → Git
- Connect `ericthered9000-sudo/wellness-check`
- Set branch: `master`
- Set root directory: `frontend`

### Monitoring & Observability

| Item | Status | Notes |
|------|--------|-------|
| Error tracking | ❌ Not configured | No Sentry/LogRocket |
| Analytics | ❌ Not configured | No Vercel Analytics |
| Performance monitoring | ❌ Not configured | No Core Web Vitals tracking |
| Uptime monitoring | ⚠️ Partial | Vercel status page only |
| Alerting | ❌ Not configured | No on-call alerts |

**Recommendations:**
- Enable Vercel Web Analytics (free tier)
- Add Sentry for error tracking
- Set up UptimeRobot for external monitoring

### Documentation

| Item | Status | Notes |
|------|--------|-------|
| README.md | ✅ Yes | Basic setup docs |
| API documentation | ❌ Missing | No API docs |
| Deployment guide | ✅ Created | `docs/VERCEL_DEPLOY_CHECKLIST.md` |
| Runbook | ❌ Missing | No incident response docs |
| On-call rotation | ❌ N/A | Solo project |

---

## 2. Security

### Authentication & Authorization

| Item | Status | Notes |
|------|--------|-------|
| HTTPS enforced | ✅ Yes | Vercel auto-HTTPS |
| Auth middleware | ✅ Yes | Cookie-based httpOnly |
| Rate limiting | ✅ Yes | 20 attempts/15min (relaxed for testing) |
| Password policy | ✅ Yes | 12+ chars, complexity required |
| Invite codes secure | ✅ Yes | 8 alphanumeric (2.8M combos) |
| CORS configured | ✅ Yes | Backend CORS_ORIGIN set |
| CSRF protection | ✅ Yes | SameSite cookies |
| SQL injection prevention | ✅ Yes | Prepared statements |

### Secrets Management

| Item | Status | Notes |
|------|--------|-------|
| .env files committed | ❌ **RISK** | `.env.production` in repo |
| Secrets in Vercel dashboard | ✅ Yes | VITE_API_URL set |
| API keys exposed | ✅ Clean | No hardcoded keys |
| Database credentials | ✅ Secure | Railway env vars |

**Action Required:**
- Add `.env.production` to `.gitignore`
- Move all secrets to Vercel dashboard

### Access Control

| Item | Status | Notes |
|------|--------|-------|
| Role-based access | ✅ Yes | Senior vs Family roles |
| Permission levels | ✅ Yes | view/admin roles |
| Account deletion | ✅ Yes | GDPR-compliant delete |
| Session management | ✅ Yes | Cookie-based sessions |

---

## 3. Reliability

### Error Handling

| Item | Status | Notes |
|------|--------|-------|
| Global error boundary | ⚠️ Partial | React error boundaries |
| API error responses | ✅ Yes | Generic messages (no enumeration) |
| Graceful degradation | ⚠️ Partial | No offline mode |
| Retry logic | ❌ Missing | No automatic retries |
| Timeout handling | ⚠️ Partial | Default fetch timeouts |

### Database & Backend

| Item | Status | Notes |
|------|--------|-------|
| Database backups | ⚠️ Railway default | No manual backup strategy |
| Connection pooling | ✅ Yes | SQLite (single file) |
| Migration strategy | ✅ Yes | Auto-run on startup |
| Health checks | ✅ Yes | `/health` endpoint |
| Disaster recovery | ❌ Missing | No DR plan |

### High Availability

| Item | Status | Notes |
|------|--------|-------|
| Multi-region | ❌ No | Single region (sfo1) |
| CDN | ✅ Yes | Vercel Edge Network |
| Failover | ❌ No | Single deployment |
| Load balancing | ✅ Yes | Vercel automatic |

---

## 4. Performance

### Frontend Optimization

| Item | Status | Notes |
|------|--------|-------|
| Build size | ✅ Good | 306KB JS, 53KB CSS |
| Code splitting | ⚠️ Partial | Default Vite splitting |
| Lazy loading | ❌ Missing | No route-based lazy loading |
| Image optimization | ⚠️ Partial | No Next.js Image |
| Font optimization | ⚠️ Default | System fonts |
| Tree shaking | ✅ Yes | Vite auto-tree-shakes |
| Compression | ✅ Yes | Gzip via Vercel |

### Caching Strategy

| Item | Status | Notes |
|------|--------|-------|
| Static assets cached | ✅ Yes | Vercel CDN |
| API responses cached | ❌ No | No cache headers |
| Browser caching | ✅ Yes | Default Vercel headers |
| SWR/ISR | ❌ No | Not using Next.js |
| Cache invalidation | ✅ Yes | Deploy busts cache |

### Core Web Vitals

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| LCP | <2.5s | Unknown | ❌ Not measured |
| FID | <100ms | Unknown | ❌ Not measured |
| CLS | <0.1 | Unknown | ❌ Not measured |

**Action Required:**
- Enable Vercel Web Analytics
- Run Lighthouse audit
- Set performance budgets

---

## 5. Cost Optimization

### Vercel Plan

| Item | Current | Recommendation |
|------|---------|----------------|
| Plan | Hobby (Free) | ✅ Appropriate for MVP |
| Bandwidth | 100GB/mo | ✅ Sufficient for testing |
| Serverless functions | 100GB-hrs | ✅ Sufficient |
| Overages | $0 | ✅ Within limits |

### Railway Backend

| Item | Current | Recommendation |
|------|---------|----------------|
| Plan | Free | ✅ MVP stage |
| Database | SQLite | ✅ Appropriate |
| Compute | 512MB | ✅ Sufficient |
| Upgrade trigger | User growth | Monitor at 100 users |

### Optimization Opportunities

| Item | Status | Savings |
|------|--------|---------|
| Unused deployments | ❌ Many test deploys | Clean old deploys |
| Build caching | ✅ Yes | Vercel auto-caches |
| Image hosting | ✅ GitHub | Free |
| Domain | ❌ Not custom | Use Vercel subdomain for now |

**Action Required:**
- Clean up old test deployments in Vercel dashboard
- Monitor usage as user base grows

---

## 6. Pre-Launch Checklist

### Must Fix Before Launch

- [ ] **Connect Git repository** (blocking auto-deploys)
- [ ] **Remove .env.production from repo** (security risk)
- [ ] **Enable Vercel Web Analytics** (performance tracking)
- [ ] **Run Lighthouse audit** (performance baseline)
- [ ] **Test invite code field** (current bug: maxLength)

### Should Have Before Launch

- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring (UptimeRobot)
- [ ] Write API documentation
- [ ] Create runbook for incidents
- [ ] Set up database backups

### Nice to Have

- [ ] Custom domain
- [ ] Multi-region deployment
- [ ] Advanced caching headers
- [ ] Performance budgets
- [ ] Automated visual regression tests

---

## Next Actions

### Immediate (Today)
1. Connect Git in Vercel dashboard
2. Redeploy with fresh code (maxLength={11} fix)
3. Test invite code field with mom

### This Week (When Back at PC)
1. Remove .env.production from repo
2. Enable Vercel Analytics
3. Run Lighthouse audit
4. Clean old deployments

### Before Play Store Submission
1. Complete all "Must Fix" items
2. Complete all "Should Have" items
3. Load test with 10 concurrent users
4. Write privacy policy + terms (already done)

---

**Last Updated:** 2026-03-20
**Next Review:** 2026-03-23 (Sunday)
