# HomeBeacon — Quick Reference

## Before You Write Another Line of Code

**STOP. Check this list:**

### Must Have in Codebase Before Submit
- [ ] `/privacy` — Privacy Policy page
- [ ] `/terms` — Terms of Service page
- [ ] Medical disclaimer on first launch
- [ ] Data deletion in settings

### Must Work Offline
- [ ] Check-in
- [ ] Wellness score
- [ ] Medications

### Must Ask Permissions Correctly
- [ ] Camera — explain why
- [ ] Notifications — explain why
- [ ] Handle denial gracefully

---

## When Ready to Submit

**Google Play:**
1. Create developer account ($25)
2. Upload AAB
3. Fill data safety form
4. Add screenshots + description
5. Submit (1-3 days review)

**Apple App Store:**
1. Create developer account ($99/yr)
2. Need Mac for Xcode upload
3. Fill privacy manifest
4. Add screenshots + description
5. Submit (1-3 days review)

---

## Key Files to Create

| File | Purpose | Location |
|------|---------|----------|
| `Privacy.tsx` | Privacy policy page | `src/pages/Privacy.tsx` |
| `Terms.tsx` | Terms of service page | `src/pages/Terms.tsx` |
| `DisclaimerModal.tsx` | First-launch disclaimer | `src/components/DisclaimerModal.tsx` |
| `DeleteDataButton.tsx` | Settings delete button | `src/components/DeleteDataButton.tsx` |

---

*Keep this handy while developing*
