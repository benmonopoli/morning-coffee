# Morning Coffee — Daily Candidate Report

A daily recruiting digest that pulls candidate pipeline data from Greenhouse and presents it as a morning briefing for your recruiting team.

## What it does

Each morning, Morning Coffee fetches your active pipeline from Greenhouse and runs every candidate through an AI analysis — surfacing the ones that need attention, flagging concerns, and recommending a next action. The result is a single, prioritised report your team can work through in one sitting rather than clicking around an ATS.

- **AI candidate analysis** — each candidate is scored and summarised with strengths, concerns, and a recommended action (advance, reject, needs review)
- **Batch actions** — advance or reject candidates directly from the report without going back to Greenhouse
- **Past reports** — all previous reports are stored and browsable
- **Team access** — authentication-gated with an admin-managed allow list

## How the AI analysis works

The `analyze-candidate` edge function sends each candidate's screening answers, role context, and source to Claude (Anthropic). The prompt instructs the model to act as a senior recruiter reviewing an application — assessing fit against the role, flagging red flags in screening answers, and recommending an action.

The analysis prompt lives in `src/lib/candidate-logic.ts` (`ANALYSIS_PROMPT`). You can edit it to match how your team evaluates candidates — for example, adding criteria specific to your hiring bar, adjusting how it handles location mismatches, or adding role-type-specific signals.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (database, auth, edge functions)
- **AI:** Anthropic Claude via Supabase Edge Functions
- **Integrations:** Greenhouse Harvest API

## Getting started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project
- Greenhouse Harvest API key
- Anthropic API key

### Setup

```bash
# Clone the repo
git clone https://github.com/benmonopoli/morning-coffee.git
cd morning-coffee

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### Environment variables

Frontend variables go in `.env` (see `.env.example`). The following are set as Supabase Edge Function secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=your-key
supabase secrets set GREENHOUSE_API_KEY=your-key
supabase secrets set GREENHOUSE_USER_ID=your-user-id

# Rejection config — IDs are unique to your Greenhouse instance
# Find them in Greenhouse → Configure → Custom Options → Rejection Reasons
# and Configure → Email Templates
supabase secrets set GH_REJECTION_REASON_ID_STANDARD=your-id
supabase secrets set GH_REJECTION_REASON_ID_SPAM=your-id
supabase secrets set GH_REJECTION_EMAIL_TEMPLATE_ID=your-id
```

### Deploy Supabase functions

```bash
supabase functions deploy analyze-candidate
supabase functions deploy batch-action
supabase functions deploy fetch-candidates
supabase functions deploy fetch-jobs
```

### Run database migrations

```bash
supabase db push
```

### User management

Morning Coffee uses an allow list — users can sign up but only approved email addresses can access the app. Manage approved users in the Supabase dashboard via the `allowed_users` table, or through the admin panel in the app.

## Project structure

```
src/
├── components/
│   ├── coffee/       # App-specific components (report view, candidate rows, etc.)
│   └── ui/           # shadcn/ui component library
├── hooks/            # Custom React hooks
├── integrations/     # Supabase client + types
├── lib/              # Utilities, types, candidate logic, AI prompt
└── pages/            # Route-level page components
supabase/
├── functions/
│   ├── analyze-candidate/   # AI analysis — runs per candidate, returns scoring + recommendation
│   ├── batch-action/        # Advance or reject candidates in Greenhouse
│   ├── fetch-candidates/    # Pulls active applications from Greenhouse
│   └── fetch-jobs/          # Fetches open roles
└── migrations/              # Database schema
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests
npm run lint       # Lint
```
