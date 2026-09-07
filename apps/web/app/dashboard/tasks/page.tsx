"use client";

import { useAuth } from "@clerk/nextjs";
import { Calendar, CheckCircle2, Circle, ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FormEvent, useEffect, useState } from "react";
import { useCurrentOrganization } from "../../../src/hooks/use-current-organization";
import { apiRequest } from "../../../src/lib/api";
import styles from "../dashboard.module.css";

type Project = { id: string; name: string };
type TeamMember = { id: string; firstName?: string | null; lastName?: string | null; email?: string };
type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  assignee?: TeamMember | null;
  project: Project;
};

const statusLabels: Record<Task["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

const taskStatuses: Task["status"][] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

function DraggableTaskCard({
  task,
  onEdit,
  onDelete,
  onToggle,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggle: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.45 : 1 };

  return (
    <article ref={setNodeRef} style={style} className={styles.kanbanCard} {...listeners} {...attributes}>
      <div className={styles.kanbanCardHeader}>
        <span className={`${styles.taskPriority} ${styles[`taskPriority${task.priority}`]}`}>{task.priority}</span>
        <div className={styles.kanbanCardActions}>
          <button type="button" className={styles.projectIconButton} onPointerDown={(event) => event.stopPropagation()} onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={13} /></button>
          <button type="button" className={styles.projectIconButton} onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={13} /></button>
        </div>
      </div>
      <strong className={styles.kanbanCardTitle}>{task.title}</strong>
      {task.description && <span className={styles.projectDescription}>{task.description}</span>}
      <span className={styles.kanbanCardProject}>{task.project.name}</span>
      {task.assignee && <span className={styles.kanbanCardProject}>{[task.assignee.firstName, task.assignee.lastName].filter(Boolean).join(" ") || task.assignee.email}</span>}
      {task.dueDate && <span className={styles.kanbanCardProject}><Calendar size={11} /> Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
      <div className={styles.kanbanCardFooter}>
        <button type="button" className={styles.taskCompleteButton} onPointerDown={(event) => event.stopPropagation()} onClick={() => onToggle(task)} aria-label={`Mark ${task.title} ${task.status === "DONE" ? "open" : "done"}`}>
          {task.status === "DONE" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        </button>
        <span className={styles.taskStatusSelect}>{statusLabels[task.status]}</span>
      </div>
    </article>
  );
}

function DroppableColumn({ status, tasks, onAdd, onEdit, onDelete, onToggle }: {
  status: Task["status"];
  tasks: Task[];
  onAdd: (status: Task["status"]) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggle: (task: Task) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section ref={setNodeRef} className={`${styles.kanbanColumn} ${isOver ? styles.kanbanColumnOver : ""}`}>
      <header className={styles.kanbanColumnHeader}>
        <div><span className={styles.kanbanColumnTitle}>{statusLabels[status]}</span><span className={styles.kanbanColumnCount}>{tasks.length}</span></div>
        <button type="button" className={styles.kanbanAddButton} onClick={() => onAdd(status)} aria-label={`Add task to ${statusLabels[status]}`}><Plus size={12} /></button>
      </header>
      <div className={styles.kanbanCards}>
        {tasks.length > 0 ? tasks.map((task) => <DraggableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />) : <p className={styles.kanbanEmpty}>No tasks here</p>}
      </div>
    </section>
  );
}

export default function TasksPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { organization, loading: organizationLoading, error: organizationError } = useCurrentOrganization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState<Task["status"]>("TODO");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");

  async function refreshTasks(organizationId: string, projectList: Project[]) {
    const taskGroups = await Promise.all(
      projectList.map((project) =>
        apiRequest<Task[]>(
          `/organizations/${organizationId}/projects/${project.id}/tasks`,
          getToken,
        ),
      ),
    );
    setTasks(taskGroups.flat());
  }

  function resetTaskForm() {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setProjectId(projects[0]?.id || "");
    setPriority("MEDIUM");
    setAssigneeId("");
    setStatus("TODO");
    setDueDate("");
  }

  function openCreateTask(initialStatus: Task["status"] = "TODO") {
    resetTaskForm();
    setStatus(initialStatus);
    setIsModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setProjectId(task.project.id);
    setPriority(task.priority);
    setAssigneeId(task.assignee?.id ?? "");
    setStatus(task.status);
    setDueDate(task.dueDate?.slice(0, 10) ?? "");
    setError("");
    setIsModalOpen(true);
  }

  useEffect(() => {
    const organizationId = organization?.id;
    if (!organizationId) return;
    let mounted = true;
    async function load() {
      try {
        const [projectData, organizationData] = await Promise.all([
          apiRequest<Project[]>(`/organizations/${organizationId}/projects`, getToken),
          apiRequest<{ memberships?: { user: TeamMember }[] }>(`/organizations/${organizationId}`, getToken),
        ]);
        const taskGroups = await Promise.all(
          projectData.map((project) =>
            apiRequest<Task[]>(
              `/organizations/${organizationId}/projects/${project.id}/tasks`,
              getToken,
            ),
          ),
        );
        if (mounted) {
          setTasks(taskGroups.flat());
          setProjects(projectData);
          setMembers(organizationData.memberships?.map((membership) => membership.user) ?? []);
          setProjectId((current) => current || projectData[0]?.id || "");
        }
      } catch (requestError: unknown) {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "Unable to load tasks.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [getToken, organization?.id]);

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !projectId || !title.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const payload: Record<string, string | null> = {
        title: title.trim(),
        priority,
        status,
      };
      if (description.trim() || editingTask) payload.description = description.trim() || null;
      if (assigneeId || editingTask) payload.assigneeId = assigneeId || null;
      if (dueDate || editingTask) payload.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
      const taskEndpoint = editingTask
        ? `/organizations/${organization.id}/projects/${editingTask.project.id}/tasks/${editingTask.id}`
        : `/organizations/${organization.id}/projects/${projectId}/tasks`;

      await apiRequest(taskEndpoint, getToken, {
        method: editingTask ? "PATCH" : "POST",
        json: payload,
      });
      await refreshTasks(organization.id, projects);
      resetTaskForm();
      setIsModalOpen(false);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(task: Task, status: Task["status"]) {
    if (!organization) return;
    try {
      await apiRequest(`/organizations/${organization.id}/projects/${task.project.id}/tasks/${task.id}`, getToken, {
        method: "PATCH",
        json: { status },
      });
      await refreshTasks(organization.id, projects);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update task.");
    }
  }

  async function deleteTask(task: Task) {
    if (!organization || !window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await apiRequest(`/organizations/${organization.id}/projects/${task.project.id}/tasks/${task.id}`, getToken, { method: "DELETE" });
      await refreshTasks(organization.id, projects);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete task.");
    }
  }

  async function moveTask(task: Task, status: Task["status"]) {
    if (!organization || task.status === status) return;

    const position = tasks.filter((candidate) => candidate.status === status).length;
    setTasks((current) => current.map((candidate) => candidate.id === task.id ? { ...candidate, status } : candidate));

    try {
      await apiRequest(`/organizations/${organization.id}/projects/${task.project.id}/tasks/${task.id}/move`, getToken, {
        method: "PATCH",
        json: { status, position },
      });
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to move task.");
      await refreshTasks(organization.id, projects);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const task = tasks.find((candidate) => candidate.id === event.active.id);
    const targetStatus = typeof event.over?.id === "string" && taskStatuses.includes(event.over.id as Task["status"])
      ? event.over.id as Task["status"]
      : null;
    if (task && targetStatus) void moveTask(task, targetStatus);
  }

  const visibleTasks = tasks.filter((task) =>
    (projectFilter === "ALL" || task.project.id === projectFilter) &&
    (priorityFilter === "ALL" || task.priority === priorityFilter) &&
    (assigneeFilter === "ALL" || task.assignee?.id === assigneeFilter),
  );

  if (!isLoaded || organizationLoading || (Boolean(organization) && loading)) {
    return <div className={styles.loadingState}>Loading tasks...</div>;
  }
  if (!isSignedIn) return <div className={styles.loadingState}>Sign in to access your tasks.</div>;

  return (
    <section className={styles.projectsPage}>
      <header className={styles.projectsPageHeader}>
        <div className={styles.commandLeft}>
          <p className={styles.overline}>WORK QUEUE</p>
          <h1>Tasks</h1>
          <p className={styles.commandSubtitle}>Keep delivery moving across your projects.</p>
        </div>
        <button type="button" className={styles.primaryAction} onClick={() => openCreateTask()} disabled={projects.length === 0}>
          <Plus size={14} aria-hidden="true" /> New task
        </button>
      </header>

      {(organizationError || error) && <div className={styles.errorBanner} role="alert">{organizationError ?? error}</div>}
      <div className={styles.taskFilters} aria-label="Filter tasks">
        <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Filter by project">
          <option value="ALL">All projects</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
        </select>
        <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} aria-label="Filter by assignee">
          <option value="ALL">All assignees</option>{members.map((member) => <option value={member.id} key={member.id}>{[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email}</option>)}
        </select>
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
          <option value="ALL">All priorities</option><option value="URGENT">Urgent</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
        </select>
      </div>
      {tasks.length === 0 ? (
        <div className={styles.emptyStation}>
          <div className={styles.emptyIconBox}><ListTodo size={22} /></div>
          <h4>No tasks yet</h4>
          <p>Create a task from one of your projects to start the work queue.</p>
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className={styles.kanbanBoard}>
            {taskStatuses.map((status) => <DroppableColumn key={status} status={status} tasks={visibleTasks.filter((task) => task.status === status)} onAdd={openCreateTask} onEdit={openEditTask} onDelete={(task) => void deleteTask(task)} onToggle={(task) => void updateStatus(task, task.status === "DONE" ? "TODO" : "DONE")} />)}
          </div>
        </DndContext>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
          <div className={styles.modalSheet}>
            <div className={styles.modalHeader}>
              <div><p className={styles.overline}>{editingTask ? "EDIT WORK ITEM" : "NEW WORK ITEM"}</p><h3 id="task-modal-title">{editingTask ? "Edit task" : "Create task"}</h3></div>
              <button type="button" className={styles.closeBtn} onClick={() => setIsModalOpen(false)} aria-label="Close task dialog"><X size={16} /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSaveTask}>
              <div className={styles.formRow}><label htmlFor="task-title">Task title *</label><input id="task-title" required minLength={1} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></div>
              <div className={styles.formRow}><label htmlFor="task-description">Description</label><textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context or acceptance criteria..." /></div>
              <div className={styles.taskFormGrid}>
                <div className={styles.formRow}><label htmlFor="task-priority">Priority</label><select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div>
                <div className={styles.formRow}><label htmlFor="task-assignee">Assignee</label><select id="task-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "Team member"}</option>)}</select></div>
                <div className={styles.formRow}><label htmlFor="task-status">Status</label><select id="task-status" value={status} onChange={(event) => setStatus(event.target.value as Task["status"])}>{taskStatuses.map((option) => <option value={option} key={option}>{statusLabels[option]}</option>)}</select></div>
                <div className={styles.formRow}><label htmlFor="task-due-date">Due date</label><input id="task-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
              </div>
              <div className={styles.formRow}><label htmlFor="task-project">Project</label><select id="task-project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
              <div className={styles.modalFooter}><button type="button" className={styles.secondaryAction} onClick={() => setIsModalOpen(false)}>Cancel</button><button type="submit" className={styles.primaryAction} disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingTask ? "Save task" : "Create task"}</button></div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
