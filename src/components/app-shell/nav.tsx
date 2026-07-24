import type { ReactNode } from "react";

/* =========================================================================
   Single source of truth for navigation + page headers.
   Every existing route is represented here so nothing is lost in the revamp.
   ========================================================================= */

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** marks screens backed by demo/placeholder data */
  demo?: boolean;
  /** if set, only these roles see the item (undefined = everyone) */
  roles?: string[];
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

/* ---- compact EY-style line icons (18px, stroke=currentColor) ---- */
const s = { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;

const IconDashboard = (
  <svg {...s}><rect x="2" y="2" width="5.5" height="5.5" /><rect x="10.5" y="2" width="5.5" height="5.5" /><rect x="2" y="10.5" width="5.5" height="5.5" /><rect x="10.5" y="10.5" width="5.5" height="5.5" /></svg>
);
const IconFrameworks = (
  <svg {...s}><path d="M9 1.5 L16.5 5.5 L9 9.5 L1.5 5.5 Z" /><path d="M1.5 9 L9 13 L16.5 9" /><path d="M1.5 12.5 L9 16.5 L16.5 12.5" /></svg>
);
const IconMapping = (
  <svg {...s}><rect x="2" y="2.5" width="4.5" height="4.5" /><rect x="11.5" y="11" width="4.5" height="4.5" /><path d="M6.5 4.75 H10 a3 3 0 0 1 3 3 V11" /><path d="M11.5 13.25 H8 a3 3 0 0 1-3-3 V7" /></svg>
);
const IconApplications = (
  <svg {...s}><rect x="2" y="3" width="14" height="10" rx="1" /><path d="M6 16 H12 M9 13 v3" /></svg>
);
const IconRegulation = (
  <svg {...s}><path d="M9 1.5 V4" /><rect x="3" y="4" width="12" height="12.5" /><line x1="6" y1="8" x2="12" y2="8" /><line x1="6" y1="11" x2="12" y2="11" /><line x1="6" y1="14" x2="9.5" y2="14" /></svg>
);
const IconSoc = (
  <svg {...s}><path d="M9 1.8 L15.5 4.3 V8.5 C15.5 12.5 12.7 15 9 16.2 C5.3 15 2.5 12.5 2.5 8.5 V4.3 Z" /><path d="M6.3 8.7 l1.9 1.9 L12 6.8" /></svg>
);
const IconAutomation = (
  <svg {...s}><circle cx="9" cy="9" r="2.4" /><path d="M9 1.8 V4 M9 14 V16.2 M1.8 9 H4 M14 9 H16.2 M3.9 3.9 l1.6 1.6 M12.5 12.5 l1.6 1.6 M14.1 3.9 l-1.6 1.6 M5.5 12.5 l-1.6 1.6" /></svg>
);
const IconCapabilities = (
  <svg {...s}><path d="M13 1.8 L3.5 10.5 H9 L8 16.2 L14.5 7 H9 Z" /></svg>
);
const IconIntegrations = (
  <svg {...s}><rect x="2.5" y="2.5" width="5" height="5" /><rect x="10.5" y="10.5" width="5" height="5" /><path d="M7.5 5 H11 a3 3 0 0 1 3 3 V10.5" /></svg>
);
const IconSettings = (
  <svg {...s}><line x1="2.5" y1="5" x2="15.5" y2="5" /><rect x="10" y="3" width="3" height="4" /><line x1="2.5" y1="11" x2="15.5" y2="11" /><rect x="5" y="9" width="3" height="4" /></svg>
);

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/overview", label: "Dashboard", icon: IconDashboard },
      { href: "/frameworks", label: "Frameworks & controls", icon: IconFrameworks },
      { href: "/framework", label: "Compliance mapping", icon: IconMapping },
      { href: "/applications", label: "Applications", icon: IconApplications },
    ],
  },
  {
    label: "Capabilities",
    items: [
      { href: "/framework-workbench", label: "Regulation explorer", icon: IconRegulation },
      { href: "/soc", label: "SOC mapper", icon: IconSoc },
      { href: "/automation", label: "Automation", icon: IconAutomation },
      { href: "/landing", label: "Capabilities hub", icon: IconCapabilities },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/integrations", label: "Integrations", icon: IconIntegrations, roles: ["admin", "compliance_lead"] },
      { href: "/settings", label: "Settings", icon: IconSettings, roles: ["admin"] },
    ],
  },
];

/** Nav groups visible to a given role — items are filtered and empty groups dropped. */
export function visibleNavGroups(role?: string): NavGroup[] {
  const r = role || "viewer";
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(r)) }))
    .filter((g) => g.items.length > 0);
}

/* ---- page header meta (title + subtitle) keyed by route ---- */
const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/overview": { title: "Compliance overview", sub: "Real-time posture across all active frameworks" },
  "/frameworks": { title: "Frameworks & controls", sub: "Baseline frameworks and the controls mapped to them" },
  "/framework": { title: "Compliance mapping", sub: "AI-mapped coverage between internal controls and standards" },
  "/applications": { title: "Applications", sub: "Application portfolio and control assessments" },
  "/framework-workbench": { title: "Regulation explorer", sub: "Regulatory requirements and suggested controls" },
  "/soc": { title: "SOC mapper", sub: "Map SOC reports to your master framework" },
  "/automation": { title: "Automation", sub: "Automated control testing and evidence" },
  "/landing": { title: "Capabilities", sub: "Platform capabilities and modules" },
  "/integrations": { title: "Integrations", sub: "Connected security tools and data sources" },
  "/settings": { title: "Settings", sub: "Organization, integrations and access" },
};

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function pageMeta(pathname: string): { title: string; sub: string } {
  // exact match first, then longest prefix match (for nested routes like /applications/[id])
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const match = ALL_ITEMS
    .filter((i) => isActive(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return (match && PAGE_META[match.href]) || { title: "AutoGRC", sub: "Automated assurance platform" };
}
