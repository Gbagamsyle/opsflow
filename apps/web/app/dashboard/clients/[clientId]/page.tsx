"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Calendar, CheckCircle2, CircleDollarSign, Clock3, FolderKanban, LayoutDashboard, Mail, Pencil, Phone, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCurrentOrganization } from "../../../../src/hooks/use-current-organization";
import { apiRequest } from "../../../../src/lib/api";
import styles from "../../dashboard.module.css";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

type Task = { id: string; title: string; status: TaskStatus; priority: string; dueDate?: string | null; projectId: string };
type Project = { id: string; name: string; status: ProjectStatus; dueDate?: string | null; tasks: Task[] };
type Invoice = { id: string; invoiceNumber: string; amount: number | string; status: InvoiceStatus; dueDate?: string | null };
type Activity = { id: string; entityType: string; action: string; createdAt: string; metadata?: { name?: string | null } | null; actor?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null };
type ClientWorkspace = { id: string; name: string; companyName?: string | null; email?: string | null; phone?: string | null; notes?: string | null; status: "LEAD" | "ACTIVE" | "PAST"; projects: Project[]; invoices: Invoice[]; activity: Activity[] };

const taskStatusLabels: Record<TaskStatus, string> = { TODO: "Todo", IN_PROGRESS: "In progress", REVIEW: "Review", DONE: "Done" };
const projectStatusLabels: Record<ProjectStatus, string> = { PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed" };
const invoiceStatusLabels: Record<InvoiceStatus, string> = { DRAFT: "Draft", SENT: "Sent", PAID: "Paid", OVERDUE: "Overdue" };

function displayName(actor?: Activity["actor"]) {
  return [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || actor?.email || "Someone";
}

export default function ClientWorkspacePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { organization, loading: organizationLoading } = useCurrentOrganization();
  const params = useParams<{ clientId: string }>();
  const [client, setClient] = useState<ClientWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !organization?.id || !params.clientId) return;
    let mounted = true;
    void apiRequest<ClientWorkspace>(`/organizations/${organization.id}/clients/${params.clientId}`, getToken)
      .then((data) => { if (mounted) setClient(data); })
      .catch((reason: unknown) => { if (mounted) setError(reason instanceof Error ? reason.message : "Unable to load client workspace."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [getToken, isLoaded, isSignedIn, organization?.id, params.clientId]);

  const tasks = useMemo(() => client?.projects.flatMap((project) => project.tasks) ?? [], [client]);
  const taskCounts = useMemo(() => Object.fromEntries(Object.keys(taskStatusLabels).map((status) => [status, tasks.filter((task) => task.status === status).length])), [tasks]);
  const activeProjects = client?.projects.filter((project) => project.status === "ACTIVE").length ?? 0;
  const completedProjects = client?.projects.filter((project) => project.status === "COMPLETED").length ?? 0;
  const outstandingInvoices = client?.invoices.filter((invoice) => invoice.status !== "PAID").length ?? 0;

  if (!isLoaded || organizationLoading || (organization && loading)) return <div className={styles.loadingState}>Loading client workspace...</div>;
  if (!isSignedIn) return <div className={styles.loadingState}>Sign in to access clients.</div>;
  if (!organization) return <div className={styles.emptyStation}><h4>No workspace selected</h4><p>Create a workspace before opening client records.</p><Link href="/" className={styles.primaryAction}>Create workspace</Link></div>;
  if (!client) return <div className={styles.emptyStation}><h4>Client unavailable</h4><p>{error || "This client could not be found."}</p><Link href="/dashboard" className={styles.secondaryAction}><ArrowLeft size={14} /> Back to dashboard</Link></div>;

  return (
    <section className={styles.clientWorkspace}>
      <Link href="/dashboard" className={styles.backLink}><ArrowLeft size={14} /> Dashboard</Link>
      {error && <div className={styles.errorBanner} role="alert">{error}</div>}
      <header className={styles.clientWorkspaceHeader}>
        <div className={styles.clientWorkspaceIdentity}>
          <span className={styles.clientWorkspaceAvatar}>{client.name.slice(0, 1).toUpperCase()}</span>
          <div><p className={styles.overline}>CLIENT WORKSPACE</p><h1>{client.name}</h1><p>{client.companyName || "Independent partner"}</p></div>
        </div>
        <div className={styles.clientHeaderTools}><span className={`${styles.statusBadge} ${client.status === "ACTIVE" ? styles.badgeActive : client.status === "LEAD" ? styles.badgePlanning : styles.badgeCompleted}`}>{client.status}</span><button type="button" className={styles.secondaryAction} title="Edit client profile"><Pencil size={13} /> Edit client</button></div>
      </header>

      <div className={styles.clientMetricStrip} aria-label="Client workspace summary">
        <div><FolderKanban size={15} /><span><strong>{activeProjects}</strong><small>Active projects</small></span></div>
        <div><CheckCircle2 size={15} /><span><strong>{completedProjects}</strong><small>Completed projects</small></span></div>
        <div><LayoutDashboard size={15} /><span><strong>{tasks.length}</strong><small>Tracked tasks</small></span></div>
        <div><CircleDollarSign size={15} /><span><strong>{outstandingInvoices}</strong><small>Open invoices</small></span></div>
      </div>

      <div className={styles.clientContactGrid}>
        <article className={styles.clientInfoPanel}><div className={styles.clientPanelHeading}><span className={styles.clientPanelIcon}><UserRound size={15} /></span><div><p className={styles.overline}>CONTACT</p><h2>Relationship details</h2></div></div><div className={styles.clientContactRows}>{client.email && <span><Mail size={14} />{client.email}</span>}{client.phone && <span><Phone size={14} />{client.phone}</span>}{!client.email && !client.phone && <span><UserRound size={14} />No contact details yet</span>}</div></article>
        <article className={styles.clientInfoPanel}><div className={styles.clientPanelHeading}><span className={styles.clientPanelIcon}><Pencil size={15} /></span><div><p className={styles.overline}>NOTES</p><h2>Working context</h2></div></div><p className={styles.clientNotes}>{client.notes || "No notes have been added for this client."}</p></article>
      </div>

      <section className={styles.clientWorkspaceSection}><div className={styles.clientSectionHeader}><div><p className={styles.overline}>DELIVERY</p><h2>Projects</h2></div><Link href="/dashboard/projects" className={styles.sectionAction}><Plus size={13} /> New project</Link></div><div className={styles.clientProjectGrid}>{client.projects.length ? client.projects.map((project) => <Link href={`/dashboard/projects/${project.id}`} className={styles.clientProjectCard} key={project.id}><div><strong>{project.name}</strong><span>{project.tasks.length} task{project.tasks.length === 1 ? "" : "s"}</span></div><span className={styles.statusBadge}>{projectStatusLabels[project.status]}</span>{project.dueDate && <small><Calendar size={12} /> Due {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small>}</Link>) : <div className={styles.clientEmptyState}>No projects are linked to this client.</div>}</div></section>

      <section className={styles.clientWorkspaceSection}><div className={styles.clientSectionHeader}><div><p className={styles.overline}>WORK QUEUE</p><h2>Tasks</h2></div><span>{tasks.length} total</span></div><div className={styles.clientTaskStatusGrid}>{(Object.keys(taskStatusLabels) as TaskStatus[]).map((status) => <div className={styles.clientTaskStatus} key={status}><div><span>{taskStatusLabels[status]}</span><strong>{taskCounts[status]}</strong></div><div className={styles.clientTaskStatusBar}><span style={{ width: `${tasks.length ? (taskCounts[status] / tasks.length) * 100 : 0}%` }} /></div></div>)}</div></section>

      <div className={styles.clientLowerGrid}><section className={styles.clientWorkspaceSection}><div className={styles.clientSectionHeader}><div><p className={styles.overline}>BILLING</p><h2>Invoices</h2></div><CircleDollarSign size={16} /></div><div className={styles.clientInvoiceList}>{client.invoices.length ? client.invoices.map((invoice) => <div className={styles.clientInvoiceRow} key={invoice.id}><span><strong>{invoice.invoiceNumber}</strong><small>{invoice.dueDate ? `Due ${new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No due date"}</small></span><span><strong>${Number(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong><small>{invoiceStatusLabels[invoice.status]}</small></span></div>) : <div className={styles.clientEmptyState}>No invoices for this client.</div>}</div></section><section className={styles.clientWorkspaceSection}><div className={styles.clientSectionHeader}><div><p className={styles.overline}>HISTORY</p><h2>Activity</h2></div><Clock3 size={16} /></div><div className={styles.clientActivityList}>{client.activity.length ? client.activity.slice(0, 8).map((item) => <div className={styles.clientActivityRow} key={item.id}><CheckCircle2 size={14} /><span><strong>{displayName(item.actor)} {item.action} {item.metadata?.name || item.entityType}</strong><small>{new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small></span></div>) : <div className={styles.clientEmptyState}>No client activity yet.</div>}</div></section></div>
    </section>
  );
}
