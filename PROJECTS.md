# Wellness Check Projects

This directory contains the Wellness Check application for elderly wellness monitoring.

## Project Structure

```
wellness-check/
├── backend/          # Node.js/Express API server
├── frontend/         # React/Vite PWA
├── docs/             # Documentation
├── PROJECTS.md       # This file
└── STATUS.md         # Project status
```

## Current Projects

### Wellness Check (Active)

**Status:** Phase 3 Complete ✅

**Description:** Phone-first wellness monitoring app that helps elderly family members share their wellness status with family - on their terms. Uses pattern detection to learn what's normal and alerts family when patterns change.

**Tech Stack:**
- Frontend: React + TypeScript + Vite + Socket.io Client
- Backend: Node.js + Express + SQLite
- Real-time: Socket.io
- PWA: Service Worker + Web App Manifest
- Push Notifications: web-push

**Features:**
1. ✅ Daily Wellness Score (0-100)
2. ✅ Passive Activity Tracking
3. ✅ Pattern Alert Detection
4. ✅ One-Tap Check-In
5. ✅ Real-time Updates (Socket.io)
6. ✅ PWA Ready
7. ✅ Push Notifications
8. ✅ Request Check-In
9. ✅ Medication Reminders (Phase 2)
10. ✅ Weekly Wellness Reports (Phase 3)
11. ✅ Multi-Family Permissions (Phase 3)

**Endpoints:**
- GET /health - Health check
- POST /api/users - Create user
- GET /api/users/:id - Get user
- POST /api/activity - Record activity
- GET /api/activity/:userId - Get user's activity
- GET /api/wellness/:userId - Get wellness score
- POST /api/connections - Create family connection (role support)
- GET /api/connections/family/:familyMemberId - Get family connections with roles
- POST /api/connections/:id/role - Update connection role
- POST /api/checkin - Record check-in
- GET /api/pattern/:userId - Get pattern analysis
- POST /api/pattern/:userId/record - Trigger daily score calculation
- GET /api/alerts/:userId - Get pattern-based alerts
- POST /api/notifications/register - Register push subscription
- GET /api/notifications/subscriptions/:userId - Get user's subscriptions
- GET /api/medications/:userId - Get medications
- POST /api/medications - Create medication
- GET /api/medications/adherence/:userId - Get adherence stats
- GET /api/reports/weekly/:userId - Get weekly report
- GET /api/reports/weekly/:userId/all - Get all reports
- POST /api/reports/weekly/:userId/generate - Generate new report

## Development

### Running
```bash
# Backend (port 3001)
cd backend
npm run dev

# Frontend (port 5173)
cd frontend
npm run dev
```

### Build
```bash
# Backend
cd backend
npx tsc && node dist/index.js

# Frontend
cd frontend
npm run build
npm run preview
```

## Phase Status

### Phase 1: Core Wellness ✅
- Frontend, backend, basic API
- Users, activity, wellness, family connections
- Pattern detection and alerts

### Phase 2: Enhanced Features ✅
- WebSocket real-time updates
- Push notifications
- PWA configuration
- Medication reminders

### Phase 3: Weekly Reports & Multi-Family ✅
- Weekly wellness reports
- Multi-family role permissions
- Frontend report components

## Next Steps
See STATUS.md for current tasks.

