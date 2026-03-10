# HomeBeacon Rebrand Checklist

**Date:** March 7, 2026
**Old Name:** HomeBeacon
**New Name:** HomeBeacon

---

## ✅ Completed

### Core Files Updated
- [x] `/package.json` — Package name: `wellness-check` → `homebeacon`
- [x] `/frontend/package.json` — No changes needed (workspace package)
- [x] `/frontend/capacitor.config.ts` — appId: `com.wellnesscheck.app` → `com.homebeacon.app`, appName: `HomeBeacon`
- [x] `/frontend/index.html` — Title, meta description, apple-mobile-web-app-title
- [x] `/frontend/public/manifest.json` — PWA manifest name, description

### Android Files Updated
- [x] `/frontend/android/app/build.gradle` — namespace, applicationId: `com.homebeacon.app`
- [x] `/frontend/android/app/src/main/res/values/strings.xml` — app_name, title_activity_main, package_name

### App Code Updated
- [x] `/frontend/src/App.tsx` — App title, description text

### Legal Documents Updated
- [x] `/docs/PRIVACY-POLICY.md` — App name changed
- [x] `/docs/TERMS-OF-SERVICE.md` — App name changed
- [x] `/docs/MEDICAL-DISCLAIMER.md` — App name changed
- [x] `/docs/STORE-LISTING.md` — App name changed

---

## ⬜ Remaining (Free)

### Code Updates Needed
- [ ] Update wellness score references to "Home Score" or similar (optional)
- [ ] Update any remaining "HomeBeacon" text in components
- [ ] Update AdBanner component text if needed

### Assets Needed (You'll Create)
- [ ] New app icon (replace `/frontend/public/icon-192.svg`)
- [ ] New splash screen
- [ ] Play Store screenshots updated
- [ ] Play Store feature graphic updated

### Documentation
- [ ] Update README.md
- [ ] Update PROJECTS.md
- [ ] Update DESIGN-RESEARCH.md

---

## ⬜ Remaining (Costs Money)

- [ ] Register domain (`homebeacon.app` or `gethomebeacon.com`)
- [ ] Google Play Developer account ($25 one-time)
- [ ] Apple Developer account ($99/year)
- [ ] USPTO trademark filing ($250-350)

---

## Next Steps

1. **Run the app** to verify all changes work
2. **Create new app icons** with HomeBeacon branding
3. **Test build** with `npm run build` in frontend
4. **Sync Android** with `npx cap sync android`
5. **Register domain** when ready
6. **File trademark** when funds allow

---

## Package Name Change

| File | Old | New |
|------|-----|-----|
| package.json | wellness-check | homebeacon |
| capacitor.config.ts | com.wellnesscheck.app | com.homebeacon.app |
| Android namespace | com.wellnesscheck.app | com.homebeacon.app |
| Android strings | HomeBeacon | HomeBeacon |

---

## Name Meaning

**HomeBeacon** — A beacon in the home that signals family when help is needed.

- **Home** — Where seniors live, family connection
- **Beacon** — A light that guides, a signal for help

Perfect for senior safety app — family receives the signal (beacon) from home.

---

## Conflicts Checked

- ✅ No app on Google Play Store
- ✅ No app on Apple App Store
- ✅ No USPTO trademark in Class 9 (software) or Class 42 (SaaS)
- ⚠️ Minor conflicts in real estate (different industry) — acceptable

---

## Research File

See `/home/james/.openclaw/workspace/wellness-check/research/NAME-RESEARCH-2026-03-07.md` for full research history.