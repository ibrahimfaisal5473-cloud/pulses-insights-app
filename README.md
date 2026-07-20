# Pulses Insights

Pulses Insights is a visitor intelligence dashboard developed as part of the Phase 2 application development assignment during the Pulses.ai internship process.

The application is inspired by the Emirates Insights dashboard and recreates the experience of an enterprise analytics platform using modern web technologies. It provides an interactive environment for monitoring visitor behaviour, occupancy trends, visitor journeys, and overall engagement through a collection of dashboards, charts, KPI cards, and data visualizations.

The project is powered entirely by a mock backend built with Next.js API Routes. No real database or production data is used—all analytics displayed throughout the application are generated from realistic mock datasets designed to simulate a live visitor intelligence system.

---

# Project Goals

The primary objectives of this project were to:

- Build a production-style analytics dashboard from scratch.
- Design a scalable and maintainable application architecture.
- Implement secure mock authentication.
- Create a reusable component library.
- Emulate a backend using Next.js API Routes.
- Display realistic analytics using independently fetched mock data.
- Deliver a responsive user interface inspired by the Emirates Insights dashboard.

---

# Features

## Authentication

- Secure login page
- Username/password authentication
- Session stored using httpOnly cookies
- Protected dashboard routes
- Automatic redirects for authenticated and unauthenticated users
- Logout functionality

---

## Support

A help page reachable from the login screen, so a user who cannot sign in can
still report the problem without needing an account.

- Reachable before authentication
- Email, phone number and issue description
- Validated on the server, with field-level error messages
- Returns a short reference number the user can quote when following up

In keeping with the rest of the project, the intake is mocked: the request is
recorded and acknowledged rather than sent to a real ticketing system.

---

## Reporting and Export

Every widget can be exported on its own, and any dashboard section can be
exported as a complete report.

- Per-widget download menu offering PNG or PDF
- Full multi-section PDF report covering all widgets on the page
- Paginated A4 output, with the title, selected date range and active filters
- Export controls remove themselves from the capture, so they never appear in
  the exported file

---

## Dashboard

The application contains multiple dashboard sections:

### Overview

Provides a high-level summary of visitor activity including:

- KPI cards
- Visitor trends
- Occupancy overview
- Visitor distribution
- Quick performance metrics

### Visitor Analytics

Displays visitor behaviour through detailed charts and statistics including visitor trends and engagement metrics.

### Zone Analytics

Shows how visitors interact across different areas, including occupancy and activity levels for each zone.

### Visitor Journeys

Visualizes visitor movement and behaviour across different stages of their journey through interactive charts and flow visualizations.

### Dissatisfied Visitors

Highlights visitors requiring attention through sentiment and engagement metrics.

---

## Mock Backend

Instead of using a database, the application emulates a backend using Next.js API Routes.

Features include:

- Independent API endpoint for every dashboard widget
- Realistic mock analytics data
- Modular API structure
- Shared TypeScript interfaces
- Reusable API layer
- Independent loading and error states

This architecture closely mirrors how a production analytics platform would separate frontend and backend responsibilities.

---

# Tech Stack

- Next.js 16 (App Router)
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Recharts
- Lucide React
- Next.js API Routes

---

# Project Structure

```
src/
├── app/                  # Pages, layouts and API routes
├── components/           # Reusable UI components
├── hooks/                # Data fetching hooks
├── lib/                  # Shared utilities
│   ├── api/              # Typed fetchers for the API routes
│   ├── auth/             # Session, JWT and route guards
│   ├── export/           # PDF report generation
│   ├── mock/             # Mock analytics data
│   └── services/         # Data layer behind the API routes
├── providers/            # Client-side app providers
├── types/                # Shared TypeScript interfaces
└── config/               # Navigation and application configuration
```

---

# Running the Project

Clone the repository:

```bash
git clone https://github.com/ibrahimfaisal5473-cloud/pulses-insights-app.git
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

Open your browser and navigate to:

```
http://localhost:3000
```

---

# Demo Credentials

```
Username: admin
Password: password123
```

---

# Architecture

The application follows a modular architecture where each dashboard widget is responsible for retrieving its own data through dedicated API endpoints.

This approach keeps the application scalable, reusable, and easy to maintain. Authentication, routing, API communication, reusable components, and shared types are separated into dedicated modules to ensure a clean codebase.

---

# Design

The user interface is heavily inspired by the Emirates Insights dashboard while being implemented from scratch for this project.

The application uses:

- Emirates-inspired colour palette
- Enterprise dashboard layout
- Responsive sidebar navigation
- Sticky header
- Reusable KPI cards
- Interactive charts
- Modern typography
- Responsive design across desktop and mobile devices

---

# AI Assistance

AI tool (Claude) was used throughout development to assist with project planning, architecture design, implementation, debugging, and UI refinement.

A complete log of all major prompts used during development is included in **PROMPTS.md**, as required by the Phase 2 assignment.

---

# Notes

This project was developed solely for the Pulses.ai internship assessment and is intended to demonstrate frontend architecture, dashboard design, authentication, routing, reusable component design, API integration, and modern React development practices.

All analytics data shown within the application is mock data generated for demonstration purposes only and does not represent real visitor information.
