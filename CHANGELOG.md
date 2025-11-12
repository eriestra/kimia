# Changelog

All notable changes to the Kimia Innovation Management Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Tessellation animated background system with Delaunay triangulation
- TessellationBackground component for reusable animated backgrounds
- TessellationHeader component for dashboard section headers
- Color-shifting gradients with 14-color palette (5.5s transitions)
- Grainy texture overlay for visual depth
- Card-based layout for review proposals page
- Evaluator search and assignment functionality in review dashboard
- User search functionality with role filtering

### Changed
- Converted review proposals page from table to card layout
- Updated all dashboard headers to use tessellation effect
- Landing page now has fixed tessellation background
- Improved UI consistency across all dashboard pages

### Fixed
- Convex query skip mode (changed `undefined` to `"skip"`)
- React Hooks order violations in ProposalReviewClient component
- All TypeScript diagnostics errors resolved

## [0.1.0] - 2025-10-28

### Added
- Complete call management system
  - 7-step wizard for creating funding calls
  - Call listing with role-based filtering
  - Public call detail pages with 8 tabs (Overview, Eligibility, Timeline, Criteria, Budget, Resources, Documents, FAQs)
  - Admin status controls (draft/open/closed/archived dropdown)
  - Call FAQs with CRUD operations
  - Bookmark functionality for users
  - Deadline countdown and lifecycle phase indicators

- Comprehensive proposal system
  - Multi-step proposal submission wizard (6 steps)
  - Draft auto-save functionality
  - Budget builder with line-item breakdown
  - Timeline/milestone planning
  - Team member management (pending invites)
  - My Proposals dashboard with beautiful card layout
  - Status tracking (draft → submitted → under_review → approved/rejected)

- Review & evaluation workspace
  - Review dashboard for evaluators and admins
  - List proposals assigned for review
  - Individual proposal review page with tabs
  - Status filtering (submitted, under_review, approved, rejected)
  - Foundation for scoring rubrics (Phase 2)

- User experience enhancements
  - Profile settings page with full CRUD (campus, department, research areas, ORCID, phone, notification prefs)
  - User guide page rendered from userManual.md
  - Consistent card-based UI design across all pages
  - Enhanced landing page with gradient animations
  - Updated branding (new logos)
  - Mobile-responsive layouts throughout

### Technical Implementation
- **Backend (Convex)**
  - calls.ts: 692 lines - CRUD for calls, FAQs, bookmarks
  - proposals.ts: 460 lines - Draft persistence, submission workflow
  - users.ts: User search and management functions
  - Extended schema with calls, proposals, bookmarks, callFaqs tables
  - Type-safe mutations and queries with role-based access control

- **Frontend (Next.js + React)**
  - 13 pages total (landing, auth, dashboard, calls, proposals, review, settings, guide)
  - 10,000+ lines of TypeScript/React code
  - Lucide icons throughout for consistency
  - Tailwind CSS v4 for styling
  - Fixed React Hooks violations for stable rendering

- **DevOps**
  - Convex dev workflow with telemetry disabled (CONVEX_TELEMETRY_DISABLED=1)
  - Build passing with all TypeScript errors resolved
  - Hot reload working for both frontend and backend

### Progress Metrics
- Phase 1: 78% complete (was 35% at start of day)
- Code written: ~10,000 lines total (frontend + backend)
- Pages created: 13 functional pages
- Development time: 2 days (Oct 27-28)

## [0.0.1] - 2025-10-27

### Added
- Initial project setup with Next.js 16 and Convex
- Convex Auth integration with official React support
- User authentication (email/password)
- Role-based access control (6 roles: sysadmin, admin, evaluator, faculty, finance, observer)
- Protected routes and dashboard
- Basic database schema (users, userProfiles, calls, proposals)

### Technical Stack
- Next.js 16 (App Router) with React 19
- Convex Backend as a Service
- Convex Auth for authentication
- Tailwind CSS v4
- TypeScript throughout
- Lucide React for icons

---

## Legend
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities
