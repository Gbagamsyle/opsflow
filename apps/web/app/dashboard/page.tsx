"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  FolderKanban,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./dashboard.module.css";
import { useOrganizationRealtime } from "../../src/hooks/use-organization-realtime";

type Organization = {
  id: string;
  name: string;
  slug: string;
  plan?: string;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  startDate?: string | null;
  progress?: number;
  tasksCount?: number;
  tasksDone?: number;
  client?: { id: string; name: string; companyName?: string | null } | null;
};

type Client = {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status: "LEAD" | "ACTIVE" | "PAST";
  projectsCount?: number;
};

type ActivityLog = {
  id: string;
  entityType: "project" | "client" | "task" | "comment" | "member";
  action: "created" | "updated" | "moved" | "deleted";
  metadata?: {
    name?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
  } | null;
  createdAt: string;
  actor?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
};

type TriageItem = {
  id: string;
  title: string;
  desc: string;
  urgency: "urgent" | "normal";
  actionText: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ACTIVITY_READ_KEY = "opsflow-recent-activity-read";

// Rich Demo Operations Data Preset
const DEMO_PROJECTS: Project[] = [
  {
    id: "demo-1",
    name: "Apex Mobile Architecture 2.0",
    description: "Core iOS and Android infrastructure migration with offline sync engines.",
    status: "ACTIVE",
    priority: "URGENT",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 80,
    tasksCount: 10,
    tasksDone: 8,
    client: { id: "c-1", name: "Elena Rostova", companyName: "Acme Health Technologies" },
  },
  {
    id: "demo-2",
    name: "Brand Design System & Tokens",
    description: "Unified component library tokens, dark mode palette, and Figma sync pipeline.",
    status: "ACTIVE",
    priority: "HIGH",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 65,
    tasksCount: 16,
    tasksDone: 11,
    client: { id: "c-2", name: "Marcus Vance", companyName: "Northwind Studio" },
  },
  {
    id: "demo-3",
    name: "Enterprise Multi-Tenant Migration",
    description: "Database partitioning, Redis cache layer, and SOC-2 audit trails.",
    status: "PLANNING",
    priority: "MEDIUM",
    dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 30,
    tasksCount: 12,
    tasksDone: 4,
    client: { id: "c-3", name: "Sarah Lin", companyName: "Vertex Logix" },
  },
  {
    id: "demo-4",
    name: "Customer Onboarding Portal MVP",
    description: "Self-service invite system, SSO setup, and billing portal webhooks.",
    status: "COMPLETED",
    priority: "MEDIUM",
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 100,
    tasksCount: 14,
    tasksDone: 14,
    client: { id: "c-4", name: "David Kim", companyName: "Aurora Labs" },
  },
];

const DEMO_CLIENTS: Client[] = [
  {
    id: "c-1",
    name: "Elena Rostova",
    companyName: "Acme Health Technologies",
    email: "elena@acmehealth.io",
    status: "ACTIVE",
    projectsCount: 2,
  },
  {
    id: "c-2",
    name: "Marcus Vance",
    companyName: "Northwind Studio",
    email: "marcus@northwind.design",
    status: "ACTIVE",
    projectsCount: 1,
  },
  {
    id: "c-3",
    name: "Sarah Lin",
    companyName: "Vertex Logix",
    email: "slin@vertexlogix.com",
    status: "LEAD",
    projectsCount: 1,
  },
  {
    id: "c-4",
    name: "David Kim",
    companyName: "Aurora Labs",
    email: "david@auroralabs.co",
    status: "PAST",
    projectsCount: 1,
  },
];

const DEMO_TRIAGE: TriageItem[] = [
  {
    id: "tr-1",
    title: "Apex Mobile 2.0 release candidate due in 3 days",
    desc: "Final QA checklist and staging deployment approval required.",
    urgency: "urgent",
    actionText: "Review Milestone",
  },
  {
    id: "tr-2",
    title: "1 client statement pending signature",
    desc: "Northwind Studio design token scope expansion.",
    urgency: "normal",
    actionText: "Open Statement",
  },
  {
    id: "tr-3",
    title: "Confirm timeline with Vertex Logix",
    desc: "Multi-tenant cloud migration kickoff meeting scheduled for Friday.",
    urgency: "normal",
    actionText: "Send Agenda",
  },
];

export default function Dashboard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [realProjects, setRealProjects] = useState<Project[]>([]);
  const [realClients, setRealClients] = useState<Client[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Demo Toggle Mode
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isActivityExpanded, setIsActivityExpanded] = useState(true);
  const [hasUnreadActivity, setHasUnreadActivity] = useState(true);

  // View Mode: 'list' | 'cards' | 'timeline'
  const [viewMode, setViewMode] = useState<"list" | "cards" | "timeline">("list");

  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal Dialogs
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Project Form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState<string>("ACTIVE");
  const [newProjectDueDate, setNewProjectDueDate] = useState("");

  // Client Form
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [newClientStatus, setNewClientStatus] = useState<string>("ACTIVE");
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  async function refreshActivity(organizationId: string) {
    const token = await getToken();
    const response = await fetch(`${API_URL}/organizations/${organizationId}/activity?limit=8`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => []);
    if (!response.ok) throw new Error(body?.message ?? "Failed to load activity.");
    setActivity(Array.isArray(body) ? body : []);
  }

  useOrganizationRealtime(selectedOrgId || undefined, (event) => {
    if (event.resource !== "project" && event.resource !== "client" && event.resource !== "task" && event.resource !== "comment" && event.resource !== "member") return;

    void (async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [projectsResponse, clientsResponse] = await Promise.all([
        fetch(`${API_URL}/organizations/${event.organizationId}/projects`, { headers }),
        fetch(`${API_URL}/organizations/${event.organizationId}/clients`, { headers }),
      ]);
      const [projects, clients] = await Promise.all([
        projectsResponse.json().catch(() => []),
        clientsResponse.json().catch(() => []),
      ]);
      setRealProjects(Array.isArray(projects) ? projects : []);
      setRealClients(Array.isArray(clients) ? clients : []);
      await refreshActivity(event.organizationId);
      setHasUnreadActivity(true);
      setIsDemoMode(false);
    })().catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : "Failed to sync dashboard data.");
    });
  });

  // Fetch real data on mount
  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      const storedOrgId = window.localStorage.getItem("opsflow-selected-org");
      setHasUnreadActivity(window.localStorage.getItem(`${ACTIVITY_READ_KEY}:${storedOrgId ?? "none"}`) !== "true");
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let isMounted = true;

    async function loadWorkspaceData() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const orgResponse = await fetch(`${API_URL}/organizations`, { headers });
        const orgBody = await orgResponse.json().catch(() => null);

        if (!orgResponse.ok) {
          throw new Error(orgBody?.message ?? "We could not load your workspace.");
        }

        const normalizedOrganizations = Array.isArray(orgBody) ? orgBody : [];

        if (!isMounted) return;
        setOrganizations(normalizedOrganizations);

        const preferredOrgId = searchParams.get("org") ?? window.localStorage.getItem("opsflow-selected-org") ?? "";
        const nextOrgId = normalizedOrganizations.some((org: Organization) => org.id === preferredOrgId)
          ? preferredOrgId
          : normalizedOrganizations[0]?.id ?? "";

        if (nextOrgId) {
          setSelectedOrgId(nextOrgId);
          window.localStorage.setItem("opsflow-selected-org", nextOrgId);
          if (searchParams.get("org") !== nextOrgId) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("org", nextOrgId);
            router.replace(`${window.location.pathname}?${params.toString()}`);
          }

          const [projRes, clientRes, activityRes] = await Promise.all([
            fetch(`${API_URL}/organizations/${nextOrgId}/projects`, { headers }),
            fetch(`${API_URL}/organizations/${nextOrgId}/clients`, { headers }),
            fetch(`${API_URL}/organizations/${nextOrgId}/activity?limit=8`, { headers }),
          ]);

          const [projBody, clientBody, activityBody] = await Promise.all([
            projRes.json().catch(() => []),
            clientRes.json().catch(() => []),
            activityRes.json().catch(() => []),
          ]);

          if (isMounted) {
            const fetchedProjects = Array.isArray(projBody) ? projBody : [];
            const fetchedClients = Array.isArray(clientBody) ? clientBody : [];
            setRealProjects(fetchedProjects);
            setRealClients(fetchedClients);
            setActivity(Array.isArray(activityBody) ? activityBody : []);

          }
        } else {
          setSelectedOrgId("");
          setRealProjects([]);
          setRealClients([]);
          setActivity([]);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadWorkspaceData();

    return () => {
      isMounted = false;
    };
  }, [getToken, isLoaded, isSignedIn, router, searchParams]);

  useEffect(() => {
    const collapseTimer = window.setTimeout(() => setIsActivityExpanded(false), 4500);

    return () => window.clearTimeout(collapseTimer);
  }, []);

  function markActivityRead() {
    setHasUnreadActivity(false);
    window.localStorage.setItem(`${ACTIVITY_READ_KEY}:${selectedOrgId || "none"}`, "true");
  }

  function formatActivityTitle(item: ActivityLog) {
    const actor = [item.actor?.firstName, item.actor?.lastName].filter(Boolean).join(" ") || item.actor?.email || "Someone";
    const subject = item.metadata?.name ?? item.entityType;
    const action = item.action === "moved" && item.metadata?.toStatus
      ? `moved ${subject} from ${item.metadata.fromStatus?.replaceAll("_", " ") ?? "an earlier status"} to ${item.metadata.toStatus.replaceAll("_", " ")}`
      : `${item.action} ${subject}`;
    return `${actor} ${action}`;
  }

  function formatActivityTime(createdAt: string) {
    return new Date(createdAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Active data source
  const activeProjects = isDemoMode ? DEMO_PROJECTS : realProjects;
  const activeClients = isDemoMode ? DEMO_CLIENTS : realClients;
  const activeWorkspace = organizations.find((o) => o.id === selectedOrgId) ?? organizations[0] ?? null;
  const firstName = user?.firstName ?? user?.username ?? "Operations Lead";
  const hasWorkspace = Boolean(activeWorkspace);

  // Filtered and searched projects
  const filteredProjects = useMemo(() => {
    return activeProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.client?.name && p.client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.client?.companyName && p.client.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "ACTIVE") return p.status === "ACTIVE";
      if (statusFilter === "PLANNING") return p.status === "PLANNING";
      if (statusFilter === "COMPLETED") return p.status === "COMPLETED";
      return true;
    });
  }, [activeProjects, searchQuery, statusFilter]);

  // Metrics
  const activeCount = useMemo(
    () => activeProjects.filter((p) => p.status === "ACTIVE" || p.status === "PLANNING").length,
    [activeProjects]
  );
  const completedCount = useMemo(
    () => activeProjects.filter((p) => p.status === "COMPLETED").length,
    [activeProjects]
  );
  const totalClientsCount = activeClients.length;
  const urgentCount = useMemo(
    () => activeProjects.filter((p) => p.dueDate && p.status !== "COMPLETED").length,
    [activeProjects]
  );
  const velocityScore = activeProjects.length > 0 ? Math.round((completedCount / activeProjects.length) * 100) : 100;

  // Date formatted
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  // Form Submissions
  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setModalError("");
    setModalSubmitting(true);

    try {
      const token = await getToken();
      const payload: Record<string, unknown> = {
        name: newProjectName.trim(),
        status: newProjectStatus,
      };

      if (newProjectDescription.trim()) payload.description = newProjectDescription.trim();
      if (newProjectClientId) payload.clientId = newProjectClientId;
      if (newProjectDueDate) payload.dueDate = new Date(newProjectDueDate).toISOString();

      const targetOrgId = activeWorkspace?.id ?? "default";
      const res = await fetch(`${API_URL}/organizations/${targetOrgId}/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "Unable to create project.");
      }

      const createdProject: Project = {
        ...body,
        progress: 10,
        tasksCount: 1,
        tasksDone: 0,
      };

      setRealProjects((prev) => [createdProject, ...prev]);
      setIsDemoMode(false); // Switch to real data
      setIsProjectModalOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectClientId("");
      setNewProjectDueDate("");
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleCreateClient(e: FormEvent) {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setModalError("");
    setModalSubmitting(true);

    try {
      const token = await getToken();
      const payload: Record<string, unknown> = {
        name: newClientName.trim(),
        status: newClientStatus,
      };

      if (newClientCompany.trim() || editingClient) payload.companyName = newClientCompany.trim() || null;
      if (newClientEmail.trim() || editingClient) payload.email = newClientEmail.trim() || null;
      if (newClientPhone.trim() || editingClient) payload.phone = newClientPhone.trim() || null;
      if (newClientNotes.trim() || editingClient) payload.notes = newClientNotes.trim() || null;

      const targetOrgId = activeWorkspace?.id ?? "default";
      const res = await fetch(`${API_URL}/organizations/${targetOrgId}/clients${editingClient ? `/${editingClient.id}` : ""}`, {
        method: editingClient ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? (editingClient ? "Unable to update client." : "Unable to add client."));
      }

      const savedClient: Client = {
        ...body,
        projectsCount: body?.projectsCount ?? editingClient?.projectsCount ?? 0,
      };

      setRealClients((prev) => editingClient
        ? prev.map((client) => client.id === savedClient.id ? savedClient : client)
        : [savedClient, ...prev]);
      setIsDemoMode(false);
      setIsClientModalOpen(false);
      setEditingClient(null);
      setNewClientName("");
      setNewClientCompany("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientNotes("");
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : editingClient ? "Failed to update client." : "Failed to add client.");
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleDeleteClient(client: Client) {
    if (!activeWorkspace || isDemoMode || !window.confirm(`Delete "${client.name}"?`)) return;

    setError("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/organizations/${activeWorkspace.id}/clients/${client.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "Unable to delete client.");
      setRealClients((prev) => prev.filter((item) => item.id !== client.id));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to delete client.");
    }
  }

  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingBar} />
        <p>Calibrating Opsflow command center...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className={styles.loadingState}>
        <Link href="/auth">Sign in to access your operations dashboard</Link>
      </div>
    );
  }

  if (!hasWorkspace) {
    return (
      <div className={styles.emptyStation}>
        <div className={styles.emptyIconBox}><Building2 size={22} aria-hidden="true" /></div>
        <h4>No workspace selected</h4>
        <p>Create your first workspace to begin tracking projects, clients, and team work.</p>
        <Link href="/" className={styles.primaryAction}>
          <Plus size={14} aria-hidden="true" />
          <span>Create workspace</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ---------------- TOP BAR ---------------- */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.dateContext}>
            <CalendarDays size={13} aria-hidden="true" />
            {formattedToday}
          </span>
        </div>

        <div className={styles.topBarRight}>
          {organizations.length > 1 && (
            <label className={styles.workspacePicker}>
              <span className={styles.workspacePickerLabel}>Workspace</span>
              <select
                value={selectedOrgId}
                onChange={(event) => {
                  const nextOrgId = event.target.value;
                  setSelectedOrgId(nextOrgId);
                  window.localStorage.setItem("opsflow-selected-org", nextOrgId);
                  router.replace(`/dashboard?org=${nextOrgId}`);
                }}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className={`${styles.demoToggleBtn} ${isDemoMode ? styles.demoActive : ""}`}
            onClick={() => setIsDemoMode(!isDemoMode)}
            title="Toggle between rich preview demo data and live workspace data"
          >
            <Sparkles size={12} aria-hidden="true" />
            <span>{isDemoMode ? "Preview Mode (Active)" : "View Demo Data"}</span>
          </button>

          <Link href="/" className={styles.secondaryAction} title="Manage or switch workspaces">
            <Building2 size={13} aria-hidden="true" />
            <span>{activeWorkspace?.name ?? "Ops Workspace"}</span>
          </Link>
        </div>
      </header>

      {/* ---------------- COMMAND BANNER ---------------- */}
      <section className={styles.commandBanner}>
        <div className={styles.commandLeft}>
          <h1>Good morning, {firstName}.</h1>
          <div className={styles.commandSubtitle}>
            <span>
              {activeCount} active stream{activeCount === 1 ? "" : "s"} in motion across {totalClientsCount} partner account{totalClientsCount === 1 ? "" : "s"}.
            </span>
            <span className={styles.pulseBadge}>
              <span className={styles.liveDot} />
              98.4% On-Track Velocity
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => {
              setModalError("");
              setIsClientModalOpen(true);
            }}
          >
            <UsersRound size={13} aria-hidden="true" />
            <span>Add Client</span>
          </button>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => {
              setModalError("");
              setIsProjectModalOpen(true);
            }}
          >
            <Plus size={14} aria-hidden="true" />
            <span>New Project</span>
          </button>
        </div>
      </section>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className={styles.closeBtn}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ---------------- 4-TILE KPI STRIP ---------------- */}
      <section className={styles.kpiStrip} aria-label="Operational metrics">
        {/* Metric 1 */}
        <article className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span>Active Initiatives</span>
            <FolderKanban size={14} aria-hidden="true" />
          </div>
          <div className={styles.kpiNumberRow}>
            <span className={styles.kpiNumber}>{activeCount}</span>
            <span className={styles.kpiTrendPositive}>
              <TrendingUp size={12} /> {completedCount} Done
            </span>
          </div>
          <div className={styles.kpiProgressTrack}>
            <div
              className={styles.kpiProgressBar}
              style={{
                width: `${activeProjects.length > 0 ? (activeCount / activeProjects.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className={styles.kpiBottom}>
            <span>{activeProjects.length} total projects logged</span>
            <span>{velocityScore}% velocity</span>
          </div>
        </article>

        {/* Metric 2 */}
        <article className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span>Client Partnerships</span>
            <UsersRound size={14} aria-hidden="true" />
          </div>
          <div className={styles.kpiNumberRow}>
            <span className={styles.kpiNumber}>{totalClientsCount}</span>
            <span className={styles.kpiTrendPositive}>
              <CheckCircle2 size={12} /> 100% Retained
            </span>
          </div>
          <div className={styles.kpiProgressTrack}>
            <div className={styles.kpiProgressBar} style={{ width: "85%" }} />
          </div>
          <div className={styles.kpiBottom}>
            <span>Active &amp; Lead stakeholder orbit</span>
            <span>Direct Comms</span>
          </div>
        </article>

        {/* Metric 3 */}
        <article className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span>Scheduled Deadlines</span>
            <Clock size={14} aria-hidden="true" />
          </div>
          <div className={styles.kpiNumberRow}>
            <span className={styles.kpiNumber}>{urgentCount}</span>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--rust)" }}>
              {urgentCount > 0 ? "Targeted" : "Clear"}
            </span>
          </div>
          <div className={styles.kpiProgressTrack}>
            <div
              className={styles.kpiProgressBar}
              style={{ width: `${urgentCount > 0 ? 60 : 0}%`, background: "var(--rust)" }}
            />
          </div>
          <div className={styles.kpiBottom}>
            <span>{urgentCount > 0 ? "Upcoming milestone deliverables" : "No pending bottlenecks"}</span>
            <span>Sprint 36</span>
          </div>
        </article>

      </section>

      {/* ---------------- MAIN DUAL-COLUMN GRID ---------------- */}
      <div className={styles.contentGrid}>
        {/* LEFT COLUMN: OPERATIONAL WORK STATION */}
        <section className={styles.workStationCard}>
          <div className={styles.workStationHeader}>
            <div className={styles.stationTitleBlock}>
              <p className={styles.overline}>WORK PIPELINE</p>
              <h2>Projects &amp; Deliverables</h2>
            </div>

            <div className={styles.stationControls}>
              {/* Search Bar */}
              <div className={styles.searchPill}>
                <Search size={12} aria-hidden="true" />
                <input
                  placeholder="Filter pipeline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter pipeline"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className={styles.statusFilterTabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "ALL"}
                  className={`${styles.filterTabBtn} ${statusFilter === "ALL" ? styles.filterTabActive : ""}`}
                  onClick={() => setStatusFilter("ALL")}
                >
                  All ({activeProjects.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "ACTIVE"}
                  className={`${styles.filterTabBtn} ${statusFilter === "ACTIVE" ? styles.filterTabActive : ""}`}
                  onClick={() => setStatusFilter("ACTIVE")}
                >
                  Active
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "PLANNING"}
                  className={`${styles.filterTabBtn} ${statusFilter === "PLANNING" ? styles.filterTabActive : ""}`}
                  onClick={() => setStatusFilter("PLANNING")}
                >
                  Planning
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "COMPLETED"}
                  className={`${styles.filterTabBtn} ${statusFilter === "COMPLETED" ? styles.filterTabActive : ""}`}
                  onClick={() => setStatusFilter("COMPLETED")}
                >
                  Done
                </button>
              </div>

              {/* View Switcher: List vs Cards vs Timeline */}
              <div className={styles.viewModeGroup} aria-label="Select layout view">
                <button
                  type="button"
                  title="List View"
                  className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  title="Grid Cards View"
                  className={`${styles.viewBtn} ${viewMode === "cards" ? styles.viewBtnActive : ""}`}
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  type="button"
                  title="Timeline Group View"
                  className={`${styles.viewBtn} ${viewMode === "timeline" ? styles.viewBtnActive : ""}`}
                  onClick={() => setViewMode("timeline")}
                >
                  <Layers size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* PROJECT VIEWS */}
          {filteredProjects.length > 0 ? (
            <>
              {/* VIEW 1: LIST VIEW */}
              {viewMode === "list" && (
                <div className={styles.projectList}>
                  {filteredProjects.map((project) => {
                    const badgeClass =
                      project.status === "ACTIVE"
                        ? styles.badgeActive
                        : project.status === "PLANNING"
                        ? styles.badgePlanning
                        : project.status === "COMPLETED"
                        ? styles.badgeCompleted
                        : styles.badgeOnHold;

                    const progressVal = project.progress ?? (project.status === "COMPLETED" ? 100 : 45);

                    return (
                      <article className={styles.projectRow} key={project.id}>
                        <div className={styles.rowMain}>
                          <div className={styles.rowIcon}>
                            <FolderKanban size={15} aria-hidden="true" />
                          </div>
                          <div className={styles.rowMeta}>
                            <strong className={styles.rowTitle}>{project.name}</strong>
                            <div className={styles.rowSubMeta}>
                              <span className={styles.clientChip}>
                                <Building2 size={11} />
                                {project.client ? project.client.name : "Internal Work"}
                              </span>
                              {project.dueDate && (
                                <>
                                  <span>•</span>
                                  <span className={styles.dueDateChip}>
                                    <Calendar size={11} />
                                    Due {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </>
                              )}
                              {project.priority === "URGENT" && (
                                <span className={styles.priorityUrgent}>
                                  <Flame size={10} /> Urgent
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={styles.rowRight}>
                          <div className={styles.progressPill}>
                            <div className={styles.miniTrack}>
                              <div className={styles.miniFill} style={{ width: `${progressVal}%` }} />
                            </div>
                            <span>{progressVal}%</span>
                          </div>

                          <span className={`${styles.statusBadge} ${badgeClass}`}>
                            {project.status.replace("_", " ")}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* VIEW 2: CARDS GRID VIEW */}
              {viewMode === "cards" && (
                <div className={styles.projectCardGrid}>
                  {filteredProjects.map((project) => {
                    const badgeClass =
                      project.status === "ACTIVE"
                        ? styles.badgeActive
                        : project.status === "PLANNING"
                        ? styles.badgePlanning
                        : project.status === "COMPLETED"
                        ? styles.badgeCompleted
                        : styles.badgeOnHold;

                    const progressVal = project.progress ?? (project.status === "COMPLETED" ? 100 : 45);

                    return (
                      <article className={styles.gridCard} key={project.id}>
                        <div>
                          <div className={styles.gridCardTop}>
                            <span className={styles.clientChip}>
                              <Building2 size={11} />
                              {project.client ? project.client.companyName ?? project.client.name : "Internal"}
                            </span>
                            <span className={`${styles.statusBadge} ${badgeClass}`}>
                              {project.status}
                            </span>
                          </div>
                          <h4 className={styles.gridCardTitle}>{project.name}</h4>
                          <p className={styles.gridCardDesc}>
                            {project.description || "No project scope details provided yet."}
                          </p>
                        </div>

                        <div>
                          <div className={styles.kpiProgressTrack} style={{ margin: "10px 0 6px" }}>
                            <div className={styles.kpiProgressBar} style={{ width: `${progressVal}%` }} />
                          </div>
                          <div className={styles.gridCardBottom}>
                            <span style={{ color: "var(--ink-muted)" }}>
                              {project.tasksDone ?? 3}/{project.tasksCount ?? 5} tasks completed
                            </span>
                            {project.dueDate && (
                              <span className={styles.dueDateChip}>
                                <Clock size={11} />
                                {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* VIEW 3: TIMELINE VIEW */}
              {viewMode === "timeline" && (
                <div>
                  <div className={styles.timelineGroup}>
                    <span className={styles.timelineGroupTitle}>Current Sprint • Deliverables</span>
                    <div className={styles.projectList}>
                      {filteredProjects.map((project) => (
                        <div className={styles.projectRow} key={project.id}>
                          <div className={styles.rowMain}>
                            <Clock size={14} color="var(--rust)" />
                            <div className={styles.rowMeta}>
                              <strong className={styles.rowTitle}>{project.name}</strong>
                              <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                                {project.client ? project.client.name : "Internal"} • Milestone Release
                              </span>
                            </div>
                          </div>
                          <span className={styles.dueDateChip}>
                            <Calendar size={12} />
                            {project.dueDate
                              ? new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "No fixed deadline"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyStation}>
              <div className={styles.emptyIconBox}>
                <BriefcaseBusiness size={22} aria-hidden="true" />
              </div>
              <h4>{searchQuery ? "No matching deliverables found" : "Ready for your next initiative"}</h4>
              <p>
                {searchQuery
                  ? "Try resetting your search query or switching the status filter tab."
                  : "Organize tasks, attach clients, and track milestones in a unified command stream."}
              </p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setIsProjectModalOpen(true);
                }}
              >
                <Plus size={14} aria-hidden="true" />
                <span>Create New Project</span>
              </button>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: FOCUS & INTELLIGENCE */}
        <aside className={styles.focusStack}>
          {/* 1. ATTENTION RADAR (TRIAGE) */}
          <div className={styles.sideWidget}>
            <div className={styles.widgetHeader}>
              <div>
                <p className={styles.overline}>TRIAGE &amp; ATTENTION</p>
                <h3>Action Radar</h3>
              </div>
              <Sparkles size={15} color="var(--rust)" aria-hidden="true" />
            </div>

            <div className={styles.triageList}>
              {DEMO_TRIAGE.map((item) => (
                <div className={styles.triageItem} key={item.id}>
                  <div
                    className={
                      item.urgency === "urgent" ? styles.triageIconRust : styles.triageIconGreen
                    }
                  >
                    {item.urgency === "urgent" ? <Flame size={13} /> : <CheckCircle2 size={13} />}
                  </div>
                  <div className={styles.triageContent}>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. CLIENT ROSTER */}
          <div className={styles.sideWidget}>
            <div className={styles.widgetHeader}>
              <div>
                <p className={styles.overline}>RELATIONSHIPS</p>
                <h3>Client Roster</h3>
              </div>
              <button
                type="button"
                className={styles.widgetActionLink}
                onClick={() => {
                  setModalError("");
                  setEditingClient(null);
                  setNewClientName("");
                  setNewClientCompany("");
                  setNewClientEmail("");
                  setNewClientPhone("");
                  setNewClientNotes("");
                  setNewClientStatus("ACTIVE");
                  setIsClientModalOpen(true);
                }}
              >
                <Plus size={12} aria-hidden="true" />
                <span>Add</span>
              </button>
            </div>

            <div className={styles.clientRosterList}>
              {activeClients.map((client) => (
                <div className={styles.clientCardRow} key={client.id}>
                  <Link href={`/dashboard/clients/${client.id}`} className={styles.clientLeft}>
                    <span className={styles.clientAvatar}>{client.name.slice(0, 1).toUpperCase()}</span>
                    <div className={styles.clientMeta}>
                      <strong>{client.name}</strong>
                      <small>{client.companyName ?? "Independent partner"}</small>
                    </div>
                  </Link>
                  <span
                    className={`${styles.statusBadge} ${
                      client.status === "ACTIVE"
                        ? styles.badgeActive
                        : client.status === "LEAD"
                        ? styles.badgePlanning
                        : styles.badgeCompleted
                    }`}
                  >
                    {client.status}
                  </span>
                  {!isDemoMode && <div className={styles.clientRowActions}>
                    <button type="button" className={styles.projectIconButton} onClick={() => {
                      setEditingClient(client);
                      setNewClientName(client.name);
                      setNewClientCompany(client.companyName ?? "");
                      setNewClientEmail(client.email ?? "");
                      setNewClientPhone(client.phone ?? "");
                      setNewClientNotes(client.notes ?? "");
                      setNewClientStatus(client.status);
                      setModalError("");
                      setIsClientModalOpen(true);
                    }} aria-label={`Edit ${client.name}`}><Pencil size={13} /></button>
                    <button type="button" className={styles.projectIconButton} onClick={() => void handleDeleteClient(client)} aria-label={`Delete ${client.name}`}><Trash2 size={13} /></button>
                  </div>}
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>

      {/* ---------------- RECENT ACTIVITY TOAST ---------------- */}
      <button
        type="button"
        className={`${styles.activityToast} ${isActivityExpanded ? styles.activityToastExpanded : ""}`}
        aria-expanded={isActivityExpanded}
        aria-label={isActivityExpanded ? "Collapse recent activity" : "Show recent activity"}
        onClick={() => {
          markActivityRead();
          setIsActivityExpanded((expanded) => !expanded);
        }}
      >
        <span className={styles.activityToastSummary}>
          <span className={styles.activityDot} />
          <span>Recent activity</span>
          {hasUnreadActivity && activity.length > 0 && <small>{activity.length} new</small>}
        </span>

        {isActivityExpanded && (
          <span className={styles.activityToastList}>
            {activity.length > 0 ? activity.map((act) => (
              <span className={styles.activityRow} key={act.id}>
                <span className={styles.activityDetails}>
                  <span>{formatActivityTitle(act)}</span>
                  <small>{formatActivityTime(act.createdAt)}</small>
                </span>
              </span>
            )) : <span className={styles.activityRow}><span className={styles.activityDetails}><span>No workspace activity yet</span><small>Actions will appear here</small></span></span>}
          </span>
        )}
      </button>

      {/* ---------------- MODAL: CREATE PROJECT ---------------- */}
      {isProjectModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-project-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProjectModalOpen(false);
          }}
        >
          <div className={styles.modalSheet}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.overline}>NEW INITIATIVE</p>
                <h3 id="modal-project-title">Launch Project</h3>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsProjectModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className={styles.modalForm}>
              {modalError && <div className={styles.modalErrorMsg}>{modalError}</div>}

              <div className={styles.formRow}>
                <label htmlFor="p-name">Project Title *</label>
                <input
                  id="p-name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="e.g. Infrastructure Modernization Sprint"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.formRow}>
                <label htmlFor="p-desc">Scope &amp; Deliverables</label>
                <textarea
                  id="p-desc"
                  placeholder="Key milestones, deliverables, and technical boundaries..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formRow}>
                  <label htmlFor="p-client">Partner Client</label>
                  <select
                    id="p-client"
                    value={newProjectClientId}
                    onChange={(e) => setNewProjectClientId(e.target.value)}
                  >
                    <option value="">Internal Workspace</option>
                    {realClients.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formRow}>
                  <label htmlFor="p-status">Initial State</label>
                  <select
                    id="p-status"
                    value={newProjectStatus}
                    onChange={(e) => setNewProjectStatus(e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNING">Planning</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <label htmlFor="p-due">Target Due Date</label>
                <input
                  id="p-due"
                  type="date"
                  value={newProjectDueDate}
                  onChange={(e) => setNewProjectDueDate(e.target.value)}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setIsProjectModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !newProjectName.trim()}
                  className={styles.primaryAction}
                >
                  {modalSubmitting ? "Launching..." : "Launch Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: CREATE OR EDIT CLIENT ---------------- */}
      {isClientModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-client-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsClientModalOpen(false);
          }}
        >
          <div className={styles.modalSheet}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.overline}>RELATIONSHIPS</p>
                <h3 id="modal-client-title">{editingClient ? "Edit Partner Contact" : "Add Partner Contact"}</h3>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsClientModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className={styles.modalForm}>
              {modalError && <div className={styles.modalErrorMsg}>{modalError}</div>}

              <div className={styles.formRow}>
                <label htmlFor="c-name">Contact Full Name *</label>
                <input
                  id="c-name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="e.g. Rachel Foster"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.formRow}>
                <label htmlFor="c-company">Company / Entity</label>
                <input
                  id="c-company"
                  placeholder="e.g. Starlight Media Group"
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>
                <div className={styles.formRow}>
                  <label htmlFor="c-email">Work Email</label>
                  <input
                    id="c-email"
                    type="email"
                    placeholder="rachel@starlight.io"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label htmlFor="c-status">Stage</label>
                  <select
                    id="c-status"
                    value={newClientStatus}
                    onChange={(e) => setNewClientStatus(e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="LEAD">Lead</option>
                    <option value="PAST">Past</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formRow}>
                  <label htmlFor="c-phone">Phone</label>
                  <input id="c-phone" type="tel" placeholder="+1 555 010 2026" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="c-notes">Notes</label>
                  <textarea id="c-notes" placeholder="Relationship context, preferences, or next steps..." value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setIsClientModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !newClientName.trim()}
                  className={styles.primaryAction}
                >
                  {modalSubmitting ? "Saving..." : "Save Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
