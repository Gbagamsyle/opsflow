"use client";

import { useUser } from "@clerk/nextjs";
import {
  BriefcaseBusiness,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  Link2,
  ListTodo,
  Search,
  Settings,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useUser();
  const pathname = usePathname();
  const activeTab: string = pathname === "/dashboard"
    ? "dashboard"
    : pathname.startsWith("/dashboard/projects")
      ? "projects"
      : pathname.startsWith("/dashboard/tasks")
        ? "tasks"
        : pathname.startsWith("/dashboard/team")
          ? "team"
        : "dashboard";
  const firstName = user?.firstName ?? user?.username ?? "Personal";
  const workspaceLabel = `${firstName}'s Workspace`;

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar} aria-label="Sidebar navigation">
        <Link className={styles.workspaceIdentity} href="/" title="Manage or switch workspaces">
          <span className={styles.workspaceAvatar}>{firstName.slice(0, 1).toUpperCase()}</span>
          <div className={styles.workspaceInfo}>
            <strong>{workspaceLabel}</strong>
            <small>Operations Space</small>
          </div>
          <SlidersHorizontal size={14} className={styles.collapseButton} aria-hidden="true" />
        </Link>

        <label className={styles.search}>
          <Search size={14} aria-hidden="true" />
          <input placeholder="Jump to anywhere..." aria-label="Quick search" />
        </label>

        <nav aria-label="Workspace views">
          <Link
            className={`${styles.navItem} ${activeTab === "dashboard" ? styles.navItemActive : ""}`}
            href="/dashboard"
          >
            <LayoutDashboard className={styles.navIcon} aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link
            className={`${styles.navItem} ${activeTab === "projects" ? styles.navItemActive : ""}`}
            href="/dashboard/projects"
          >
            <FolderKanban className={styles.navIcon} aria-hidden="true" />
            <span>Projects</span>
          </Link>
          <Link
            className={`${styles.navItem} ${activeTab === "tasks" ? styles.navItemActive : ""}`}
            href="/dashboard/tasks"
          >
            <ListTodo className={styles.navIcon} aria-hidden="true" />
            <span>Tasks</span>
          </Link>
          <Link
            className={`${styles.navItem} ${activeTab === "team" ? styles.navItemActive : ""}`}
            href="/dashboard/team"
          >
            <UsersRound className={styles.navIcon} aria-hidden="true" />
            <span>Team</span>
          </Link>
        </nav>

        <nav className={styles.utilityNav} aria-label="Settings and help">
          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "timeline" ? styles.navItemActive : ""}`}
          >
            <BriefcaseBusiness className={styles.navIcon} aria-hidden="true" />
            <span>Timeline</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "integrations" ? styles.navItemActive : ""}`}
          >
            <Link2 className={styles.navIcon} aria-hidden="true" />
            <span>Integrations</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "support" ? styles.navItemActive : ""}`}
          >
            <CircleHelp className={styles.navIcon} aria-hidden="true" />
            <span>Help &amp; Docs</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "settings" ? styles.navItemActive : ""}`}
          >
            <Settings className={styles.navIcon} aria-hidden="true" />
            <span>Settings</span>
          </button>
        </nav>

        <div className={styles.sidebarBottom}>
          <span className={styles.liveDot} />
          <span>All systems operational</span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.container}>{children}</div>
      </main>
    </div>
  );
}
