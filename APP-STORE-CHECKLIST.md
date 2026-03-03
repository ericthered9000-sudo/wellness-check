# Wellness Check — App Store Submission Checklist

Track progress toward Google Play and Apple App Store submission.

---

## 🟢 Green = Done | 🟡 In Progress | ⬜ Not Started

---

## Pre-Development Requirements

### Privacy & Legal
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Privacy Policy written | Required for both stores. Must cover: data collection, storage, sharing, user rights, retention |
| ⬜ | Terms of Service | User agreement |
| ⬜ | Medical Disclaimer | "This app is not medical advice. Consult healthcare professionals." |
| ⬜ | HIPAA Assessment | If storing health data, determine HIPAA applicability |
| ⬜ | GDPR/CCPA Compliance plan | If serving EU/CA users |

### Data Handling
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Data inventory | List all data collected |
| ⬜ | Data storage location documented | Where is data stored? |
| ⬜ | Data retention policy | How long is data kept? |
| ⬜ | Data deletion mechanism | Users can request deletion |
| ⬜ | Third-party data sharing audit | Are you sharing with any services? |

---

## Google Play Store Requirements

### Account Setup
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Developer account ($25) | One-time fee |
| ⬜ | Merchant account | For paid apps/subscriptions |

### App Content
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Content rating questionnaire | Fill out questionnaire |
| ⬜ | Target audience selection | Who is this app for? |
| ⬜ | App category | Health & Fitness |
| ⬜ | App description (short) | 80 char max |
| ⬜ | App description (full) | 4000 char max |
| ⬜ | Screenshots (phone) | 2-8 required |
| ⬜ | Screenshots (tablet) | Optional but recommended |
| ⬜ | Feature graphic | 1024x500 px |
| ⬜ | App icon | 512x512 px |

### Technical Requirements
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Target API Level 34+ | Required for new apps |
| ⬜ | Minimum SDK declared | |
| ⬜ | App signing key | Use Google Play App Signing |
| ⬜ | APK/AAB file | Bundle preferred |
| ⬜ | Version number | Format: major.minor.patch |
| ⬜ | Permissions declared | All permissions listed in manifest |

### Privacy Requirements
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Data safety form | Declare all data types collected |
| ⬜ | Data sharing declared | Who you share data with |
| ⬜ | Data retention period | How long data is kept |
| ⬜ | Security practices | Encryption, access controls |
| ⬜ | Privacy policy URL | Must be accessible |

---

## Apple App Store Requirements

### Account Setup
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Apple Developer account ($99/yr) | Annual fee |
| ⬜ | Mac for submission | Requires Xcode or Transporter |

### App Content
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | App category | Health & Fitness |
| ⬜ | Secondary category | Optional |
| ⬜ | Age rating | Based on content |
| ⬜ | App description | 4000 char max |
| ⬜ | Keywords | 100 char max |
| ⬜ | Support URL | Required |
| ⬜ | Marketing URL | Optional |
| ⬜ | Screenshots (all sizes) | iPhone, iPad, Pro |

### Technical Requirements
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | iOS deployment target | Usually iOS 14+ |
| ⬜ | App Transport Security | HTTPS required |
| ⬜ | App privacy manifest | What data is collected |
| ⬜ | Entitlements declared | Any special permissions |
| ⬜ | App thinning | Size optimization |
| ⬜ | Launch screen | Required |

### Health App Specific
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | HealthKit usage description | If using HealthKit |
| ⬜ | Medical device disclaimer | App not a medical device |
| ⬜ | Health data permission prompts | Clear explanations |
| ⬜ | HIPAA compliance (if applicable) | May require legal review |

---

## PWA to Native Conversion

### If Using Capacitor (Recommended)
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Capacitor installed | npm install @capacitor/core @capacitor/cli |
| ⬜ | iOS platform added | npx cap add ios |
| ⬜ | Android platform added | npx cap add android |
| ⬜ | Native icons generated | All required sizes |
| ⬜ | Splash screens configured | |
| ⬜ | Deep linking setup | For notifications |
| ⬜ | Push notifications | APNs for iOS, FCM for Android |
| ⬜ | Offline functionality | App must work without network |

---

## Testing Requirements

### Pre-Submission Testing
| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Internal testing complete | All features work |
| ⬜ | Edge cases tested | Empty states, errors |
| ⬜ | Permission flows tested | Grant/deny scenarios |
| ⬜ | Offline mode tested | App works without connection |
| ⬜ | Various devices tested | Different screen sizes |
| ⬜ | Accessibility tested | Screen readers, contrast |

---

## Post-Launch

| Status | Requirement | Notes |
|--------|-------------|-------|
| ⬜ | Monitor crashes | Firebase Crashlytics or similar |
| ⬜ | Respond to reviews | Both stores |
| ⬜ | Plan updates | Regular updates improve ranking |
| ⬜ | Analytics setup | Track usage |

---

*Last updated: 2026-03-03*
