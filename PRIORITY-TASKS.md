# HomeBeacon — Priority Tasks

Tasks ordered by priority. Build these into the app NOW to avoid refactoring later.

---

## Phase 1: Core Legal Pages (REQUIRED)

These MUST be done before any store submission.

### Task 1.1: Privacy Policy Page
**Priority:** HIGH | **Blocks:** Store submission
- [ ] Create `/privacy` route in React app
- [ ] Write privacy policy content covering:
  - What data we collect (wellness scores, check-ins, medications)
  - How data is stored (local SQLite for now)
  - Who we share with (no one currently)
  - User rights (delete data, export data)
  - Retention (data kept until user deletes)
  - Contact for privacy questions
- [ ] Link in app footer and settings
- [ ] Host publicly accessible (GitHub Pages or Vercel)

### Task 1.2: Terms of Service Page
**Priority:** HIGH | **Blocks:** Store submission
- [ ] Create `/terms` route
- [ ] Write basic ToS:
- [ ] No medical advice disclaimer
- [ ] User responsibility
- [ ] Limitation of liability
- [ ] Link in app footer

### Task 1.3: Medical Disclaimer
**Priority:** HIGH | **Blocks:** Store submission
- [ ] Create disclaimer modal shown on first launch
- [ ] Add to app settings (re-showable)
- [ ] Text: "This app is for wellness tracking only. It does not provide medical advice, diagnosis, or treatment. Always consult healthcare professionals for medical decisions."
- [ ] User must acknowledge before continuing

### Task 1.4: Data Deletion
**Priority:** HIGH | **Blocks:** GDPR compliance
- [ ] Add "Delete All Data" button in settings
- [ ] Confirm before deletion
- [ ] Clears SQLite database
- [ ] Logs out user (if auth added later)

---

## Phase 2: Offline Functionality (TECHNICAL)

App must work without network for core features.

### Task 2.1: Offline-First Architecture
**Priority:** HIGH | **Blocks:** Store approval
- [ ] All core features work offline:
  - [ ] Check-in
  - [ ] Wellness score
  - [ ] Medication tracking
  - [ ] Activity logging
- [ ] Data syncs when connection returns
- [ ] Clear offline indicator in UI

### Task 2.2: Service Worker Update
**Priority:** MEDIUM
- [ ] Cache all essential assets
- [ ] Handle offline gracefully
- [ ] Show "offline mode" banner when disconnected

---

## Phase 3: Permissions (BOTH PLATFORMS)

### Task 3.1: Permission Requests with Explanations
**Priority:** HIGH | **Blocks:** Store approval
- [ ] Camera permission — "To add photos to your check-ins"
- [ ] Notification permission — "To remind you to check in"
- [ ] Storage permission (Android) — "To save your wellness data locally"
- [ ] Each permission explains WHY before requesting

### Task 3.2: Permission Denial Handling
**Priority:** MEDIUM
- [ ] App works if permissions denied
- [ ] Graceful degradation (no camera = skip photo feature)
- [ ] Settings link to re-enable permissions

---

## Phase 4: Preparing for Capacitor

### Task 4.1: Capacitor Setup
**Priority:** MEDIUM | **Blocks:** Native builds
- [ ] Install Capacitor core and CLI
- [ ] Initialize Capacitor config
- [ ] Add Android platform
- [ ] Add iOS platform (requires Mac)
- [ ] Configure app ID (com.wellnesscheck.app)

### Task 4.2: App Icons
**Priority:** MEDIUM | **Blocks:** Store submission
- [ ] Generate icons for all sizes:
  - Android: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
  - iOS: 20pt to 1024pt
- [ ] Place in resource folders
- [ ] Configure in Capacitor

### Task 4.3: Splash Screens
**Priority:** LOW
- [ ] Create splash screen image
- [ ] Configure for Android and iOS
- [ ] Add branding

---

## Phase 5: Store Assets

### Task 5.1: Screenshots
**Priority:** MEDIUM | **Blocks:** Store submission
- [ ] Phone screenshots (2-8):
  - Home screen
  - Check-in flow
  - Wellness score
  - Medications
  - Settings
- [ ] Tablet screenshots (optional)
- [ ] Use device frames for professional look

### Task 5.2: Feature Graphic
**Priority:** LOW | **Blocks:** Google Play
- [ ] 1024x500 px banner
- [ ] App name + key value prop
- [ ] Simple, clean design

### Task 5.3: App Descriptions
**Priority:** MEDIUM | **Blocks:** Store submission
- [ ] Short description (80 chars): "Daily wellness check-in for seniors and their families"
- [ ] Full description (4000 chars max):
  - What it does
  - Who it's for
  - Key features
  - Privacy commitment

---

## Phase 6: Testing

### Task 6.1: Internal Testing Checklist
**Priority:** HIGH | **Blocks:** Store submission
- [ ] All features work offline
- [ ] Permission flows are clear
- [ ] Medical disclaimer acknowledged
- [ ] Data can be deleted
- [ ] Empty states handled
- [ ] Error messages are user-friendly
- [ ] App doesn't crash on resume
- [ ] Works on multiple screen sizes

### Task 6.2: Device Testing
**Priority:** MEDIUM
- [ ] Test on phone (multiple sizes)
- [ ] Test on tablet
- [ ] Test on different Android versions
- [ ] Test on different iOS versions (if available)

---

## Blocked Until Later

These tasks wait until we're ready to submit:

- [ ] Create Google Play Developer account ($25)
- [ ] Create Apple Developer account ($99/year)
- [ ] Set up Vercel for privacy policy hosting
- [ ] TestFlight beta testing (iOS)
- [ ] Google Play Internal Test track

---

*Last updated: 2026-03-03*
