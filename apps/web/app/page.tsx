"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import styles from "./page.module.css";

type Organization = { id: string; name: string; slug: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function makeSlug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function Home() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const slug = makeSlug(name);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void (async () => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/organizations`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "We could not load your workspace.");
      setOrganizations(body);
      setLoading(false);
    })().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
      setLoading(false);
    });
  }, [getToken, isLoaded, isSignedIn]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/organizations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: makeSlug(name) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "We could not create your workspace.");
      router.push("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded || (isSignedIn && loading)) return <main className={styles.page}><p className={styles.status}>Preparing your workspace...</p></main>;
  if (!isSignedIn) return <main className={styles.page}><Link className={styles.authLink} href="/auth">Sign in to continue <span>{"->"}</span></Link></main>;

  return <main className={styles.page}><section className={styles.shell}>
    <div className={styles.eyebrow}><span className={styles.brand}><span className={styles.mark}>O</span> OPSFLOW</span><span className={styles.headerNote}>YOUR OPERATIONS SPACE</span></div>
      <div className={styles.content}>
        <div className={styles.intro}><p className={styles.kicker}>Workspace setup</p><h1>{organizations.length > 0 ? <>Your workspaces,<br /><em>all in one place.</em></> : <>Build a home<br />for <em>good work.</em></>}</h1><p className={styles.lede}>{organizations.length > 0 ? "You already have a workspace ready. Open it, or create a new space for another team." : "A focused space for your projects, people, and the momentum between them."}</p></div>
        {organizations.length > 0 && <div className={styles.existing}><p className={styles.sectionLabel}>Your workspaces</p>{organizations.map((organization) => <Link className={styles.organization} href="/dashboard" key={organization.id}><span>{organization.name.slice(0, 1).toUpperCase()}</span><div><strong>{organization.name}</strong><small>{organization.slug}</small></div><ArrowUpRight className={styles.rowIcon} aria-hidden="true" /></Link>)}</div>}
        <form onSubmit={createOrganization} className={styles.form}><div className={styles.formTitle}><span>{organizations.length > 0 ? "New workspace" : "Name your workspace"}</span><small>Free to start</small></div><label htmlFor="workspace">Workspace name</label><div className={styles.inputRow}><input id="workspace" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Syle Tech" autoComplete="organization" /><button disabled={submitting || !slug}>{submitting ? "Creating..." : "Create workspace"}<ArrowUpRight size={17} aria-hidden="true" /></button></div><div className={styles.inputMeta}><small>{slug ? `opsflow.local / ${slug}` : "Your name becomes a simple workspace address"}</small>{slug && <span>Available</span>}</div>{error && <p className={styles.error} role="alert">{error}</p>}</form>
        <div className={styles.promise}><Sparkles size={18} aria-hidden="true" /><p><strong>Everything in one rhythm.</strong><br />Projects, tasks, clients, and invoices live together.</p></div>
      </div><footer><span>Built for teams that move with intent.</span><span>© 2026 OPSFLOW</span></footer>
  </section></main>;
}
