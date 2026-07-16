/**
 * Dashboard navigation config.
 *
 * `icon` is a Lucide icon name (resolved to a component in the sidebar layer)
 * so this stays a plain data module usable from server and client code.
 */
export type NavItem = {
  title: string;
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { title: "Overview", href: "/", icon: "LayoutDashboard" },
  { title: "Visitor Analytics", href: "/visitors", icon: "Users" },
  { title: "Zone Analytics", href: "/zones", icon: "Layers" },
  { title: "Visitor Journeys", href: "/journeys", icon: "Route" },
  { title: "Dissatisfied Visitors", href: "/dissatisfied", icon: "Frown" },
];
