# Morning Coffee — Daily Candidate Report

A daily recruiting digest webapp that pulls candidate pipeline data from Greenhouse and presents it as a morning briefing for your recruiting team.

## What it does

- Fetches active candidates across all open roles from Greenhouse
- Displays a prioritised daily report with candidate summaries, stage progress, and recommended actions
- AI-powered candidate analysis via Supabase Edge Functions + Anthropic Claude
- Authentication-gated — team access only, with admin-managed allow list

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (database, auth, edge functions)
- **Integrations:** Greenhouse ATS API

## Getting started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project
- Greenhouse Harvest API key
- Anthropic API key (for AI candidate analysis)

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
# Edit .env with your Supabase credentials, then set Greenhouse and Anthropic
# secrets as Supabase Edge Function secrets (see Environment variables below)

# Start the dev server
npm run dev
```

### Environment variables

See `.env.example` for the full list. Frontend variables go in `.env`. The rest are set as Supabase Edge Function secrets:

```bash
supabase secrets set GREENHOUSE_API_KEY=your-key
supabase secrets set GREENHOUSE_USER_ID=your-user-id
supabase secrets set ANTHROPIC_API_KEY=your-key
supabase secrets set GH_REJECTION_REASON_ID_STANDARD=your-id
supabase secrets set GH_REJECTION_REASON_ID_SPAM=your-id
supabase secrets set GH_REJECTION_EMAIL_TEMPLATE_ID=your-id
```

Rejection reason and template IDs are unique to your Greenhouse instance — see `.env.example` for instructions on finding them.

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

## Project structure

```
src/
├── components/
│   ├── coffee/       # App-specific components
│   └── ui/           # shadcn/ui component library
├── hooks/            # Custom React hooks
├── integrations/     # Supabase client + types
├── lib/              # Utilities, types, data logic
└── pages/            # Route-level page components
supabase/
├── functions/        # Edge functions
└── migrations/       # Database migrations
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests
npm run lint       # Lint
```
