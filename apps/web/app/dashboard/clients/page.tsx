"use client";

import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Building2, LayoutDashboard, Mail, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentOrganization } from "../../../src/hooks/use-current-organization";
import { useOrganizationRealtime } from "../../../src/hooks/use-organization-realtime";
import { apiRequest } from "../../../src/lib/api";
import styles from "../dashboard.module.css";

type Client = {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status: "LEAD" | "ACTIVE" | "PAST";
  projects?: { id: string }[];
};

export default function ClientsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { organization, loading: organizationLoading, error: organizationError } = useCurrentOrganization();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Client["status"]>("ACTIVE");

  const loadClients = useCallback(async (organizationId: string) => {
    setClients(await apiRequest<Client[]>(`/organizations/${organizationId}/clients`, getToken));
  }, [getToken]);

  useOrganizationRealtime(organization?.id, (event) => {
    if (event.resource !== "client" && event.resource !== "project") return;
    if (organization) void loadClients(organization.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to refresh clients."));
  });

  useEffect(() => {
    if (!organization?.id) return;
    let mounted = true;
    const loadTimer = window.setTimeout(() => {
      void loadClients(organization.id)
        .catch((reason: unknown) => { if (mounted) setError(reason instanceof Error ? reason.message : "Unable to load clients."); })
        .finally(() => { if (mounted) setLoading(false); });
    }, 0);
    return () => { mounted = false; window.clearTimeout(loadTimer); };
  }, [loadClients, organization?.id]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => !query || client.name.toLowerCase().includes(query) || client.companyName?.toLowerCase().includes(query) || client.email?.toLowerCase().includes(query));
  }, [clients, search]);

  function openAddClient() {
    setFormError("");
    setName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setStatus("ACTIVE");
    setIsAddOpen(true);
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !name.trim()) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      const createdClient = await apiRequest<Client>(`/organizations/${organization.id}/clients`, getToken, {
        method: "POST",
        json: {
          name: name.trim(),
          companyName: companyName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          status,
        },
      });
      setClients((current) => [createdClient, ...current]);
      setIsAddOpen(false);
    } catch (reason: unknown) {
      setFormError(reason instanceof Error ? reason.message : "Unable to create client.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoaded || organizationLoading || (organization && loading)) return <div className={styles.loadingState}>Loading clients...</div>;
  if (!isSignedIn) return <div className={styles.loadingState}>Sign in to access clients.</div>;
  if (!organization) return <div className={styles.emptyStation}><div className={styles.emptyIconBox}><Building2 size={22} /></div><h4>No workspace selected</h4><p>Create a workspace before managing clients.</p><Link href="/" className={styles.primaryAction}><Plus size={14} /> Create workspace</Link></div>;

  return (
    <section className={styles.projectsPage}>
      <header className={styles.projectsPageHeader}>
        <div className={styles.commandLeft}><p className={styles.overline}>RELATIONSHIPS</p><h1>Clients</h1><p className={styles.commandSubtitle}>Manage client relationships and open their workspace.</p></div>
        <div className={styles.clientHeaderActions}><label className={styles.searchPill}><Search size={13} /><span className={styles.srOnly}>Search clients</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients" /></label><button type="button" className={styles.primaryAction} onClick={openAddClient}><Plus size={14} /> Add client</button></div>
      </header>
      {(organizationError || error) && <div className={styles.errorBanner} role="alert"><span><AlertCircle size={15} /> {organizationError ?? error}</span><button type="button" className={styles.closeBtn} onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
      {filteredClients.length ? <div className={styles.clientDirectoryList}>{filteredClients.map((client) => <article className={styles.clientDirectoryRow} key={client.id}><Link href={`/dashboard/clients/${client.id}`} className={styles.clientDirectoryIdentity}><span className={styles.clientAvatar}>{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.companyName || client.email || "No company details"}</small></span></Link><span className={`${styles.statusBadge} ${client.status === "ACTIVE" ? styles.badgeActive : client.status === "LEAD" ? styles.badgePlanning : styles.badgeCompleted}`}>{client.status}</span><span className={styles.clientDirectoryMeta}>{client.projects?.length ?? 0} projects {client.email && <><span>•</span><Mail size={12} /> {client.email}</>}</span><span className={styles.clientDirectoryActions}><Link href={`/dashboard/clients/${client.id}`} className={styles.projectIconButton} aria-label={`Open ${client.name} workspace`} title="Open client workspace"><LayoutDashboard size={13} /></Link><button type="button" className={styles.projectIconButton} aria-label={`Edit ${client.name}`} title="Edit client"><Pencil size={13} /></button><button type="button" className={styles.projectIconButton} aria-label={`Delete ${client.name}`} title="Delete client"><Trash2 size={13} /></button></span></article>)}</div> : <div className={styles.emptyStation}><div className={styles.emptyIconBox}><Building2 size={22} /></div><h4>{clients.length ? "No matching clients" : "No clients yet"}</h4><p>{clients.length ? "Try a different search." : "Add your first client to begin the relationship workspace."}</p><button type="button" className={styles.primaryAction} onClick={openAddClient}><Plus size={14} /> Add client</button></div>}
      {isAddOpen && <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="client-create-title" onClick={(event) => { if (event.target === event.currentTarget) setIsAddOpen(false); }}>
        <div className={styles.modalSheet}>
          <div className={styles.modalHeader}><div><p className={styles.overline}>RELATIONSHIPS</p><h3 id="client-create-title">Add client</h3></div><button type="button" className={styles.closeBtn} onClick={() => setIsAddOpen(false)} aria-label="Close add client dialog"><X size={16} /></button></div>
          <form className={styles.modalForm} onSubmit={createClient}>
            {formError && <div className={styles.modalErrorMsg}>{formError}</div>}
            <div className={styles.formRow}><label htmlFor="directory-client-name">Contact Full Name *</label><input id="directory-client-name" required minLength={2} maxLength={120} placeholder="e.g. Rachel Foster" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></div>
            <div className={styles.formRow}><label htmlFor="directory-client-company">Company / Entity</label><input id="directory-client-company" placeholder="e.g. Starlight Media Group" maxLength={160} value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}><div className={styles.formRow}><label htmlFor="directory-client-email">Work Email</label><input id="directory-client-email" type="email" placeholder="rachel@starlight.io" value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className={styles.formRow}><label htmlFor="directory-client-status">Stage</label><select id="directory-client-status" value={status} onChange={(event) => setStatus(event.target.value as Client["status"])}><option value="ACTIVE">Active</option><option value="LEAD">Lead</option><option value="PAST">Past</option></select></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}><div className={styles.formRow}><label htmlFor="directory-client-phone">Phone</label><input id="directory-client-phone" type="tel" placeholder="+1 555 010 2026" value={phone} onChange={(event) => setPhone(event.target.value)} /></div><div className={styles.formRow}><label htmlFor="directory-client-notes">Notes</label><textarea id="directory-client-notes" placeholder="Relationship context, preferences, or next steps..." value={notes} onChange={(event) => setNotes(event.target.value)} /></div></div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondaryAction} onClick={() => setIsAddOpen(false)}>Cancel</button><button type="submit" className={styles.primaryAction} disabled={isSubmitting || !name.trim()}>{isSubmitting ? "Saving..." : "Add client"}</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}