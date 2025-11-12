# Testing Guide - Kimia Platform

## Quick Start Testing

### 1. Start Development Servers

You need TWO terminal windows:

**Terminal 1 - Convex Backend (DEV):**
```bash
npx convex dev
```
Wait for: "Convex functions ready!" message

**Terminal 2 - Next.js Frontend:**
```bash
npm run dev
```
Wait for server to start at: http://localhost:3000

### 2. Test Authentication Flow

#### Register a New User

1. Open http://localhost:3000
2. Click "Sign In" button
3. Click "Register" link at bottom
4. Fill in the registration form:
   - **Name**: Your full name
   - **Email**: your.email@test.com (any valid email format)
   - **Role**: Select from dropdown (try "Faculty / Researcher" first)
   - **Password**: Minimum 8 characters
   - **Confirm Password**: Must match
5. Click "Create Account"
6. **Expected**: Redirect to `/app` dashboard with your profile

#### Sign In

1. Go back to home page
2. Click "Sign In"
3. Enter your registered email and password
4. Click "Sign In"
5. **Expected**: Redirect to dashboard, showing your name and role

#### Sign Out

1. Click "Sign Out" button in top right
2. **Expected**: Redirect to home page, logged out

### 3. Test Role-Based Navigation

The navigation menu changes based on your user role:

**Faculty Role** sees:
- Dashboard
- Calls
- My Proposals
- Projects

**Evaluator Role** sees:
- Dashboard
- Calls
- Evaluations

**Kimia Admin** sees:
- Dashboard
- Calls
- Evaluations
- Projects
- Admin

**Test this:**
1. Create multiple accounts with different roles
2. Sign in with each
3. Verify navigation shows/hides appropriate links

### 4. Test Dashboard Features

When logged in, verify the dashboard shows:
- Welcome banner with personalized message for your role
- Three stat cards (Proposals, Projects, Evaluations - all showing "0")
- Profile information section showing:
  - Email
  - Role
  - Account status (Active)
  - Member since date
- Construction notice banner

### 5. Check Convex Dashboard

1. Open Convex Dev Dashboard (URL shown in Terminal 1 after running `npx convex dev`)
2. Navigate to "Data"
3. Check `users` table - should see your registered user
4. Verify user fields:
   - email
   - name
   - role
   - active (should be true)
   - createdAt timestamp

### 6. Test Authentication Persistence

1. Log in successfully
2. Refresh the page (F5 or Cmd+R)
3. **Expected**: Still logged in, session persisted

### 7. Test Protected Routes

1. Log out
2. Manually navigate to http://localhost:3000/dashboard
3. **Expected**: Automatically redirect to `/auth/login`

### 8. Call Management (Phase 1 MVP)

Admin users can now create and manage funding calls from `/dashboard/calls`.

1. Sign in with a `sysadmin` or `admin` account
2. Visit http://localhost:3000/dashboard/calls/new
3. Complete the wizard step-by-step, ensuring you provide:
   - Project type and at least one target audience entry
   - Submission and decision dates (evaluation start/end optional)
   - Budget totals/min/max and allowed categories
   - Eligibility campuses/departments and at least one qualification
   - Required documents and evaluator configuration (min 1 evaluator)
4. Submit the form
5. **Expected**: New call appears with correct timeline, budget range, target audience tags, and evaluator count
6. Change the call status using the dropdown → verify the success message and list refresh
7. Sign in as a faculty user → `/dashboard/calls` should show only open (and not-yet-closed) calls with read-only metadata
8. Open the public detail page at `/calls/<call-slug>` → verify tabs (Overview, Eligibility, Timeline, Budget, Documents, Evaluation, FAQ) render call data, the deadline countdown appears, and the bookmark button updates the counter (requires login)
9. As an admin, add a new FAQ from the detail page → confirm it appears immediately, can be edited/deleted, and is visible to non-admin users when reloading the page

## Known Issues / Expected Behavior

### Current Phase Status

This is **Phase 1 - Foundation** with only authentication and basic UI implemented:

- ✅ User registration and login
- ✅ Role-based access control
- ✅ Protected routes
- ✅ User profile display
- ✅ Calls management (admin MVP)
- ❌ Proposal submission (Phase 2)
- ❌ Evaluation system (Phase 2)
- ❌ Project management (Phase 3)
- ❌ Financial management (Phase 3)

### Expected "Not Implemented" Features

The following links/features don't work yet (by design):
- Clicking "My Proposals" in navigation
- Clicking "Evaluations" in navigation
- Clicking "Projects" in navigation
- Clicking "Admin" in navigation
- Clicking "Edit Profile" link
- Clicking "Learn More" on home page

These will be implemented in upcoming phases.

## Common Issues & Solutions

### Issue: "Failed to sign in" error
**Solution**:
- Check Convex dev server is running in Terminal 1
- Verify `NEXT_PUBLIC_CONVEX_URL` in `.env.local` matches your Convex deployment

### Issue: Build errors or type errors
**Solution**:
- Ensure `convex/_generated` directory exists
- Try restarting both dev servers
- Run `npm run build` to check for build issues

### Issue: Page shows "Loading..." forever
**Solution**:
- Check browser console for errors
- Verify Convex backend is connected (check Network tab)
- Ensure auth tables are created in Convex dashboard

### Issue: Navigation links return 404
**Solution**:
- This is expected! Those routes aren't created yet
- Only `/dashboard` is implemented in Phase 1

## Testing Checklist

Use this checklist to verify authentication is working:

- [ ] Can register new user with faculty role
- [ ] Can register new user with evaluator role
- [ ] Can register new user with admin role
- [ ] Cannot register with password < 8 characters
- [ ] Cannot register with mismatched passwords
- [ ] Can log in with correct credentials
- [ ] Cannot log in with wrong password
- [ ] Navigation shows role-appropriate links
- [ ] Dashboard displays user information correctly
- [ ] Sign out works and redirects to home
- [ ] Refresh page maintains logged-in state
- [ ] Accessing /dashboard while logged out redirects to login
- [ ] User appears in Convex dashboard users table
- [ ] Build succeeds: `npm run build`
- [ ] Admin can create a call and see it listed under All Calls
- [ ] Non-admin sees only open calls under `/dashboard/calls`

## Next Testing Phase

When Phase 2 is implemented, test:
- Creating funding calls (admin)
- Browsing available calls (faculty)
- Submitting proposals
- Evaluator assignment
- Evaluation workflow

## Troubleshooting Commands

```bash
# Check if all dependencies are installed
npm install

# Build the project to check for errors
npm run build

# Clear Next.js cache
rm -rf .next

# Check Convex deployment status
npx convex dev --once

# View Convex logs
# (Check Terminal 1 where convex dev is running)

# Run linting
npm run lint
```

## Report Issues

If you find bugs or unexpected behavior:

1. Check browser console for errors
2. Check Terminal 1 (Convex) for backend errors
3. Check Terminal 2 (Next.js) for frontend errors
4. Note your steps to reproduce
5. Document expected vs actual behavior

## Test Data

You can create test users with these roles:

```
Email: admin@test.com | Role: admin | Password: admin123
Email: faculty1@test.com | Role: faculty | Password: faculty123
Email: evaluator1@test.com | Role: evaluator | Password: eval123
Email: finance1@test.com | Role: finance | Password: finance123
```

Remember to actually register these through the UI to create them in the database!
