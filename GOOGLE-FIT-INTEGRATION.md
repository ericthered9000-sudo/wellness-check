# Google Fit Integration Guide

**Research Date:** 2026-02-28
**Purpose:** Integrate Google Fit health data into HomeBeacon app

**Status:** 🟡 In Progress - Schema and service created, needs OAuth testing

---

## Overview

Google Fit provides a REST API that allows web applications to read health and wellness data from users' Google accounts. This is key for our Android users to share real health data.

### Platform Comparison

| Platform | Integration Method | Difficulty |
|----------|-------------------|------------|
| **Google Fit (Android)** | REST API via OAuth2 | ✅ Easiest |
| **Apple HealthKit (iOS)** | Native app only | ❌ Requires native app |
| **Health Connect (Android)** | Similar to HealthKit | ⚠️ In-app only |

**Recommendation:** Start with Google Fit for Android users. For iOS, consider:
1. Building a native iOS companion app
2. Using a bridge service like Terra (webhooks)
3. Accepting manual entry for now

---

## Google Fit REST API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google API Console](https://console.cloud.google.com/flows/enableapi?apiid=fitness)
2. Create new project or select existing
3. Enable Fitness API
4. Create OAuth 2.0 Client ID (Web application)

### Step 2: Configure OAuth consent screen

**Required scopes:**
```
https://www.googleapis.com/auth/fitness.activity.read
https://www.googleapis.com/auth/fitness.heart_rate.read
https://www.googleapis.com/auth/fitness.sleep.read
https://www.googleapis.com/auth/fitness.body.read
```

**Note:** These are sensitive/restricted scopes - requires Google verification for production use.

### Step 3: Get Credentials

```env
GOOGLE_CLIENT_ID=780816631155-gbvyo1o7r2pn95qc4ei9d61io4uh48hl.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

### Step 4: OAuth Flow in App

```
1. User clicks "Connect Google Fit"
2. Redirect to Google OAuth consent screen
3. User grants permissions
4. Google redirects back with authorization code
5. Exchange code for access_token + refresh_token
6. Store tokens in database
7. Use access_token for API calls
8. Refresh token when expired
```

---

## API Endpoints

### Base URL
```
https://www.googleapis.com/fitness/v1
```

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /users/me/dataSources` | List available data sources |
| `POST /users/me/dataSources` | Create custom data source |
| `GET /users/me/datasets/{datasetId}` | Get data points |
| `POST /users/me/datasets/{datasetId}` | Add data points |
| `GET /users/me/sessions` | List sessions (workouts, sleep) |

---

## Available Data Types

### Activity Data

| Data Type | Description |
|-----------|-------------|
| `com.google.step_count.delta` | Steps taken |
| `com.google.step_count.cumulative` | Total steps |
| `com.google.activity.segment` | Activity type (walking, running, etc.) |
| `com.google.calories.expended` | Calories burned |
| `com.google.active_minutes` | Active time |
| `com.google.distance.delta` | Distance traveled |

### Health Metrics

| Data Type | Description |
|-----------|-------------|
| `com.google.heart_rate.bpm` | Heart rate |
| `com.google.heart_points` | Heart Points (Google's metric) |
| `com.google.body.mass` | Weight |
| `com.google.body.height` | Height |
| `com.google.body.fat.percentage` | Body fat % |
| `com.google.blood_glucose` | Blood glucose |

### Sleep Data

| Data Type | Description |
|-----------|-------------|
| `com.google.sleep.segment` | Sleep session |
| Activity type 72 | Sleep activity type |
| Buckets | Light, Deep, REM sleep |

---

## Implementation Architecture

### Database Schema

```sql
-- Google Fit connections
CREATE TABLE google_fit_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  google_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_sync_at DATETIME,
  UNIQUE(user_id)
);

-- Synced health data
CREATE TABLE health_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL, -- 'google_fit', 'apple_health', 'manual'
  data_type TEXT NOT NULL, -- 'steps', 'heart_rate', 'sleep', etc.
  value REAL NOT NULL,
  unit TEXT,
  recorded_at DATETIME NOT NULL,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sleep sessions
CREATE TABLE sleep_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  deep_minutes INTEGER,
  light_minutes INTEGER,
  rem_minutes INTEGER,
  awake_minutes INTEGER,
  source TEXT DEFAULT 'google_fit',
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Backend API Endpoints

```typescript
// OAuth flow
GET  /api/health/google/authorize    -> Redirects to Google consent
GET  /api/health/google/callback     -> Handles OAuth callback
POST /api/health/google/disconnect   -> Revokes access

// Health data
GET  /api/health/steps               -> Get step count (with date range)
GET  /api/health/heart-rate          -> Get heart rate data
GET  /api/health/sleep               -> Get sleep sessions
GET  /api/health/summary             -> Aggregated health summary

// Sync
POST /api/health/sync                -> Trigger Google Fit sync
GET  /api/health/sync/status         -> Check sync status
```

### Example: Sync Steps from Google Fit

```typescript
async function syncStepsFromGoogleFit(userId: string, accessToken: string) {
  const startTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endTime = Date.now();
  
  const response = await fetch(
    `https://www.googleapis.com/fitness/v1/users/me/datasets/` +
    `${startTime}000000-${endTime}000000?` +
    `dataSourceId=com.google.step_count.delta`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const data = await response.json();
  
  // Aggregate steps per day
  // Store in health_data table
  // Update wellness score
}
```

---

## Security Considerations

### Token Storage
- Store refresh tokens encrypted
- Never expose tokens to client-side JavaScript
- Use secure HTTP-only cookies for session

### Scope Limits
- Request minimal scopes needed
- Be transparent about what data you access
- Allow users to revoke access easily

### Data Privacy
- Encrypt health data at rest
- Delete all data on user request (GDPR)
- Show what data is being synced

---

## User Experience Flow

### Connection Flow

```
┌─────────────────┐
│  Senior's App    │
│                 │
│  "Connect        │
│   Google Fit"   │
│     │           │
│     ▼           │
│  OAuth Consent  │
│                 │
│  Google asks:   │
│  "Allow access  │
│   to steps,     │
│   heart rate,   │
│   sleep?"       │
│                 │
│     │ Allow     │
│     ▼           │
│  Syncing data   │
│                 │
│  ✅ Connected   │
│                 │
│  Wellness score │
│  now includes: │
│  - Daily steps  │
│  - Heart rate   │
│  - Sleep data   │
└─────────────────┘
```

### Data Sync Frequency

- **On-demand:** When user opens app
- **Background:** Every 4 hours (configurable)
- **Manual:** User can force sync

---

## Error Handling

### Token Expiration

```typescript
// Token expires after 1 hour
// Use refresh token to get new access token

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  return response.json(); // { access_token, expires_in, ... }
}
```

### User Disconnection

```typescript
// When user disconnects Google Fit
async function disconnectGoogleFit(userId: string) {
  // 1. Revoke Google token
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: 'POST'
  });
  
  // 2. Delete local connection record
  await db.googleFitConnections.delete({ userId });
  
  // 3. Delete or anonymize synced health data (user choice)
  await db.healthData.delete({ userId, source: 'google_fit' });
}
```

---

## Testing

### OAuth Playground

Test the API before implementing:
https://developers.google.com/oauthplayground/

1. Select Fitness API scopes
2. Authorize
3. Exchange code for tokens
4. Make API requests manually

### Sample Requests

```bash
# List data sources
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://www.googleapis.com/fitness/v1/users/me/dataSources

# Get steps (last 24 hours)
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://www.googleapis.com/fitness/v1/users/me/datasets/$(date -v-1d +%s)000000-$(date +%s)000000?dataSourceId=com.google.step_count.delta"
```

---

## Production Considerations

### Google Verification Required

If your app requests sensitive/restricted scopes, you must:
1. Submit for verification
2. Provide privacy policy
3. Explain data usage
4. Meet security requirements

**Timeline:** Verification can take 2-4 weeks

### Rate Limits

- 30,000 requests/day/user
- 600 requests/minute/user
- Consider caching/aggregating locally

### Cost

- Free for reasonable usage
- No per-API-call cost
- Data storage is your responsibility

---

## Implementation Priority

| Priority | Feature | Effort |
|----------|---------|--------|
| 1 | OAuth connection + basic step sync | 2-3 days |
| 2 | Heart rate integration | 1 day |
| 3 | Sleep data integration | 1 day |
| 4 | Wellness score integration | 1 day |
| 5 | Background sync | 1 day |

**Total estimated effort:** 5-7 days

---

## Alternative: Terra Integration

If you need Apple Health data from iOS without building a native app:

**Terra** (tryterra.co) provides:
- iOS app that syncs HealthKit data
- Webhooks to receive data
- Unified API for Apple, Google, Fitbit, Garmin, etc.

**Pros:**
- One API for all providers
- No native app needed
- Handles OAuth complexity

**Cons:**
- Third-party dependency
- Pricing (free tier + paid plans)
- Data goes through Terra's servers

---

*Research compiled by Girz, 2026-02-28*