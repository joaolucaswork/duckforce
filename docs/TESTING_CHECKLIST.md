# Authentication & Security Testing Checklist

## Test Environment
- **Dev Server**: http://localhost:5175
- **Date**: 2025-10-31
- **Tester**: _____________

---

## Task 1: Test User Signup and Login Flow

### 1.1 Signup Page Validation
- [ ] Navigate to `/signup`
- [ ] Verify signup form is displayed with:
  - [ ] Email input field
  - [ ] Password input field
  - [ ] Confirm password input field
  - [ ] Submit button
  - [ ] Link to login page

### 1.2 Password Validation
- [ ] Try to submit with empty fields → Should show error
- [ ] Try password less than 6 characters → Should show "Password must be at least 6 characters long"
- [ ] Try mismatched passwords → Should show "Passwords do not match"
- [ ] Enter valid password (6+ chars, matching) → Should proceed

### 1.3 Successful Signup
- [ ] Create test user with email: `test-user-1@example.com`
- [ ] Use password: `TestPassword123!`
- [ ] Submit form
- [ ] **Expected Result**: 
  - If email confirmation disabled: Redirect to `/wizard`
  - If email confirmation enabled: Show success message

### 1.4 Duplicate Email Handling
- [ ] Try to sign up again with same email
- [ ] **Expected Result**: Show error "This email is already registered" or similar

### 1.5 Login Page
- [ ] Navigate to `/login`
- [ ] Verify login form is displayed with:
  - [ ] Email input field
  - [ ] Password input field
  - [ ] Submit button
  - [ ] Link to signup page
  - [ ] "Forgot password" link (optional)

### 1.6 Login with Invalid Credentials
- [ ] Try to login with wrong email → Should show error
- [ ] Try to login with wrong password → Should show error "Invalid credentials" or similar

### 1.7 Successful Login
- [ ] Login with `test-user-1@example.com` and `TestPassword123!`
- [ ] **Expected Result**: Redirect to `/wizard`

### 1.8 OAuth Login (if enabled)
- [ ] Click "Sign in with Google" button
- [ ] **Expected Result**: Redirect to Google OAuth flow

**Task 1 Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## Task 2: Test Multi-User Data Isolation

### 2.1 Create Second User
- [ ] Logout from first user
- [ ] Sign up with email: `test-user-2@example.com`
- [ ] Use password: `TestPassword123!`
- [ ] **Expected Result**: Successfully created and logged in

### 2.2 Verify Empty Org List for New Users
- [ ] As `test-user-2`, navigate to `/wizard`
- [ ] **Expected Result**: Should see empty state or "No organizations" message
- [ ] Should NOT see any orgs from `test-user-1`

### 2.3 Test API Data Isolation
- [ ] As `test-user-2`, open browser DevTools → Network tab
- [ ] Navigate to `/wizard` or refresh page
- [ ] Find API call to `/api/orgs`
- [ ] Check response → Should be empty array `[]` or empty list
- [ ] **Expected Result**: No organizations returned

### 2.4 Switch Between Users
- [ ] Logout from `test-user-2`
- [ ] Login as `test-user-1`
- [ ] Check `/api/orgs` response
- [ ] Logout and login as `test-user-2`
- [ ] Check `/api/orgs` response again
- [ ] **Expected Result**: Each user sees only their own data

### 2.5 Concurrent Sessions (Optional - requires 2 browsers)
- [ ] Open Chrome and login as `test-user-1`
- [ ] Open Firefox (or Incognito) and login as `test-user-2`
- [ ] Both should be logged in simultaneously
- [ ] Each should see only their own data
- [ ] **Expected Result**: No data leakage between sessions

**Task 2 Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## Task 3: Test Authentication Middleware

### 3.1 Protected Routes - Unauthenticated Access
- [ ] Logout from all accounts
- [ ] Try to access `/wizard` directly
- [ ] **Expected Result**: Redirect to `/login`

### 3.2 Protected API Endpoints - Unauthenticated
Open browser DevTools → Console, then run these commands:

```javascript
// Test /api/orgs
fetch('/api/orgs').then(r => console.log('Status:', r.status, 'OK:', r.ok))
// Expected: Status 401 or 302/303 (redirect)

// Test /api/orgs/:id
fetch('/api/orgs/test-org-id').then(r => console.log('Status:', r.status))
// Expected: Status 401 or 302/303

// Test /api/orgs/:id/activate
fetch('/api/orgs/test-org-id/activate', {method: 'POST'}).then(r => console.log('Status:', r.status))
// Expected: Status 401 or 302/303

// Test /api/orgs/:id/sync
fetch('/api/orgs/test-org-id/sync', {method: 'POST'}).then(r => console.log('Status:', r.status))
// Expected: Status 401 or 302/303
```

- [ ] All requests should return 401 or redirect (302/303)
- [ ] **Expected Result**: Unauthenticated requests are blocked

### 3.3 Public Routes - Unauthenticated Access
- [ ] Access `/login` → Should work
- [ ] Access `/signup` → Should work
- [ ] Access `/` (home) → Should work
- [ ] **Expected Result**: Public routes accessible without auth

### 3.4 Auth Routes - Authenticated Access
- [ ] Login as `test-user-1`
- [ ] Try to access `/login`
- [ ] **Expected Result**: Redirect to `/wizard`
- [ ] Try to access `/signup`
- [ ] **Expected Result**: Redirect to `/wizard`

### 3.5 Protected Routes - Authenticated Access
- [ ] While logged in, access `/wizard`
- [ ] **Expected Result**: Page loads successfully
- [ ] Open DevTools → Console, run:

```javascript
fetch('/api/orgs').then(r => console.log('Status:', r.status, 'OK:', r.ok))
// Expected: Status 200, OK: true
```

- [ ] **Expected Result**: API request succeeds with 200 status

### 3.6 Session Validation on API Requests
- [ ] Login as `test-user-1`
- [ ] Make successful API request to `/api/orgs`
- [ ] Open DevTools → Application → Cookies
- [ ] Delete all cookies starting with `sb-` or `supabase`
- [ ] Try API request again:

```javascript
fetch('/api/orgs').then(r => console.log('Status:', r.status))
// Expected: Status 401 or 302/303
```

- [ ] **Expected Result**: Request fails after cookies deleted

**Task 3 Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## Task 4: Test Session Persistence

### 4.1 Session Persists Across Page Refresh
- [ ] Login as `test-user-1`
- [ ] Navigate to `/wizard`
- [ ] Refresh the page (F5 or Cmd+R)
- [ ] **Expected Result**: Still on `/wizard`, not redirected to login

### 4.2 Session Persists Across Navigation
- [ ] While logged in, navigate to `/wizard`
- [ ] Click browser back button
- [ ] Click browser forward button
- [ ] **Expected Result**: Session maintained, no redirect to login

### 4.3 Session Persists in New Tab
- [ ] While logged in, open new tab
- [ ] Navigate to `/wizard` in new tab
- [ ] **Expected Result**: Authenticated in new tab without login

### 4.4 Session Persists After Idle Time
- [ ] Login as `test-user-1`
- [ ] Wait 2-3 minutes without interaction
- [ ] Refresh the page
- [ ] **Expected Result**: Still authenticated

### 4.5 Session Clears on Logout
- [ ] Login as `test-user-1`
- [ ] Click logout button
- [ ] **Expected Result**: Redirected to `/login` or home
- [ ] Try to access `/wizard`
- [ ] **Expected Result**: Redirected to `/login`

### 4.6 Session Restoration After Browser Restart (Manual)
- [ ] Login as `test-user-1`
- [ ] Note the cookies in DevTools → Application → Cookies
- [ ] Close browser completely
- [ ] Reopen browser
- [ ] Navigate to `/wizard`
- [ ] **Expected Result**: 
  - If "Remember me" enabled: Still authenticated
  - If session-only cookies: Redirected to login

### 4.7 Concurrent Sessions in Different Browsers
- [ ] Login as `test-user-1` in Chrome
- [ ] Login as `test-user-1` in Firefox
- [ ] Both should work simultaneously
- [ ] Logout from Chrome
- [ ] **Expected Result**: Firefox session still active

**Task 4 Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## Summary

| Task | Status | Notes |
|------|--------|-------|
| 1. User Signup and Login Flow | ⬜ | |
| 2. Multi-User Data Isolation | ⬜ | |
| 3. Authentication Middleware | ⬜ | |
| 4. Session Persistence | ⬜ | |

---

## Issues Found

| # | Task | Issue Description | Severity | Status |
|---|------|-------------------|----------|--------|
| 1 | | | ⬜ Low ⬜ Medium ⬜ High | ⬜ Open ⬜ Fixed |
| 2 | | | ⬜ Low ⬜ Medium ⬜ High | ⬜ Open ⬜ Fixed |
| 3 | | | ⬜ Low ⬜ Medium ⬜ High | ⬜ Open ⬜ Fixed |

---

## Notes

_Add any additional observations or notes here_

