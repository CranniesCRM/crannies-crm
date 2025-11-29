# Crannies - Collaborative CRM Platform

## Overview
Crannies is a collaborative CRM platform that combines HubSpot's CRM functionality with GitHub's issue tracking approach. It allows teams to manage deals and contacts as issues, with full @mentions, file attachments, and publishable chat rooms for client collaboration.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL (Neon-backed via Drizzle ORM)
- **Authentication**: Replit Auth (OpenID Connect)
- **Email**: Resend for invitations
- **State Management**: TanStack Query

## Project Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── ui/          # shadcn components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   └── use-toast.ts
│   │   ├── lib/             # Utility libraries
│   │   │   └── queryClient.ts
│   │   ├── pages/           # Route pages
│   │   │   ├── landing.tsx
│   │   │   ├── onboarding.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── issues-list.tsx
│   │   │   ├── issue-detail.tsx
│   │   │   ├── issue-new.tsx
│   │   │   ├── team.tsx
│   │   │   ├── settings.tsx
│   │   │   └── public-chat.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── index.html
├── server/                  # Express backend
│   ├── db.ts               # Drizzle database connection
│   ├── storage.ts          # Data access layer
│   ├── routes.ts           # API routes
│   ├── replitAuth.ts       # Authentication setup
│   ├── resend.ts           # Email integration
│   ├── index.ts            # Server entry point
│   └── vite.ts             # Vite dev server integration
├── shared/                  # Shared types
│   └── schema.ts           # Drizzle schema + types
└── attached_assets/         # Brand assets
    └── *.png               # Logo files
```

## Key Features

### Authentication
- Replit Auth integration with OpenID Connect
- Session management with PostgreSQL-backed sessions
- Admin-based invite system for team members

### Issues (CRM Deals)
- GitHub-style issue tracking for deals/contacts
- Status tracking: Open, Closed, Won, Lost
- Contact information and deal value tracking
- Labels and assignee management
- @mentions in comments
- File attachments

### Published Chat Rooms
- Passcode-protected public chat rooms
- Real-time messaging with clients
- Pulsating green dot indicator when published
- Email invitations via Resend

### Onboarding
8-step comprehensive onboarding flow:
1. Welcome screen
2. Profile picture upload
3. Personal details (name)
4. Role selection
5. Team selection
6. Company name (admins only)
7. Company details (admins only)
8. Completion

## Database Schema

Key tables:
- `users` - Team members with roles and workspace assignment
- `workspaces` - Company/organization containers
- `issues` - Deals/contacts tracked as issues
- `comments` - Discussion threads on issues
- `invites` - Pending team invitations
- `activities` - Audit log for issue actions
- `sessions` - Authentication sessions

## API Routes

### Auth
- `GET /api/login` - Initiate login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Logout
- `GET /api/auth/user` - Get current user

### Issues
- `GET /api/issues` - List workspace issues
- `GET /api/issues/:id` - Get issue details
- `POST /api/issues` - Create new issue
- `PATCH /api/issues/:id` - Update issue
- `POST /api/issues/:id/comments` - Add comment
- `POST /api/issues/:id/publish` - Publish to client
- `POST /api/issues/:id/unpublish` - Unpublish

### Team
- `GET /api/team` - List team members
- `POST /api/invites` - Send invitation
- `GET /api/invites` - List pending invites
- `DELETE /api/invites/:id` - Cancel invite

### Public Chat
- `GET /api/chat/:slug/auth-check` - Check chat auth
- `POST /api/chat/:slug/verify` - Verify passcode
- `GET /api/chat/:slug` - Get chat data
- `POST /api/chat/:slug/message` - Send message

## Development

```bash
# Start development server
npm run dev

# Push database schema changes
npm run db:push

# Build for production
npm run build
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `ISSUER_URL` - Replit OIDC issuer
- `REPL_ID` - Replit application ID
- Resend API key configured via Replit connectors
