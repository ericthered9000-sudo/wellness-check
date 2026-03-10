# HomeBeacon MVP - Known Issues

## Phase 1 Issues Fixed

### Backend TypeScript Compilation
- **Issue**: TypeScript compilation failed due to missing type declarations for `better-sqlite3`
- **Solution**: Created type declaration file at `backend/src/types/better-sqlite3.d.ts`

### Frontend JavaScript Syntax Error
- **Issue**: App.tsx line 123 had unescaped apostrophe in message string causing parse error
- **Solution**: Changed `'I'm doing great!'` to `'I am doing great!'`

### Database Interface Issue
- **Issue**: `DatabaseConstructor` reference was removed during fix, but type was still being used
- **Solution**: Simplified database initialization to `const db = new Database('./wellness.db')`

---

## Current Status

✅ Backend running on http://localhost:3001  
✅ Frontend running on http://localhost:5174  
✅ Health check passing  
✅ Database schema initialized with all tables  
✅ API endpoints functional  

---

## Pending MVP Enhancements

### 1. Pattern Detection Engine
Add pattern learning to detect:
- Unusual inactivity (>12 hours during normal awake time)
- Charging routine changes
- Home location patterns
- Sleep schedule deviations

### 2. Alert System
Implement:
- Pattern-based alert generation
- Alert acknowledgment tracking
- Family notifications for alerts

### 3. Wellness Score Refinement
Improve scoring algorithm:
- Weight different activity types
- Consider time-of-day patterns
- Account for baseline learning period

### 4. Privacy Dashboard (Senior View)
Add UI for:
- What data is being collected
- Who can see what
- Manual sharing controls

### 5. Check-In Request Flow
Add:
- Family sends check-in request
- Senior receives notification
- Response tracking

### 6. Real-time Updates
Implement:
- WebSockets for live updates
- Mobile push notifications via PWA

---

## Development Roadmap

- **Phase 1**: Fix issues, verify core functionality ✅
- **Phase 2**: Pattern detection & alerts
- **Phase 3**: Polish UI/UX
- **Phase 4**: Testing & documentation
