# Wellness Check - MVP Project

**Working Name:** Wellness Check (placeholder — will need better branding)
**Tagline:** "Sharing wellness, not surveillance"
**Created:** 2026-02-28

---

## The Concept

A phone-first wellness monitoring app that helps elderly family members **share** their wellness status with family, rather than **being monitored**. 

**Key Differentiator:** Proactive pattern learning vs. reactive panic buttons. The app learns what's normal for the person and alerts family when patterns change — before an emergency happens.

---

## MVP Feature List

### Phase 1: Core Wellness (Minimum Viable)

#### For the Senior (The "Sharer")

1. **Passive Activity Tracking**
   - Phone movement/motion detection
   - Screen time patterns
   - Charging behavior (plugged in at night = bedtime routine)
   - Location patterns (home vs. away)
   - NO manual check-ins required (optional)

2. **Daily Wellness Score**
   - Simple 0-100 score based on activity patterns
   - Green/Yellow/Red status indicator
   - "Normal day" vs. "Something's different"

3. **One-Tap "I'm Okay" Button**
   - Optional daily check-in
   - Can be triggered by family request
   - Quick response, no friction

4. **Privacy Dashboard**
   - See exactly what's being shared
   - Who can see what
   - Easy to pause sharing temporarily
   - "I'm going on vacation" mode

#### For the Family (The "Watcher")

5. **Family Dashboard**
   - See senior's wellness score
   - Activity timeline (slept well, left house at 9am, etc.)
   - Quick status check without calling

6. **Pattern Alerts**
   - "Mom hasn't left the house in 2 days"
   - "Dad's phone hasn't moved in 12 hours"
   - "Unusual activity at 3am"
   - Configurable thresholds

7. **Check-In Request**
   - Send a gentle "How are you?" prompt
   - Senior gets notification, one-tap response
   - Escalation options if no response

---

### Phase 2: Enhanced Features (Post-MVP)

- Integration with Apple HealthKit / Google Fit (heart rate, steps)
- Smartwatch companion app (optional)
- Medication reminders
- Calendar integration (appointments detected)
- Multiple family members with different permission levels
- Emergency contact escalation chain
- Voice note sharing ("I'm feeling great today!")
- Photo check-ins (selfie = visual confirmation)

---

## Technical Approach

### Platform Strategy

**Recommendation: Progressive Web App (PWA) First**

Why PWA:
- Single codebase for iOS and Android
- Lower development cost (months, not a year)
- Can access many phone sensors via web APIs
- Easy to share via link (no app store friction for seniors)
- Can be "installed" on home screen like native app

**Native App Later (If Needed):**
- For deeper sensor access (background motion, more accurate location)
- For better battery optimization
- When revenue justifies the investment

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Senior App    │     │  Family App     │
│   (PWA/Mobile)  │     │   (PWA/Web)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌──────────────────┴──────────────────┐
         │    │                                     │
         └────┤         Backend API                  │
              │    (Node.js/Express or FastAPI)     │
              │                                      │
              │  - Pattern analysis engine           │
              │  - Alert logic                       │
              │  - User management                   │
              │  - Real-time notifications           │
              └──────────────┬───────────────────────┘
                             │
              ┌──────────────┴───────────────┐
              │                              │
        ┌─────┴─────┐                 ┌──────┴──────┐
        │ PostgreSQL│                 │    Redis    │
        │  (Data)   │                 │ (Sessions,  │
        │           │                 │  Real-time) │
        └───────────┘                 └─────────────┘
```

### Technology Stack (Recommended)

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React + TypeScript + Vite | Fast, modern, good ecosystem |
| **Mobile** | PWA first, Capacitor for native | Web-first, native when needed |
| **Backend** | Node.js + Express OR Python FastAPI | JavaScript full-stack OR Python for ML |
| **Database** | PostgreSQL + Prisma ORM | Reliable, good for relational data |
| **Real-time** | WebSockets (Socket.io) | Instant notifications |
| **Auth** | Auth0 or Clerk | Don't build auth yourself |
| **Push Notifications** | OneSignal or Firebase | Cross-platform push |
| **Hosting** | Vercel (frontend) + Railway/Render (backend) | Low cost to start |
| **ML/Pattern** | Python (scikit-learn) or simple rules | Start simple, add ML later |

### Data Model (Simplified)

```typescript
// Core entities

User {
  id: string
  role: 'senior' | 'family'
  email: string
  createdAt: date
}

SeniorProfile {
  userId: string
  timezone: string
  homeLocation: { lat, lng, radius }
  healthShareEnabled: boolean
  privacySettings: {...}
}

FamilyConnection {
  seniorId: string
  familyMemberId: string
  permissionLevel: 'view' | 'alert' | 'full'
  createdAt: date
}

ActivityEvent {
  id: string
  userId: string
  type: 'motion' | 'location' | 'screen' | 'charging' | 'checkin'
  timestamp: date
  value: json
}

WellnessScore {
  date: date
  seniorId: string
  score: number (0-100)
  factors: {...}
}

Alert {
  id: string
  seniorId: string
  type: 'no_movement' | 'unusual_pattern' | 'no_checkin_response'
  triggeredAt: date
  acknowledgedBy: string[]
  resolvedAt: date
}
```

### Pattern Detection Logic (MVP)

Start with simple rules, add ML later:

```python
# Simple rules engine (pseudo-code)

alerts = []

# No movement in 12+ hours during normal awake time
if last_motion > 12 hours and is_awake_hours:
    alerts.append("No movement detected")

# Phone not charged overnight (routine change)
if not charged_overnight and usually_charges_overnight:
    alerts.append("Charging routine changed")

# Home for 48+ hours when normally goes out daily
if hours_at_home > 48 and avg_daily_outings > 0:
    alerts.append("Hasn't left home in 2 days")

# Unusual awake time (3am activity when normally asleep)
if motion_detected and is_unusual_sleep_time:
    alerts.append("Unusual nighttime activity")

# Wellness score drops significantly
if wellness_score < 50 or dropped_by > 30:
    alerts.append("Wellness score dropped")
```

---

## Development Phases

### Phase 1: Foundation (4-6 weeks)
- [ ] Project setup (React, PWA config, backend skeleton)
- [ ] User authentication (senior + family accounts)
- [ ] Family connection flow (invite/link accounts)
- [ ] Basic data collection (location, motion via web APIs)
- [ ] Simple dashboard showing real-time status

### Phase 2: Intelligence (3-4 weeks)
- [ ] Pattern learning baseline (learn "normal" over 7-14 days)
- [ ] Wellness score algorithm
- [ ] Alert logic and notifications
- [ ] Privacy dashboard for seniors

### Phase 3: Polish (2-3 weeks)
- [ ] UI/UX refinement
- [ ] Onboarding flow
- [ ] Error handling and edge cases
- [ ] Testing with real users

### Phase 4: Launch Prep (2 weeks)
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation
- [ ] Landing page
- [ ] Beta user recruitment

---

## Monetization Options

| Model | Price | Notes |
|-------|-------|-------|
| **Free Tier** | $0 | 1 senior, 1 family member, basic alerts |
| **Family Plan** | $9.99/mo | 2 seniors, 5 family members, all features |
| **Premium** | $14.99/mo | Unlimited family, smartwatch integration, health data |

Alternative: Annual pricing ($99/year for family plan — 17% discount)

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Battery drain** | Optimize polling intervals, use OS-level APIs where possible |
| **Privacy concerns** | Clear transparency, easy controls, senior has full visibility |
| **Tech literacy** | Extremely simple UI for senior app, family helps set up |
| **False alarms** | Configurable sensitivity, learning period, "false alarm" feedback |
| **App adoption** | PWA = no app store, easy link sharing, family-driven setup |
| **Competition** | Focus on positioning (sharing vs. monitoring), phone-first simplicity |

---

## Competitive Positioning

**Tagline Options:**
- "Wellness shared, not surveillance"
- "When you can't be there, know they're okay"
- "Peace of mind for the whole family"
- "Stay connected to those you love"

**Key Message:**
This isn't about monitoring your elderly parent. It's about them sharing their wellness with you — on their terms. They control what's shared. They see who's watching. And they stay independent longer.

---

## Next Steps

1. **Validate with real users** — Talk to 5-10 people caring for elderly parents
2. **Define exact MVP scope** — Cut ruthlessly
3. **Choose tech stack** — PWA + Node.js recommended for speed
4. **Build a proof-of-concept** — Just location + motion, 1 week
5. **Alpha test with James's family** — Real feedback fast

---

*Document created: 2026-02-28*
*Last updated: 2026-02-28*