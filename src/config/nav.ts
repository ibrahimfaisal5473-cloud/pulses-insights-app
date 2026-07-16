/**
 * Dashboard navigation config.
 *
 * `icon` is a Lucide icon name (resolved to a component in the sidebar layer)
 * so this stays a plain data module. Routes are wired up as their pages are
 * implemented in later milestones.
 */
export type NavItem = {
  title: string;
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { title: "Overview", href: "/", icon: "LayoutDashboard" },
  { title: "Visits & Happiness", href: "/visits", icon: "BarChart3" },
  { title: "Zone Analytics", href: "/zones", icon: "Layers" },
  { title: "Journeys", href: "/journeys", icon: "Route" },
  { title: "Dissatisfied Visitors", href: "/dissatisfied", icon: "Frown" },
];
