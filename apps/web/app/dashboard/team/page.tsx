"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, Check, MailPlus, Search, ShieldCheck, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentOrganization } from "../../../src/hooks/use-current-organization";
import { useOrganizationRealtime } from "../../../src/hooks/use-organization-realtime";
import { apiRequest } from "../../../src/lib/api";
import styles from "./team.module.css";

const roles = ["OWNER", "ADMIN", "MEMBER"] as const;
type Role = (typeof roles)[number];

type Member = {
  id: string;
  userId: string;
  role: Role;
  joinedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    clerkUserId: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
};

function memberName(member: Member) {
  return [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email;
}

function joinedDate(member: Member) {
  const date = member.joinedAt ?? member.createdAt;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TeamPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user: currentUser } = useUser();
  const { organization, role: currentRole, loading: organizationLoading, error: organizationError } = useCurrentOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");

  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";

  const loadMembers = useCallback(async (organizationId: string) => {
    const data = await apiRequest<Member[]>(`/organizations/${organizationId}/members`, getToken);
    setMembers(data);
  }, [getToken]);

  useOrganizationRealtime(organization?.id, (event) => {
    if (event.resource !== "member") return;
    void loadMembers(event.organizationId).catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : "Unable to sync team members.");
    });
  });

  useEffect(() => {
    if (!organization?.id) return;
    let mounted = true;
    const loadTimer = window.setTimeout(() => {
      void loadMembers(organization.id)
        .catch((requestError: unknown) => {
          if (mounted) setError(requestError instanceof Error ? requestError.message : "Unable to load team members.");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(loadTimer);
    };
  }, [loadMembers, organization?.id]);

  async function updateRole(member: Member, nextRole: Role) {
    if (!organization || !canManage || member.role === "OWNER" || member.user.clerkUserId === currentUser?.id) return;
    setSavingUserId(member.userId);
    setError("");
    try {
      await apiRequest(`/organizations/${organization.id}/members/${member.userId}/role`, getToken, {
        method: "PATCH",
        json: { role: nextRole },
      });
      await loadMembers(organization.id);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update member role.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function removeMember(member: Member) {
    if (!organization || !canManage || member.role === "OWNER") return;
    if (!window.confirm(`Remove ${memberName(member)} from this workspace?`)) return;
    setSavingUserId(member.userId);
    setError("");
    try {
      await apiRequest(`/organizations/${organization.id}/members/${member.userId}`, getToken, { method: "DELETE" });
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to remove member.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !canManage || !inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError("");
    try {
      await apiRequest(`/organizations/${organization.id}/members/invites`, getToken, {
        method: "POST",
        json: { email: inviteEmail.trim().toLowerCase() },
      });
      await loadMembers(organization.id);
      setInviteEmail("");
      setIsInviteOpen(false);
    } catch (requestError: unknown) {
      setInviteError(requestError instanceof Error ? requestError.message : "Unable to invite member.");
    } finally {
      setIsInviting(false);
    }
  }

  if (!isLoaded || organizationLoading || loading) {
    return <div className={styles.loadingState}>Loading team...</div>;
  }

  if (!isSignedIn) {
    return <div className={styles.loadingState}>Sign in to access your team.</div>;
  }
  if (!organization) return <div className={styles.emptyMembers}><UsersRound size={22} aria-hidden="true" /><strong>No workspace selected</strong><span>Create a workspace before inviting or managing team members.</span><Link href="/" className={styles.createWorkspaceLink}>Create workspace</Link></div>;

  const ownerCount = members.filter((member) => member.role === "OWNER").length;
  const adminCount = members.filter((member) => member.role === "ADMIN").length;
  const memberCount = members.filter((member) => member.role === "MEMBER").length;
  const inviteEmailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());
  const filteredMembers = members.filter((member) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || memberName(member).toLowerCase().includes(query) || member.user.email.toLowerCase().includes(query);
    return matchesQuery && (roleFilter === "ALL" || member.role === roleFilter);
  });

  return (
    <section className={styles.teamPage}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.tableEyebrow}>WORKSPACE PEOPLE</p>
          <h1>Team</h1>
        </div>
        {canManage && <button type="button" className={styles.inviteButton} onClick={() => { setInviteError(""); setIsInviteOpen(true); }}><MailPlus size={15} aria-hidden="true" /> Invite member</button>}
      </header>

      {(organizationError || error) && (
        <div className={styles.errorBanner} role="alert">
          <span><AlertCircle size={15} aria-hidden="true" /> {organizationError ?? error}</span>
          <button type="button" className={styles.closeButton} onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button>
        </div>
      )}

      <div className={styles.memberTableShell}>
        <div className={styles.tableIntro}>
          <div><h2>Workspace members</h2><span className={styles.liveStatus}><span /> Live directory</span></div>
          <div className={styles.memberSummary}><span><strong>{ownerCount}</strong> owner</span><span><strong>{adminCount}</strong> admin{adminCount === 1 ? "" : "s"}</span><span><strong>{memberCount}</strong> member{memberCount === 1 ? "" : "s"}</span></div>
        </div>
        <div className={styles.memberControls}>
          <label className={styles.searchField}><Search size={14} aria-hidden="true" /><span className={styles.srOnly}>Search team</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name or email" /></label>
          <label className={styles.filterField}><span className={styles.srOnly}>Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "ALL" | Role)}><option value="ALL">All roles</option><option value="OWNER">Owners</option><option value="ADMIN">Admins</option><option value="MEMBER">Members</option></select></label>
        </div>
        <div className={styles.memberTable} role="table" aria-label="Workspace team members">
          <div className={styles.memberTableHeader} role="row">
            <span role="columnheader">Member</span>
            <span role="columnheader">Role</span>
            <span role="columnheader">Joined</span>
            <span role="columnheader">Actions</span>
          </div>
          {members.length === 0 && <div className={styles.emptyMembers}><UsersRound size={22} /><strong>No members yet</strong><span>Invite someone to start building this workspace.</span>{canManage && <button type="button" className={styles.inviteButton} onClick={() => { setInviteError(""); setIsInviteOpen(true); }}><MailPlus size={14} aria-hidden="true" /> Invite member</button>}</div>}
          {members.length > 0 && filteredMembers.length === 0 && <div className={styles.emptyMembers}><Search size={22} /><strong>No matching members</strong><span>Try a different name, email, or role.</span></div>}
          {filteredMembers.map((member) => {
          const isOwner = member.role === "OWNER";
          const isSelf = member.user.clerkUserId === currentUser?.id;
          const isSaving = savingUserId === member.userId;
          const initials = memberName(member).slice(0, 1).toUpperCase();
          return (
            <div className={styles.memberRow} role="row" key={member.id}>
              <div className={styles.memberIdentity} role="cell">
                <span className={styles.memberAvatar}>{member.user.avatarUrl ? <span className={styles.memberAvatarImage} style={{ backgroundImage: `url(${member.user.avatarUrl})` }} aria-hidden="true" /> : initials}</span>
                <span><strong>{memberName(member)}</strong><small>{member.user.email}</small></span>
              </div>
              <div role="cell">
                <span className={`${styles.roleBadge} ${styles[`role${member.role}`]} ${isOwner ? styles.roleProtected : ""}`}>
                  {isOwner && <ShieldCheck size={12} aria-hidden="true" />}{member.role}
                </span>
              </div>
              <span className={styles.joinedDate} role="cell">{joinedDate(member)}</span>
              <div className={styles.memberActions} role="cell">
                {isOwner || isSelf || !canManage ? <span className={styles.protectedLabel}>{isOwner ? "Protected" : isSelf ? "Your account" : "View only"}</span> : <>
                  <label className={styles.srOnly} htmlFor={`role-${member.id}`}>Role for {memberName(member)}</label>
                  <select id={`role-${member.id}`} value={member.role} disabled={isSaving} onChange={(event) => void updateRole(member, event.target.value as Role)}>
                    {roles.filter((role) => role !== "OWNER").map((role) => <option value={role} key={role}>{role}</option>)}
                  </select>
                  <button type="button" className={styles.removeButton} disabled={isSaving} onClick={() => void removeMember(member)} aria-label={`Remove ${memberName(member)}`}><Trash2 size={14} /></button>
                </>}
                {isSaving && <span className={styles.savingIndicator} aria-label="Saving"><Check size={13} /></span>}
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {!canManage && <p className={styles.permissionNote}><UserRound size={14} aria-hidden="true" /> Only workspace owners and admins can change roles or remove members.</p>}

      {isInviteOpen && <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="invite-member-title" onClick={(event) => { if (event.target === event.currentTarget) setIsInviteOpen(false); }}>
        <div className={styles.modalSheet}>
          <div className={styles.modalHeader}><div><p className={styles.teamKicker}>WORKSPACE ACCESS</p><h2 id="invite-member-title">Invite a member</h2></div><button type="button" className={styles.closeButton} onClick={() => setIsInviteOpen(false)} aria-label="Close invite dialog"><X size={16} /></button></div>
          <form className={styles.inviteForm} onSubmit={inviteMember}>
            <p>Invite an existing Opsflow user by email. They will join as a member immediately.</p>
            {inviteError && <div className={styles.errorBanner} role="alert"><span><AlertCircle size={15} aria-hidden="true" /> {inviteError}</span></div>}
            <label htmlFor="invite-email">Email address</label>
            <input id="invite-email" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@example.com" autoFocus aria-invalid={Boolean(inviteEmail) && !inviteEmailIsValid} />
            {inviteEmail.length > 0 && !inviteEmailIsValid && <span className={styles.inviteHint}>Enter a valid email address, such as teammate@example.com.</span>}
            <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setIsInviteOpen(false)}>Cancel</button><button type="submit" className={styles.inviteButton} disabled={isInviting || !inviteEmailIsValid} title={!inviteEmailIsValid ? "Enter a valid email address first" : "Add member"}>{isInviting ? "Adding..." : "Add member"}</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}
