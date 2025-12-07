# Moti-Do Authentication & Import/Export Implementation Plan

## Executive Summary

This plan implements **single-user authentication** and **JSON import/export** for Moti-Do, prioritizing security for Vercel deployment.

**User Requirements:**
- Single-user auth (username/password, no social login)
- JSON full-data export/import only
- No external app imports
- Production-ready security

**Current State:**
- JWT infrastructure exists but unused (dev mode bypasses auth)
- Password hashing ready (bcrypt)
- User model missing password_hash field
- No login/register endpoints or UI
- Export/import functionality missing

---

## PHASE 1: Authentication (PRIORITY 1)

### 1A. Backend - User Model & Database
- Add `password_hash: str | None` to User dataclass
- Update PostgreSQL schema
- Update serialization in json_manager.py and postgres_manager.py

### 1B. Backend - Authentication Endpoints
- Create auth.py router with login, register, change-password
- Add schemas for UserRegisterRequest, PasswordChangeRequest
- Include auth router in main.py

### 1C. Backend - Security Hardening
- Update get_current_user() to enforce auth
- Configure CORS for production
- Add rate limiting middleware
- Add security headers to vercel.json

### 1D. Frontend - Login & Protected Routes
- Create LoginPage.tsx
- Create ProtectedRoute.tsx component
- Update App.tsx routing
- Add authApi to services/api.ts
- Add logout to MainLayout

### 1E. Environment Variables
- Set MOTIDO_DEV_MODE=false in Vercel
- Generate and set JWT_SECRET
- Configure DATABASE_URL

---

## PHASE 2: Import/Export (PRIORITY 2)

### 2A. Backend - Export
- Add GET /api/user/export endpoint
- Serialize complete User data as JSON

### 2B. Backend - Import
- Add POST /api/user/import endpoint
- Add _deserialize_user_data() to JsonDataManager
- Validate and replace user data

### 2C. Frontend - Import/Export UI
- Update SettingsPage with export/import buttons
- Add confirmation dialogs
- Add dataApi to services/api.ts

---

## PHASE 3: Testing

### Backend Tests
- tests/api/test_auth.py
- tests/api/test_import_export.py
- Run: `poetry run poe coverage`

### Frontend Tests
- frontend/src/pages/LoginPage.test.tsx
- Run: `npm run test`

---

## PHASE 4: Deployment

1. Database migration (add password_hash column)
2. Set Vercel environment variables
3. Deploy to production
4. Manual testing checklist
5. Create initial backup

---

## Critical Files

**Backend:**
- src/motido/core/models.py
- src/motido/data/postgres_manager.py
- src/motido/api/routers/auth.py (NEW)
- src/motido/api/routers/user.py
- src/motido/api/deps.py
- src/motido/api/main.py

**Frontend:**
- frontend/src/pages/LoginPage.tsx (NEW)
- frontend/src/components/auth/ProtectedRoute.tsx (NEW)
- frontend/src/App.tsx
- frontend/src/pages/SettingsPage.tsx
- frontend/src/services/api.ts

**Config:**
- vercel.json
- .env (Vercel Dashboard)

---

## Success Criteria

**Phase 1:**
- ✅ Single-user registration and login working
- ✅ All routes protected except /login
- ✅ Rate limiting active
- ✅ Security headers present

**Phase 2:**
- ✅ Export downloads complete JSON backup
- ✅ Import replaces all data from backup
- ✅ Password change working

**Production:**
- ✅ All tests passing (100% backend coverage)
- ✅ Manual testing complete
- ✅ Deployed to Vercel securely
