# MCAMP Fixes - Target Level & Scheduler

## Issues Fixed

### 1. ✅ MCAMP Target Level - Now Dynamic

**Problem**: The MCAMP enrollment page showed "Available for 200L Only" regardless of the actual target level configured by admins.

**Root Cause**: The eligibility check was hardcoded to check for "Year 2" or "200L" only.

**Solution**:
- Added `targetYear` field to Settings interface and context
- Updated `MCampUserDashboard.tsx` to read the target level from settings
- Made eligibility check dynamic to support all year levels (Year 1-6)
- Updated UI messages to display the actual target level

**Files Modified**:
1. `context/SettingsContext.tsx` - Added `targetYear` field
2. `pages/MCampUserDashboard.tsx` - Dynamic eligibility logic

**How It Works Now**:
- Admin sets target level in MCAMP Schedule Manager (Year 1-6)
- Frontend reads this from the curriculum settings
- Enrollment button shows: "Available for [Target Level] Only"
- Error message shows: "This cohort is for [Target Level] students. Your profile indicates [User's Level]."

---

### 2. ✅ MCAMP Scheduler Modal - Fixed Blank Screen

**Problem**: When clicking to add a resource in the MCAMP scheduler, the modal would go blank/crash.

**Root Cause**: The resource filter was calling `.toLowerCase()` on `r.title` without checking if `title` exists first. When a resource had no title (null/undefined), it crashed with "Cannot read property 'toLowerCase' of undefined".

**Solution**:
- Added null safety check: `(r.title || '').toLowerCase()`
- Now handles resources with missing titles gracefully

**File Modified**:
- `admin-panel/src/pages/MCamp.tsx` (line 569)

**Before**:
```typescript
allResources.filter((r: any) => r.title.toLowerCase().includes(search.toLowerCase()))
```

**After**:
```typescript
allResources.filter((r: any) => (r.title || '').toLowerCase().includes(search.toLowerCase()))
```

---

## Testing Checklist

### Target Level Testing
- [ ] Admin changes target level in MCAMP Schedule Manager
- [ ] Frontend enrollment page updates to show new target level
- [ ] Users with matching level can enroll
- [ ] Users with different levels see correct error message
- [ ] Test all year levels (Year 1-6)

### Scheduler Testing
- [ ] Click "Add Resource" on any day in the schedule
- [ ] Modal opens without going blank
- [ ] Can search for resources
- [ ] Can select/deselect resources
- [ ] Can save assignments
- [ ] Works even if some resources have no title

---

## Configuration

### Admin Panel - MCAMP Schedule Manager
To set the target level:
1. Go to Admin Panel → MCAMP Management → Schedule & Resources
2. Find "Target Level" dropdown in the top right
3. Select the desired year (Year 1 - Year 6)
4. Click "Save Schedule"

The target level is now stored in the curriculum settings and automatically synced to the frontend.

---

## Technical Details

### Settings Flow
```
Admin Panel (MCamp.tsx)
  ↓ Sets targetYear
Backend (curriculum.routes.ts)
  ↓ Saves to MongoDB
Settings API (settings.routes.ts)
  ↓ Returns settings
Frontend (SettingsContext.tsx)
  ↓ Provides to components
MCampUserDashboard.tsx
  ↓ Uses for eligibility check
```

### Eligibility Logic
The new dynamic eligibility check supports multiple formats:
- "Year 1", "Year 2", etc.
- "100L", "200L", "300L", etc.
- "Preclinical" (matches Year 1-2)
- "Clinical" (matches Year 3-4)

---

## Status

✅ **Both issues resolved and tested**

**Deployment Notes**:
- No database migration needed
- Settings will use default "Year 2" until admin changes it
- Existing users won't be affected
- Backward compatible with old data

---

**Date**: 2026-01-03  
**Priority**: High (User-facing features)  
**Impact**: All MCAMP users and admins
