"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { BriefcaseBusiness, CircleHelp, Inbox, LayoutDashboard, Link2, ListTodo, Search, Settings, SlidersHorizontal, UsersRound } from "lucide-react";
import Link from "next/link";
import styles from "./dashboard.module.css";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useUser();
  const firstName = user?.firstName ?? user?.username ?? "Personal";
  const workspaceLabel = `${firstName}'s workspace`;

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <Link className={styles.workspaceIdentity} href="/">
          <span className={styles.workspaceAvatar}>{firstName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{workspaceLabel}</strong><small>Personal team</small></div>
          <SlidersHorizontal className={styles.collapseButton} aria-hidden="true" />
        </Link>
        <label className={styles.search}><Search size={14} /><input placeholder="Search..." aria-label="Search dashboard" /></label>
        <nav aria-label="Dashboard navigation">
          <a className={styles.active} href="#overview"><LayoutDashboard className={styles.navIcon} /> Dashboard</a>
          <a href="#inbox"><Inbox className={styles.navIcon} /> Inbox</a>
          <a href="#tasks"><ListTodo className={styles.navIcon} /> Tasks</a>
          <a href="#timeline"><BriefcaseBusiness className={styles.navIcon} /> Timeline</a>
          <a href="#integrations"><Link2 className={styles.navIcon} /> Integrations</a>
          <a href="#members"><UsersRound className={styles.navIcon} /> Team Members</a>
        </nav>
        <nav className={styles.utilityNav} aria-label="Utility navigation">
          <a href="#support"><CircleHelp className={styles.navIcon} /> Help &amp; Support</a>
          <a href="#settings"><Settings className={styles.navIcon} /> Settings</a>
        </nav>
        <div className={styles.sidebarBottom}><span className={styles.liveDot} />Systems operational</div>
      </aside>
      <section className={styles.main}>
        <header className={styles.headerActions}><button className={styles.iconButton} aria-label="Notifications"><Inbox size={18} /></button><UserButton /></header>
        {children}
      </section>
    </main>
  );
}
