"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Calendar, CheckCircle2, Circle, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "../../../../src/lib/api";
import { useCurrentOrganization } from "../../../../src/hooks/use-current-organization";
import { useOrganizationRealtime } from "../../../../src/hooks/use-organization-realtime";
import styles from "../../dashboard.module.css";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  startDate?: string | null;
  dueDate?: string | null;
  client?: { name: string; companyName?: string | null } | null;
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  assignee?: { firstName?: string | null; lastName?: string | null; email?: string } | null;
};

const statuses: Task["status"][] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const statusLabels: Record<Task["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

export default function ProjectWorkspacePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { organization, loading: organizationLoading } = useCurrentOrganization();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useOrganizationRealtime(organizationId || undefined, (event) => {
    if (event.resource !== "task" && event.resource !== "project") return;
    void Promise.all([
      apiRequest<Project>(`/organizations/${organizationId}/projects/${projectId}`, getToken),
      apiRequest<Task[]>(`/organizations/${organizationId}/projects/${projectId}/tasks`, getToken),
    ]).then(([projectData, taskData]) => {
      setProject(projectData);
      setTasks(taskData);
    }).catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : "Unable to sync project workspace.");
    });
  });

  useEffect(() => {
    const orgId = organization?.id;
    if (!isLoaded || !isSignedIn || !orgId || !projectId) return;
    let mounted = true;

    async function loadWorkspace() {
      try {
        const [projectData, taskData] = await Promise.all([
          apiRequest<Project>(`/organizations/${orgId}/projects/${projectId}`, getToken),
          apiRequest<Task[]>(`/organizations/${orgId}/projects/${projectId}/tasks`, getToken),
        ]);
        if (mounted) {
          setOrganizationId(orgId ?? "");
          setProject(projectData);
          setTasks(taskData);
        }
      } catch (requestError: unknown) {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "Unable to load project workspace.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadWorkspace();
    return () => { mounted = false; };
  }, [getToken, isLoaded, isSignedIn, organization?.id, projectId]);

  async function updateTaskStatus(task: Task, status: Task["status"]) {
    if (!organizationId) return;
    try {
      await apiRequest(`/organizations/${organizationId}/projects/${projectId}/tasks/${task.id}`, getToken, {
        method: "PATCH",
        json: { status },
      });
      const refreshed = await apiRequest<Task[]>(`/organizations/${organizationId}/projects/${projectId}/tasks`, getToken);
      setTasks(refreshed);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update task.");
    }
  }

  if (!isLoaded || organizationLoading || (organization && loading)) return <div className={styles.loadingState}>Loading project workspace...</div>;
  if (!isSignedIn) return <div className={styles.loadingState}>Sign in to access this project.</div>;
  if (!organization) return <div className={styles.emptyStation}><div className={styles.emptyIconBox}><Plus size={22} aria-hidden="true" /></div><h4>No workspace selected</h4><p>Create a workspace before opening projects.</p><Link href="/" className={styles.primaryAction}><Plus size={14} aria-hidden="true" /><span>Create workspace</span></Link></div>;
  if (!project) return <div className={styles.emptyStation}><h4>Project unavailable</h4><p>{error || "This project could not be found in the selected workspace."}</p><Link href="/dashboard/projects" className={styles.secondaryAction}><ArrowLeft size={14} aria-hidden="true" /><span>Back to projects</span></Link></div>;

  return (
    <section className={styles.projectWorkspace}>
      <Link className={styles.backLink} href="/dashboard/projects"><ArrowLeft size={14} /> Projects</Link>
      {error && <div className={styles.errorBanner} role="alert">{error}</div>}
      {project && (
        <header className={styles.projectWorkspaceHeader}>
          <div>
            <div className={styles.projectWorkspaceEyebrow}><span className={`${styles.statusBadge} ${styles.badgeActive}`}>{project.status.replace("_", " ")}</span>{project.client && <span>{project.client.name}</span>}</div>
            <h1>{project.name}</h1>
            <p>{project.description || "No project description yet."}</p>
            {(project.startDate || project.dueDate) && <div className={styles.projectSchedule}>{project.startDate && <span><Calendar size={12} /> Start {new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}{project.dueDate && <span><Calendar size={12} /> Due {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}</div>}
          </div>
          <Link href="/dashboard/tasks" className={styles.primaryAction}><Plus size={14} /> Add task</Link>
        </header>
      )}
      <div className={styles.kanbanBoard}>
        {statuses.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status);
          return <section className={styles.kanbanColumn} key={status}>
            <header className={styles.kanbanColumnHeader}><div><span className={styles.kanbanColumnTitle}>{statusLabels[status]}</span><span className={styles.kanbanColumnCount}>{columnTasks.length}</span></div><Plus size={13} color="var(--ink-muted)" /></header>
            <div className={styles.kanbanCards}>
              {columnTasks.length ? columnTasks.map((task) => <article className={styles.kanbanCard} key={task.id}><span className={`${styles.taskPriority} ${styles[`taskPriority${task.priority}`]}`}>{task.priority}</span><strong className={styles.kanbanCardTitle}>{task.title}</strong>{task.description && <span className={styles.projectDescription}>{task.description}</span>}<span className={styles.kanbanCardProject}>{task.assignee ? [task.assignee.firstName, task.assignee.lastName].filter(Boolean).join(" ") || task.assignee.email : "Unassigned"}</span>{task.dueDate && <span className={styles.kanbanCardProject}><Calendar size={11} /> Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}<button type="button" className={styles.taskCompleteButton} onClick={() => void updateTaskStatus(task, task.status === "DONE" ? "TODO" : "DONE")} aria-label={`Mark ${task.title} ${task.status === "DONE" ? "open" : "done"}`}>{task.status === "DONE" ? <CheckCircle2 size={14} /> : <Circle size={14} />}</button></article>) : <p className={styles.kanbanEmpty}>No tasks here</p>}
            </div>
          </section>;
        })}
      </div>
    </section>
  );
}
