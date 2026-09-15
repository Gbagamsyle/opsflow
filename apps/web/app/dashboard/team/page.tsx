"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, Check, ShieldCheck, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

  if (!isLoaded || organizationLoading || loading) {
    return <div className={styles.loadingState}>Loading team...</div>;
  }

  if (!isSignedIn) {
    return <div className={styles.loadingState}>Sign in to access your team.</div>;
  }

  const ownerCount = members.filter((member) => member.role === "OWNER").length;
  const adminCount = members.filter((member) => member.role === "ADMIN").length;
  const memberCount = members.filter((member) => member.role === "MEMBER").length;

  return (
    <section className={styles.teamPage}>
      <header className={styles.teamHeader}>
        <div className={styles.teamHeaderCopy}>
          <h1>Team <span>directory</span></h1>
          <p className={styles.teamSubtitle}>The people and permissions behind {organization?.name ?? "your workspace"}.</p>
        </div>
      </header>

      {(organizationError || error) && (
        <div className={styles.errorBanner} role="alert">
          <span><AlertCircle size={15} aria-hidden="true" /> {organizationError ?? error}</span>
          <button type="button" className={styles.closeButton} onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button>
        </div>
      )}

      <div className={styles.roleStats} aria-label="Team role summary">
        <div className={`${styles.roleStat} ${styles.roleStatOwner}`}><span className={styles.statIcon}><ShieldCheck size={15} /></span><span><strong>{ownerCount}</strong><small>Owner</small></span></div>
        <div className={`${styles.roleStat} ${styles.roleStatAdmin}`}><span className={styles.statIcon}><UsersRound size={15} /></span><span><strong>{adminCount}</strong><small>Admins</small></span></div>
        <div className={`${styles.roleStat} ${styles.roleStatMember}`}><span className={styles.statIcon}><UserRound size={15} /></span><span><strong>{memberCount}</strong><small>Members</small></span></div>
      </div>

      <div className={styles.memberTableShell}>
        <div className={styles.tableIntro}><div><p className={styles.tableEyebrow}>PEOPLE</p><h2>Workspace members</h2></div><span className={styles.liveStatus}><span /> Live directory</span></div>
        <div className={styles.memberTable} role="table" aria-label="Workspace team members">
          <div className={styles.memberTableHeader} role="row">
            <span role="columnheader">Member</span>
            <span role="columnheader">Role</span>
            <span role="columnheader">Joined</span>
            <span role="columnheader">Actions</span>
          </div>
          {members.length === 0 && <div className={styles.emptyMembers}><UsersRound size={22} /><strong>No members yet</strong><span>Workspace members will appear here.</span></div>}
          {members.map((member) => {
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
    </section>
  );
}
