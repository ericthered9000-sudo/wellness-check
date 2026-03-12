# FamilyShift - Caregiver Coordination Feature

**Status:** Planned Post-Launch Upgrade  
**Priority:** High (validated interest from potential users)  
**Date Created:** 2026-03-11

---

## 💡 The Idea

**FamilyShift** is a caregiver coordination feature that helps families organize care for elderly parents. It complements HomeBeacon by solving the "who's doing what" problem that families struggle with.

**Key Insight:** When pitching HomeBeacon, people showed interest in caregiver coordination BEFORE it was even built. This is real validation.

---

## 🔗 Connection to HomeBeacon

HomeBeacon and FamilyShift are two sides of the same coin:

| HomeBeacon | FamilyShift |
|------------|-------------|
| Senior's wellness (the "sharer") | Family coordination (the "caregivers") |
| "I'm okay" check-ins | "Who's handling Dad's appointment?" |
| Emergency button | Caregiver task assignments |
| Medication reminders | Multi-caregiver med tracking |
| Weekly wellness reports | Shared care journal |

**Strategy:** Build FamilyShift as a **companion feature inside HomeBeacon** first. Same codebase, same users, unlocks new value prop and pricing tier.

---

## 🎯 MVP Features (Priority Order)

### Phase 1: Core Coordination (2-3 weeks)

#### 1. Shared Calendar
- "Who's taking Dad to Dr. Smith on Thursday?"
- Color-coded by caregiver
- Recurring events (weekly prescription pickup, monthly doctor visits)
- Google Calendar sync (Phase 2)

#### 2. Task Assignments
- Create tasks: "Pick up Mom's prescription", " Grocery shopping"
- Assign to specific family member
- Due dates and reminders
- Mark complete + notify assigner
- Task templates for common caregiving tasks

#### 3. Care Journal / Update Feed
- "Mom ate well today"
- "New medication started - 50mg Metformin"
- "Had a fall - here's what happened"
- Photo attachments (optional)
- Family sees updates in chronological feed
- Tag by category: wellness, medical, mood, activities

#### 4. Expense Tracking
- "Paid $45 for meds"
- "Groceries: $127.50"
- Split among family members
- Track who paid, who owes
- Export for tax purposes (medical expense deduction)

### Phase 2: HomeBeacon Integration (1-2 weeks)

#### 5. Unified Dashboard
- Senior wellness score + family tasks in one view
- Caregivers see both coordination AND wellness data
- Quick status: "All tasks complete this week" + "Mom's wellness: 85/100"

#### 6. Smart Escalation Logic
- Senior misses check-in → notify all caregivers
- Low wellness score → suggest family check-in call
- Medication not logged → task created for caregiver to verify
- Multiple missed check-ins → emergency contact notification

### Phase 3: Premium Features (Future)

- Care coordinator role (professional caregiver access)
- HIPAA-compliant messaging
- Telehealth integration
- Insurance/Medicare documentation export
- Multiple families (for professional caregivers)

---

## 💰 Monetization Strategy

| Tier | Price | Features |
|------|-------|----------|
| **HomeBeacon Free** | $0 | 1 senior, basic wellness, 1 family member |
| **HomeBeacon + FamilyShift** | $14.99/mo | Unlimited family, task coordination, expense tracking, care journal |
| **Premium Family** | $24.99/mo | Multiple seniors, advanced reporting, priority support, calendar sync |

**Annual pricing:** $149/year for FamilyShift tier (17% discount)

---

## 🏗️ Technical Implementation

### Database Additions

```sql
-- Caregiver tasks
CREATE TABLE caregiver_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  senior_id TEXT NOT NULL,
  assigned_to TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Care journal entries
CREATE TABLE care_journal (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  senior_id TEXT NOT NULL,
  category TEXT, -- wellness, medical, mood, activities, incident
  content TEXT NOT NULL,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (senior_id) REFERENCES users(id)
);

-- Expense tracking
CREATE TABLE care_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  senior_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT, -- medical, groceries, transportation, other
  paid_by TEXT NOT NULL,
  split_among TEXT[], -- array of user_ids
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (paid_by) REFERENCES users(id)
);

-- Shared calendar events
CREATE TABLE care_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  senior_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  location TEXT,
  attendees TEXT[], -- array of user_ids
  created_by TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- daily, weekly, monthly
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (senior_id) REFERENCES users(id)
);
```

### Frontend Additions

- New "Family" tab in bottom navigation
- Calendar component (react-calendar or FullCalendar)
- Task list with drag-drop assignments
- Activity feed component
- Expense tracker with split calculator

---

## 📋 Pre-Launch Research Questions

**Ask the interested people:**

1. What's the HARDEST part about coordinating care right now?
2. Do you use anything currently? (Facebook group, group chat, paper calendar?)
3. How many family members are typically involved?
4. What would make this worth $15/month to you?
5. Is expense splitting important, or is that a nice-to-have?
6. Would you want this as a separate app or part of HomeBeacon?

---

## 🚀 Launch Strategy

### Option A: Integrated Feature (Recommended)
- Add to HomeBeacon as "FamilyShift" tab
- Announce as major v1.1 update
- Existing users get 30-day free trial
- Market as: "Now HomeBeacon does MORE - coordinate your whole family's care"

### Option B: Standalone App
- Separate app/codebase
- Can partner with elder care organizations
- Sell to professional caregivers
- **Downside:** Doubles development work, fragments user base

**Recommendation:** Start with Option A. Can always spin out later if there's demand for standalone.

---

## 📊 Success Metrics

- % of HomeBeacon users who activate FamilyShift
- Weekly active caregivers per senior
- Tasks completed per week
- Retention rate (do families stick with it?)
- Upgrade rate from free → FamilyShift tier

---

## 🛑 Known Challenges

1. **Privacy complexity** - Who can see what? Senior might not want family seeing everything.
2. **Adoption friction** - Need to get multiple family members to download/use
3. **Emotional weight** - This is heavy stuff (aging parents, health issues)
4. **Customer support** - More features = more questions

---

## ✅ Pre-Launch Checklist (When Ready)

- [ ] Talk to 5-10 families about specific needs
- [ ] Add database schema to migration
- [ ] Build shared calendar (Phase 1)
- [ ] Build task assignments (Phase 1)
- [ ] Build care journal (Phase 1)
- [ ] Build expense tracker (Phase 1)
- [ ] Integrate with HomeBeacon dashboard
- [ ] Update pricing tiers
- [ ] Update Privacy Policy for new data types
- [ ] Marketing materials (screenshots, demo video)
- [ ] Launch announcement

---

## 📝 Notes from Initial Interest (2026-03-11)

- James showed HomeBeacon to several people at work
- They asked about caregiver coordination features
- This was unprompted interest (not a sales pitch response)
- Indicates real market need

---

**Bottom Line:** This is a validated upsell opportunity that leverages existing HomeBeacon work. Build after initial launch (don't delay v1.0), but keep it in the roadmap.

*Document to be reviewed during HomeBeacon v1.1 planning.*
