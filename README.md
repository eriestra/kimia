# Kimia Innovation Management Platform

**Kimia** - From Mapudungun "kim": "to know," "I know how to do it"

---

Comprehensive digital platform for managing the complete lifecycle of educational innovation and research projects at educational institutions.

## Built with Claude Code

This project was **fully built using [Claude Code](https://claude.com/code)**, Anthropic's official CLI tool for AI-assisted software development. From architecture design to implementation, Claude Code enabled rapid development of this enterprise-grade platform with best practices baked in.

### Quick Start with /init

If you have Claude Code installed, you can initialize and start the project with a single command:

```bash
claude /init
```

This will automatically:
- Install all dependencies
- Set up the Convex development environment
- Start both the Convex backend and Next.js frontend
- Open the application at http://localhost:3000

For manual setup, see instructions below.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19
- **Backend**: Convex (Backend as a Service)
- **Authentication**: Convex Auth (official React support)
- **AI Integration**: OpenRouter (GPT-4o, Claude 3.5 Sonnet, Mixtral)
- **Styling**: Tailwind CSS v4

## Getting Started

### Prerequisites

- Node.js 20+ or 22+ or 24+
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in `.env`:

```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3000
```

4. Start the Convex development server (in a separate terminal):

```bash
npx convex dev
```

5. Start the Next.js development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Development Commands

### ⚠️ CRITICAL WARNING ⚠️

**NEVER use `npx convex deploy` during development!**

- ✅ `npx convex dev` → Deploys to **DEV** environment
- ❌ `npx convex deploy` → Deploys to **PRODUCTION** environment

**Always use the DEV command during development!**

```bash
# Development (use these)
npx convex dev       # Start Convex DEV backend - ALWAYS USE THIS
npm run dev          # Start Next.js dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # ESLint checking

# Production (only when ready to deploy)
npx convex deploy    # Deploy to PRODUCTION - DO NOT USE IN DEVELOPMENT!
```

## Project Structure

```
/app
  /auth              # Authentication pages
    /login           # Sign in page
    /register        # User registration
  /dashboard         # Protected dashboard
    /calls           # Funding call management (admin + public view)
      /new           # Multi-step wizard for creating calls
  ConvexClientProvider.tsx  # Convex Auth wrapper
  layout.tsx         # Root layout with providers
  page.tsx           # Landing page
  globals.css        # Global styles with Tailwind
/convex
  auth.ts            # Authentication configuration
  calls.ts           # Call lifecycle queries and mutations
  users.ts           # User queries and mutations
  schema.ts          # Database schema definitions
  http.ts            # HTTP routes for auth
```

## Documentation

- **AGENTS.md**: Repository guidelines and development conventions
- **TESTING.md**: Testing strategy and guidelines
- **CHANGELOG.md**: Version history and change tracking

## Project Status

**Current Phase**: Phase 1 - Foundation (Month 1-2)

**Completed:**
- ✅ Project setup with Next.js + Convex (Oct 28, 2025)
- ✅ Authentication system with Convex Auth
- ✅ Role-based access control (6 roles)
- ✅ Protected routes and dashboard
- ✅ Funding call management MVP (admin creation + status controls)
- ✅ Proposal drafting wizard with autosave and submission flow
- ✅ Reviewer dashboard for admins/evaluators with proposal summaries
- ✅ Proposal wizard now supports team invites and document uploads
- ✅ Reviewer view includes evaluator assignment controls and evaluation tab scaffold
- ✅ Profile settings polished with inline validation and feedback

**Next Steps:**
- Implement evaluator scoring form powered by call-specific rubrics
- Add preview/download affordances and cleanup for uploaded proposal documents
- Introduce notification stubs for assignments and submissions

## License

MIT License
