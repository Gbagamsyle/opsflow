"use client";

import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Calendar, FolderKanban, Pencil, Plus, Trash2, UsersRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentOrganization } from "../../../src/hooks/use-current-organization";
import { useOrganizationRealtime } from "../../../src/hooks/use-organization-realtime";
import { apiRequest } from "../../../src/lib/api";
import styles from "../dashboard.module.css";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  startDate?: string | null;
  dueDate?: string | null;
  client?: { id: string; name: string; companyName?: string | null } | null;
};

type Client = {
  id: string;
  name: string;
  companyName?: string | null;
};

export default function ProjectsPage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const {
    organization,
    loading: organizationLoading,
    error: organizationError,
  } = useCurrentOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectClientId, setProjectClientId] = useState("");
  const [projectStatus, setProjectStatus] = useState<Project["status"]>("ACTIVE");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectDueDate, setProjectDueDate] = useState("");

  async function refreshProjects(organizationId: string) {
    const refreshedProjects = await apiRequest<Project[]>(
      `/organizations/${organizationId}/projects`,
      getToken,
    );
    setProjects(refreshedProjects);
  }

  async function refreshClients(organizationId: string) {
    setClients(await apiRequest<Client[]>(`/organizations/${organizationId}/clients`, getToken));
  }

  useOrganizationRealtime(organization?.id, (event) => {
    if (event.resource !== "project" && event.resource !== "client") return;
    void Promise.all([
      refreshProjects(event.organizationId),
      refreshClients(event.organizationId),
    ]).catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : "Unable to sync projects.");
    });
  });

  useEffect(() => {
    const organizationId = organization?.id;
    if (!organizationId) return;

    let isMounted = true;

    async function loadProjects() {
      try {
        const [projectData, clientData] = await Promise.all([
          apiRequest<Project[]>(`/organizations/${organizationId}/projects`, getToken),
          apiRequest<Client[]>(`/organizations/${organizationId}/clients`, getToken),
        ]);

        if (isMounted) {
          setProjects(projectData);
          setClients(clientData);
        }
      } catch (requestError: unknown) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load projects.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [getToken, organization?.id]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !projectName.trim()) return;

    setError("");
    setIsSubmitting(true);

    try {
      const payload: Record<string, string | null> = {
        name: projectName.trim(),
        status: projectStatus,
      };

      if (projectDescription.trim() || editingProject) payload.description = projectDescription.trim() || null;
      if (projectClientId || editingProject) payload.clientId = projectClientId || null;
      if (projectStartDate || editingProject) payload.startDate = projectStartDate ? new Date(projectStartDate).toISOString() : null;
      if (projectDueDate || editingProject) payload.dueDate = projectDueDate ? new Date(projectDueDate).toISOString() : null;

      const projectEndpoint = editingProject
        ? `/organizations/${organization.id}/projects/${editingProject.id}`
        : `/organizations/${organization.id}/projects`;

      await apiRequest<Project>(projectEndpoint, getToken, {
        method: editingProject ? "PATCH" : "POST",
        json: payload,
      });

      await refreshProjects(organization.id);
      setProjectName("");
      setProjectDescription("");
      setProjectClientId("");
      setProjectStatus("ACTIVE");
      setProjectStartDate("");
      setProjectDueDate("");
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save project.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditProject(project: Project) {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description ?? "");
    setProjectClientId(project.client?.id ?? "");
    setProjectStatus(project.status);
    setProjectStartDate(project.startDate?.slice(0, 10) ?? "");
    setProjectDueDate(project.dueDate?.slice(0, 10) ?? "");
    setError("");
    setIsModalOpen(true);
  }

  async function handleDeleteProject(project: Project) {
    if (!organization || !window.confirm(`Delete "${project.name}"?`)) return;

    setError("");
    try {
      await apiRequest(`/organizations/${organization.id}/projects/${project.id}`, getToken, {
        method: "DELETE",
      });
      await refreshProjects(organization.id);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete project.");
    }
  }

  const activeProjects = projects.filter((project) => project.status === "ACTIVE").length;
  const plannedProjects = projects.filter((project) => project.status === "PLANNING").length;

  const projectsLoading = organizationLoading || (Boolean(organization) && loading);

  if (!isLoaded || projectsLoading) {
    return <div className={styles.loadingState}>Loading projects...</div>;
  }

  if (!isSignedIn) {
    return <div className={styles.loadingState}>Sign in to access your projects.</div>;
  }

  return (
    <section className={styles.projectsPage}>
      <header className={styles.projectsPageHeader}>
        <div className={styles.commandLeft}>
          <p className={styles.overline}>WORK PIPELINE</p>
          <h1>Projects</h1>
          <p className={styles.commandSubtitle}>Manage your workspace projects.</p>
        </div>

        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => {
            setEditingProject(null);
            setProjectName("");
            setProjectDescription("");
            setProjectClientId("");
            setProjectStatus("ACTIVE");
            setProjectStartDate("");
            setProjectDueDate("");
            setIsModalOpen(true);
          }}
        >
          <Plus size={14} aria-hidden="true" />
          <span>New project</span>
        </button>
      </header>

      <div className={styles.projectSummary} aria-label="Project summary">
        <div className={styles.projectSummaryItem}>
          <span>Total projects</span>
          <strong>{projects.length}</strong>
        </div>
        <div className={styles.projectSummaryItem}>
          <span>Active</span>
          <strong>{activeProjects}</strong>
        </div>
        <div className={styles.projectSummaryItem}>
          <span>Planning</span>
          <strong>{plannedProjects}</strong>
        </div>
      </div>

      {(organizationError || error) && (
        <div className={styles.errorBanner} role="alert">
          <span><AlertCircle size={15} aria-hidden="true" /> {organizationError ?? error}</span>
          <button type="button" className={styles.closeBtn} onClick={() => setError("")} aria-label="Dismiss error">
            <X size={14} />
          </button>
        </div>
      )}

      {projects.length > 0 ? (
        <div className={styles.projectList}>
          {projects.map((project) => (
            <article
              className={`${styles.projectRow} ${styles.projectRowClickable}`}
              key={project.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/dashboard/projects/${project.id}`);
                }
              }}
            >
              <div className={styles.rowMain}>
                <div className={styles.rowIcon}><FolderKanban size={15} aria-hidden="true" /></div>
                <div className={styles.projectRowMeta}>
                  <strong className={styles.rowTitle}>{project.name}</strong>
                  <span className={styles.projectDescription}>{project.description || "No project description yet."}</span>
                </div>
              </div>
              <div className={styles.rowRight}>
                {project.client && <span className={styles.projectMetaChip}><UsersRound size={11} />{project.client.name}</span>}
                {project.dueDate && (
                  <span className={styles.dueDateChip}>
                    <Calendar size={11} aria-hidden="true" />
                    {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <span className={styles.statusBadge}>{project.status.replace("_", " ")}</span>
                <button type="button" className={styles.projectIconButton} onClick={(event) => { event.stopPropagation(); openEditProject(project); }} aria-label={`Edit ${project.name}`}>
                  <Pencil size={13} />
                </button>
                <button type="button" className={styles.projectIconButton} onClick={(event) => { event.stopPropagation(); void handleDeleteProject(project); }} aria-label={`Delete ${project.name}`}>
                  <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyStation}>
          <div className={styles.emptyIconBox}>
            <FolderKanban size={22} aria-hidden="true" />
          </div>
          <h4>No projects yet</h4>
          <p>Create your first project to get started.</p>
          <button type="button" className={styles.primaryAction} onClick={() => setIsModalOpen(true)}>
            <Plus size={14} aria-hidden="true" />
            <span>Create project</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="projects-modal-title">
          <div className={styles.modalSheet}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.overline}>NEW INITIATIVE</p>
                <h3 id="projects-modal-title">{editingProject ? "Edit project" : "Create project"}</h3>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setIsModalOpen(false)} aria-label="Close dialog">
                <X size={16} />
              </button>
            </div>

            <form className={styles.projectForm} onSubmit={handleCreateProject}>
              <p className={styles.formSectionLabel}>Project details</p>
              <div className={styles.formRow}>
                <label htmlFor="project-name">Project name</label>
                <input id="project-name" required minLength={2} maxLength={120} value={projectName} onChange={(event) => setProjectName(event.target.value)} autoFocus />
              </div>
              <div className={styles.formRow}>
                <label htmlFor="project-description">Description</label>
                <textarea id="project-description" value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formRow}>
                  <label htmlFor="project-client">Client</label>
                  <select id="project-client" value={projectClientId} onChange={(event) => setProjectClientId(event.target.value)}>
                    <option value="">Internal project</option>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>
                        {client.name}{client.companyName ? ` (${client.companyName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="project-status">Status</label>
                  <select id="project-status" value={projectStatus} onChange={(event) => setProjectStatus(event.target.value as Project["status"])}>
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNING">Planning</option>
                    <option value="ON_HOLD">On hold</option>
                  </select>
                </div>
              </div>
              <p className={styles.formSectionLabel}>Schedule</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formRow}>
                  <label htmlFor="project-start-date">Start date</label>
                  <input id="project-start-date" type="date" value={projectStartDate} onChange={(event) => setProjectStartDate(event.target.value)} />
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="project-due-date">Due date</label>
                  <input id="project-due-date" type="date" value={projectDueDate} onChange={(event) => setProjectDueDate(event.target.value)} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryAction} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primaryAction} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingProject ? "Save changes" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}