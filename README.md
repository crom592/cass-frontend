# TARDIS CASS Frontend - Charger After-Service System

Vue.js 3 frontend for the TARDIS CASS (Charger After-Service System).

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: Vue Router
- **State Management**: Pinia
- **HTTP Client**: Axios
- **UI Notifications**: vue3-toastify

## Project Structure

```
frontend/
├── src/
│   ├── assets/          # Static assets and global styles
│   ├── components/      # Reusable components
│   ├── router/          # Vue Router configuration
│   ├── services/        # API client and services
│   ├── stores/          # Pinia stores
│   ├── types/           # TypeScript type definitions
│   ├── views/           # Page components
│   ├── App.vue          # Root component
│   └── main.ts          # Application entry point
├── public/              # Public static assets
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local` and set:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server

```bash
npm run dev
```

Access at: http://localhost:3000

### 4. Build for Production

```bash
npm run build
```

Output: `dist/` directory

## Features

### Authentication
- JWT-based login
- Token stored in localStorage
- Automatic token injection in API requests
- Route guards for protected pages

### Role-Based Access
- Different views for different roles:
  - Admin / Tenant Admin: Full access
  - Call Center: Ticket creation and viewing
  - AS Manager: Ticket management, assignment, reports
  - AS Engineer: My work portal, worklog entry
  - Viewer: Read-only access

### Ticket Management
- Ticket list with filters
- Ticket creation form
- Ticket detail with timeline
- Status change tracking
- CSMS integration panel
- File attachments

### CSMS Integration
- Read-only charger status display
- Event history visualization
- Firmware job status tracking
- No control functions (managed in CSMS)

### Reports
- Date range filtering
- Summary statistics
- CSV export

## Key Views

- **LoginView**: User authentication
- **DashboardView**: Summary cards and quick actions
- **TicketListView**: Filterable ticket list (TODO)
- **TicketDetailView**: Ticket detail with timeline and CSMS panel (TODO)
- **TicketCreateView**: New ticket form (TODO)
- **MyWorkView**: AS Engineer portal (TODO)
- **ReportsView**: Report generation and export (TODO)

## Components

- **Navbar**: Main navigation with role-based menu items

## API Client

All API communication is handled through `src/services/api.ts`:
- Centralized Axios instance
- Automatic auth token injection
- Global error handling
- Type-safe API methods

## State Management

- **authStore**: User authentication and profile

## Development

### Type Checking

```bash
npm run build
```

This runs `vue-tsc` for TypeScript checking before build.

### Linting

```bash
npm run lint
```

## Deployment

Build the production bundle and serve via Nginx or similar:

```bash
npm run build
```

Or use Docker:

```bash
docker build -t cass-frontend .
docker run -p 3000:3000 cass-frontend
```

## TODO / Future Enhancements

- [ ] Complete TicketListView with filters and pagination
- [ ] Complete TicketDetailView with timeline and CSMS panel
- [ ] Complete TicketCreateView with site/charger selection
- [ ] Complete MyWorkView for AS engineers
- [ ] Complete ReportsView with charts
- [ ] Add unit tests (Vitest)
- [ ] Add E2E tests (Playwright)
- [ ] Implement real-time updates (SSE/WebSocket)
- [ ] Add internationalization (i18n)
- [ ] Improve mobile responsiveness
