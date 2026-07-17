# Pulses Insights

Pulses Insights is a visitor intelligence dashboard built as part of the Phase 2 application development assignment. The application is inspired by the Emirates Insights dashboard and provides an interactive analytics platform for monitoring visitor activity through KPI cards, charts, tables, and journey visualizations.

## Features

- Secure login with mock authentication
- Responsive dashboard layout
- Overview dashboard with KPI cards and analytics
- Visitor Analytics
- Zone Analytics
- Visitor Journeys
- Dissatisfied Visitors
- Mock backend using Next.js API routes
- Realistic mock analytics data
- Independent API endpoints for each dashboard widget
- Loading and error states
- Emirates-inspired UI and responsive design

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Recharts

## Getting Started

Clone the repository:

```bash
git clone <repository-url>
cd pulses-insights-app
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Demo Credentials

Username: `admin`

Password: `password123`

## Project Structure

```
src/
├── app/              # App Router pages, layouts and API routes
├── components/       # Reusable UI components
├── config/           # Navigation and application configuration
├── hooks/            # Custom React hooks
├── lib/              # Authentication, API utilities and helpers
├── types/            # Shared TypeScript interfaces
└── data/             # Mock analytics data
```

## Architecture

The application uses a mock backend built with Next.js API routes. Each dashboard widget retrieves its data independently from its own endpoint, allowing components to remain modular and reusable. Authentication is implemented using secure httpOnly cookies, and all dashboard routes are protected.

## AI Assistance

AI tools (Claude and ChatGPT) were used to assist with planning, implementation, debugging, and UI refinement. A complete log of prompts used during development is available in `PROMPTS.md`.
