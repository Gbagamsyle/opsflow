"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FolderKanban,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type Organization = { id: string; name: string; slug: string; plan?: string };
type Project = { id: string; name: string; status: string; dueDate?: string | null; client?: { name: string } | null };
type Client = { id: string; name: string; companyName?: string | null; status: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Dashboard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void (async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const organizationResponse = await fetch(`${API_URL}/organizations`, { headers });
      const organizationBody = await organizationResponse.json().catch(() => null);
      if (!organizationResponse.ok) throw new Error(organizationBody?.message ?? "We could not load your workspace.");
      setOrganizations(organizationBody);
      const organization = organizationBody[0] as Organization | undefined;
      if (organization) {
        const [projectResponse, clientResponse] = await Promise.all([
          fetch(`${API_URL}/organizations/${organization.id}/projects`, { headers }),
          fetch(`${API_URL}/organizations/${organization.id}/clients`, { headers }),
        ]);
        const [projectBody, clientBody] = await Promise.all([
          projectResponse.json().catch(() => null),
          clientResponse.json().catch(() => null),
        ]);
        if (!projectResponse.ok) throw new Error(projectBody?.message ?? "We could not load your projects.");
        if (!clientResponse.ok) throw new Error(clientBody?.message ?? "We could not load your clients.");
        setProjects(projectBody);
        setClients(clientBody);
      }
      setLoading(false);
    })().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
      setLoading(false);
    });
  }, [getToken, isLoaded, isSignedIn]);

  const activeProjects = useMemo(() => projects.filter((project) => project.status !== "COMPLETED"), [projects]);
  const workspace = organizations[0];
  const firstName = user?.firstName ?? "there";

  if (!isLoaded || (isSignedIn && loading)) return null;
  if (!isSignedIn) return <div className={styles.loadingState}><Link href="/auth">Sign in to continue</Link></div>;

  return <>
    <header className={styles.dashboardHeader}><div><p className={styles.overline}>Thursday, September 3, 2026 <span className={styles.headerDot}>•</span> Week 36</p><h1>Good morning, {firstName}.</h1></div><Link className={styles.primaryAction} href="/"><Plus size={16} aria-hidden="true" /> New project</Link></header>
    <div className={styles.workspaceBar}><div><span className={styles.workspaceMark}>{workspace?.name.slice(0, 1).toUpperCase() ?? "O"}</span><div><strong>{workspace?.name ?? "Your workspace"}</strong><small>{workspace?.plan ?? "FREE"} plan</small></div><ChevronDown size={15} aria-hidden="true" /></div><Link href="/">Switch workspace <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    {error ? <p className={styles.error} role="alert">{error}</p> : <>
      <section className={styles.hero}><div><p className={styles.overline}>Workspace overview</p><h2>Keep the whole<br /><em>picture moving.</em></h2></div><div className={styles.heroAside}><p>Everything important, in one clear rhythm.</p><div className={styles.heroMeta}><span className={styles.liveDot} /> All systems operational</div></div></section>
      <section className={styles.stats}><article><div className={styles.statLabel}><FolderKanban size={15} aria-hidden="true" /> Active projects</div><strong>{activeProjects.length}</strong><small>{activeProjects.length ? "Projects in motion" : "Ready to take shape"}<ArrowUpRight size={13} aria-hidden="true" /></small></article><article><div className={styles.statLabel}><UsersRound size={15} aria-hidden="true" /> Client relationships</div><strong>{clients.length}</strong><small>{clients.length ? "People in your orbit" : "Your first relationship awaits"}<ArrowUpRight size={13} aria-hidden="true" /></small></article><article><div className={styles.statLabel}><CircleDollarSign size={15} aria-hidden="true" /> Workspace plan</div><strong>{workspace?.plan ?? "FREE"}</strong><small>Built to grow with your team<ArrowUpRight size={13} aria-hidden="true" /></small></article></section>
      <section className={styles.dashboardGrid}><div className={styles.activityPanel}><div className={styles.panelHeader}><div><p className={styles.overline}>Work in motion</p><h3>{activeProjects.length ? "Current projects" : "Start your first project"}</h3></div><Link href="/" aria-label="Create project"><Plus size={16} aria-hidden="true" /></Link></div>{activeProjects.length ? activeProjects.slice(0, 4).map((project) => <div className={styles.listRow} key={project.id}><span className={styles.rowGlyph}><FolderKanban size={15} aria-hidden="true" /></span><div><strong>{project.name}</strong><small>{project.client?.name ?? "No client assigned"}</small></div><b>{project.status.replace("_", " ")}</b></div>) : <div className={styles.panelEmpty}><span className={styles.emptyIcon}><BriefcaseBusiness size={18} aria-hidden="true" /></span><p>Give your team a shared place to turn intentions into finished work.</p><Link href="/">Create a project <ArrowUpRight size={14} aria-hidden="true" /></Link></div>}</div><div className={styles.activityPanel}><div className={styles.panelHeader}><div><p className={styles.overline}>People in your orbit</p><h3>{clients.length ? "Recent clients" : "Build your client list"}</h3></div><Link href="/" aria-label="Add client"><Plus size={16} aria-hidden="true" /></Link></div>{clients.length ? clients.slice(0, 4).map((client) => <div className={styles.listRow} key={client.id}><span className={styles.rowGlyph}><UsersRound size={15} aria-hidden="true" /></span><div><strong>{client.name}</strong><small>{client.companyName ?? "Independent client"}</small></div><b>{client.status}</b></div>) : <div className={styles.panelEmpty}><span className={styles.emptyIcon}><UsersRound size={18} aria-hidden="true" /></span><p>Keep client details close and the next conversation clear.</p><Link href="/">Add a client <ArrowUpRight size={14} aria-hidden="true" /></Link></div>}</div></section>
      <section className={styles.bottomRow}><div className={styles.nextMove}><div className={styles.nextMoveIcon}><Sparkles size={17} aria-hidden="true" /></div><div><p className={styles.overline}>Recommended next move</p><h3>{activeProjects.length ? "Review your active work." : "Create a project to begin."}</h3><p>{activeProjects.length ? "Keep momentum by checking what needs your attention today." : "A project gives your team a shared place to plan, execute, and finish."}</p></div><Link href="/"><ArrowUpRight size={18} aria-hidden="true" /></Link></div><div className={styles.today}><CalendarDays size={17} aria-hidden="true" /><div><p className={styles.overline}>Today</p><strong>No deadlines yet</strong><small>Your calendar is clear.</small></div><CheckCircle2 size={18} aria-hidden="true" /></div></section>
    </>}
  </>;
}
