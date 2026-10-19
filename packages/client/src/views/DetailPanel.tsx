import { useEffect, useId, useRef, useState } from "react";
import type { EmailEvent, FieldProvenance, Job } from "@gradtracker/shared";
import { Meter } from "./Meter";
import { Button, CompanyLogo, EmptyState, Icon, IconButton, StageBadge, STAGES } from "../ui";
import { api, ApiError, NetworkError } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { deadlineWording, formatDeadline, formatEventDate } from "../format";
import { gmailLink, useMailboxAccount } from "../gmailLink";
import {
  EditFields,
  FIELD_LABELS,
  changedFields,
  editableFieldOf,
  formValues,
  toPatch,
  useFieldIds,
  type EditableField,
  type FieldError,
  type FormValues,
} from "./fields";

/**
 * The 380px detail panel (T5.6).
 *
 * The panel's real job is to be honest about where each value came from. Every
 * extracted field carries **either** a confidence meter **or** an "Edited" tag
 * — never both, never neither (design.md §7). That is not decoration: it is
 * the difference between "the model guessed this" and "you told us this", and
 * a student correcting a deadline needs to know which they are looking at.
 *
 * **Edit mode (T6.1, D27).** All five extractable fields become editable
 * together. Changes are held until Save commits them in one request; Cancel —
 * or Escape — discards them. Save sends only the fields actually changed, and
 * warns rather than silently replacing a value an ingest changed while the
 * panel was open.
 */

/**
 * How the panel sits (design.md §11, T5.8): beside the list from 1280px; over
 * it, with a scrim, from 768px; and on a phone, a full-screen sheet with a way
 * back. Over the list, it is a modal dialog — focus stays inside until Escape.
 */
export type PanelLayout = "inline" | "overlay" | "sheet";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DetailPanelProps {
  jobId: string;
  onClose: () => void;
  /** Called after a mutation so the list behind the panel re-reads. */
  onChanged: () => void;
  layout?: PanelLayout;
}

export function DetailPanel({ jobId, onClose, onChanged, layout = "inline" }: DetailPanelProps) {
  const detail = useAsync(() => api.getJob(jobId), [jobId]);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const editButtonId = useId();
  // Closing the editor hands focus back to the control that opened it.
  const refocusEdit = useRef(false);
  const asideRef = useRef<HTMLElement>(null);

  // Opening an application moves focus into it: from a row, by keyboard, the
  // next Tab is the panel's first control, not the next row (T6.5).
  useEffect(() => {
    asideRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!editing && refocusEdit.current) {
      refocusEdit.current = false;
      document.getElementById(editButtonId)?.focus();
    }
  }, [editing, editButtonId]);

  const closeEditor = () => {
    refocusEdit.current = true;
    setEditing(false);
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      await api.withdrawJob(jobId);
      toast.show("Application withdrawn");
      detail.reload();
      onChanged();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not withdraw", "error");
    } finally {
      setBusy(false);
    }
  };

  const modal = layout !== "inline";
  // A landmark beside the list; a dialog over it. `aside` may not carry the
  // dialog role, so the element changes with it.
  const Element = modal ? "div" : "aside";

  /** Over the list, Tab cycles inside the panel; Escape is the way out. */
  const holdFocus = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Tab" || !asideRef.current) return;
    const focusable = [...asideRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === asideRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const panel = (
    <Element
      // `div` or `aside`: both are plain HTMLElements, which is all the ref needs.
      ref={asideRef as React.RefObject<HTMLDivElement>}
      aria-label="Application detail"
      {...(modal ? { role: "dialog", "aria-modal": true } : {})}
      tabIndex={-1}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        // Escape closes the panel (app-flow.md §2) — unless an editor inside
        // already used it to cancel.
        if (e.key === "Escape" && !e.defaultPrevented) {
          e.preventDefault();
          onClose();
          return;
        }
        if (modal) holdFocus(e);
      }}
      className={`gt-panel ${layout}`}
    >
      <div className="gt-panel-top">
        {layout === "sheet" ? (
          <Button variant="ghost" iconLeft="chevron-left" onClick={onClose}>
            Back to applications
          </Button>
        ) : (
          <span>Application details</span>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {detail.data && !editing ? (
            <Button id={editButtonId} variant="quiet" size="sm" iconLeft="pencil" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : null}
          {layout === "sheet" ? null : <IconButton icon="x" label="Close detail panel" onClick={onClose} />}
        </span>
      </div>

      {detail.loading && !detail.data ? (
        <p style={{ color: "var(--muted)", padding: "24px 0" }}>Loading…</p>
      ) : detail.error instanceof ApiError && detail.error.status === 404 ? (
        // A bookmarked or shared link to an application that has gone — not
        // yours, or never was (app-flow.md §7). Say so, and lead back.
        <EmptyState
          icon="layers"
          title="That application no longer exists."
          action={<Button onClick={onClose}>Back to the pipeline</Button>}
          compact
        />
      ) : detail.error ? (
        <p style={{ color: "var(--muted)", padding: "24px 0" }}>
          {detail.offline ? "You are offline." : detail.error.message}
        </p>
      ) : detail.data ? (
        <>
          {editing ? (
            <div style={{ paddingTop: 22 }}>
            <EditForm
              job={detail.data.job}
              onCancel={closeEditor}
              onSaved={() => {
                closeEditor();
                toast.show("Application updated");
                detail.reload();
                onChanged();
              }}
            />
            </div>
          ) : (
            <>
              <Header job={detail.data.job} />
              <Fields job={detail.data.job} />
            </>
          )}
          <Timeline events={detail.data.timeline} />
          <div className="gt-ai-note">
            <Icon name="sparkles" size={17} />
            <p>
              <strong>Why am I seeing this?</strong>
              <span>These details were read from your emails. GradTracker never stores the content of an email.</span>
            </p>
          </div>
          {editing ? null : (
            <Button variant="danger" disabled={busy} fullWidth onClick={() => void withdraw()}>
              Withdraw application
            </Button>
          )}
        </>
      ) : null}
    </Element>
  );

  if (layout !== "overlay") return panel;

  return (
    <>
      {/* The scrim: the list behind is still there, dimmed, and a click on it
          closes the panel. Hidden from assistive technology — Escape and the
          close button are the named ways out. */}
      <div data-scrim aria-hidden="true" onClick={onClose} className="gt-overlay" />
      {panel}
    </>
  );
}

// ── Edit mode ───────────────────────────────────────────────────────────────

interface StaleEdit {
  /** The application as it is now. */
  latest: Job;
  /** The fields the student changed that an ingest has also changed. */
  fields: EditableField[];
}

function EditForm({ job, onCancel, onSaved }: { job: Job; onCancel: () => void; onSaved: () => void }) {
  const toast = useToast();
  const ids = useFieldIds();
  const keepEditingId = useId();
  // What the student is editing against. Moves only when they have seen a
  // newer version — "Keep editing" after a stale-edit warning.
  const [baseline, setBaseline] = useState<Job>(job);
  // Only the fields the student has touched.
  const [draft, setDraft] = useState<Partial<FormValues>>({});
  const [error, setError] = useState<FieldError | null>(null);
  const [stale, setStale] = useState<StaleEdit | null>(null);
  const [saving, setSaving] = useState(false);

  const original = formValues(baseline);
  const values: FormValues = { ...original, ...draft };

  // Where focus goes after the next render: the first field on opening, a
  // refused field (with its typing kept), the safe choice when the stale-edit
  // warning appears, and the changed field once the student has seen it.
  const focusNext = useRef<string | null>(ids.company);
  useEffect(() => {
    if (focusNext.current === null) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const change = (field: EditableField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (error?.field === field) setError(null);
  };

  const save = async (overwrite: boolean) => {
    if (saving) return;
    const fields = changedFields(values, original);
    if (fields.length === 0) {
      // Nothing to send — and nothing sent, so no field becomes Edited.
      toast.show("No changes to save", "info");
      onCancel();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (!overwrite) {
        // Did an ingest change any field the student is about to replace?
        const latest = (await api.getJob(baseline.id)).job;
        const now = formValues(latest);
        const moved = fields.filter((field) => now[field] !== original[field]);
        if (moved.length > 0) {
          focusNext.current = keepEditingId;
          setStale({ latest, fields: moved });
          return;
        }
      }
      setStale(null);
      await api.updateJob(baseline.id, toPatch(values, fields));
      onSaved();
    } catch (cause) {
      const field = cause instanceof ApiError ? editableFieldOf(cause.field) : null;
      if (field && cause instanceof ApiError) {
        focusNext.current = ids[field];
        setError({ field, message: cause.message });
      } else {
        toast.show(
          cause instanceof NetworkError
            ? "You are offline — nothing was saved."
            : cause instanceof Error
              ? cause.message
              : "Could not save",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const keepEditing = () => {
    if (!stale) return;
    // The student has now seen the newer values. Their own edits stay.
    focusNext.current = ids[stale.fields[0]!];
    setBaseline(stale.latest);
    setStale(null);
  };

  return (
    <form
      aria-label="Edit application"
      className="gt-fields"
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
    >
      <EditFields values={values} onChange={change} ids={ids} error={error} />

      {stale ? (
        <StaleWarning
          stale={stale}
          keepEditingId={keepEditingId}
          onOverwrite={() => void save(true)}
          onKeepEditing={keepEditing}
        />
      ) : (
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <Button type="submit" aria-busy={saving || undefined}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}

/** The value a field has now, in the words the panel uses for it. */
function describe(field: EditableField, job: Job): string {
  switch (field) {
    case "company":
      return `“${job.company}”`;
    case "role":
      return `“${job.role}”`;
    case "stage":
      return STAGES[job.stage].label;
    case "deadlineAt":
      return job.deadlineAt ? formatDeadline(job.deadlineAt) : "not set";
    case "nextAction":
      return job.nextAction ? `“${job.nextAction}”` : "not set";
  }
}

function StaleWarning({
  stale,
  keepEditingId,
  onOverwrite,
  onKeepEditing,
}: {
  stale: StaleEdit;
  keepEditingId: string;
  onOverwrite: () => void;
  onKeepEditing: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        borderRadius: 9,
        border: "1px solid color-mix(in srgb, var(--amber) 30%, var(--line))",
        background: "var(--amber-soft)",
        fontSize: 14,
      }}
    >
      <p style={{ margin: 0, display: "flex", gap: "var(--space-sm)", color: "var(--text-heading)" }}>
        <Icon name="triangle-alert" size={16} />
        This application changed while you were editing.
      </p>
      <ul style={{ margin: 0, paddingLeft: "var(--space-xl)", color: "var(--text-body)" }}>
        {stale.fields.map((field) => (
          <li key={field}>
            {FIELD_LABELS[field]} is now {describe(field, stale.latest)}
          </li>
        ))}
      </ul>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--caption-size)" }}>
        Save anyway replaces {stale.fields.length === 1 ? "it" : "them"} with yours.
      </p>
      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <Button type="button" size="sm" onClick={onOverwrite}>
          Save anyway
        </Button>
        <Button id={keepEditingId} type="button" size="sm" variant="quiet" onClick={onKeepEditing}>
          Keep editing
        </Button>
      </div>
    </div>
  );
}

// ── Reading ─────────────────────────────────────────────────────────────────

function Header({ job }: { job: Job }) {
  const company = job.provenance.find((p) => p.field === "company");
  return (
    <header className="gt-detail-head">
      <CompanyLogo company={job.company} large />
      <div style={{ minWidth: 0 }}>
        <h2>
          {job.company}
          {company?.source === "human" ? (
            <span className="gt-edited-tag" style={{ marginLeft: 8, verticalAlign: "middle" }}>
              <Icon name="check" size={11} />
              Edited
            </span>
          ) : null}
        </h2>
        <p>{job.role}</p>
      </div>
    </header>
  );
}

/**
 * A field shows a meter or an "Edited" tag — never both, never neither
 * (design.md §7).
 *
 * `hasValue` is not decoration. A withdrawn application has no next action,
 * but its `next_action` provenance row still says the model was 94% sure of
 * the value it extracted weeks ago. Rendering that meter beside "Nothing
 * outstanding" reads as "94% confident there is nothing to do", which is a
 * claim the product never made.
 */
function provenanceShown(entry: FieldProvenance | undefined, hasValue: boolean): boolean {
  return entry !== undefined && hasValue && (entry.source === "human" || entry.confidence !== null);
}

function Provenance({ entry, id }: { entry: FieldProvenance; id: string }) {
  // The id is what the field's value points at with `aria-describedby`, so a
  // screen reader hears "Edited" or the confidence with it (design.md §10.3).
  return entry.source === "human" ? (
    <span id={id} className="gt-edited-tag">
      <Icon name="check" size={11} />
      Edited
    </span>
  ) : (
    <Meter id={id} value={entry.confidence ?? 0} />
  );
}

function Fields({ job }: { job: Job }) {
  const provenance = (field: string) => job.provenance.find((p) => p.field === field);
  const next = provenance("next_action");
  const nextShown = provenanceShown(next, job.nextAction !== null);
  const nextId = useId();

  return (
    <>
      <dl className="gt-next-card" style={{ margin: 0 }}>
        <div>
          <dt className="label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            Next action
            {nextShown && next ? <Provenance entry={next} id={nextId} /> : null}
          </dt>
          <dd style={{ margin: 0 }} aria-describedby={nextShown ? nextId : undefined}>
            <strong>{job.nextAction ?? "Nothing outstanding"}</strong>
            <span>
              <Icon name="calendar" size={15} />
              {job.deadlineAt && job.daysLeft !== null ? deadlineWording(job.daysLeft) : "No deadline"}
            </span>
          </dd>
        </div>
      </dl>

      <section className="gt-panel-section">
        <h3>Application details</h3>
        <dl style={{ margin: 0 }}>
          <Field label="Stage" provenance={undefined} hasValue>
            <StageBadge stage={job.stage} />
          </Field>
          <Field label="Deadline" provenance={provenance("deadline_at")} hasValue={job.deadlineAt !== null}>
            {job.deadlineAt ? (
              <strong style={job.daysLeft !== null && job.daysLeft <= 2 ? { color: "var(--ruby-deep)" } : undefined}>
                {formatDeadline(job.deadlineAt)}
              </strong>
            ) : (
              <Blank>No deadline found</Blank>
            )}
          </Field>
          <Field label="Source" provenance={undefined} hasValue={job.senderDomain !== null}>
            {job.senderDomain ? job.senderDomain : <Blank>Unknown sender</Blank>}
          </Field>
        </dl>
      </section>
    </>
  );
}

function Field({
  label,
  provenance,
  hasValue,
  children,
}: {
  label: string;
  provenance: FieldProvenance | undefined;
  hasValue: boolean;
  children: React.ReactNode;
}) {
  const provenanceId = useId();
  const shown = provenanceShown(provenance, hasValue);
  return (
    <div className="gt-field-row">
      <dt style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {label}
        {shown && provenance ? <Provenance entry={provenance} id={provenanceId} /> : null}
      </dt>
      <dd aria-describedby={shown ? provenanceId : undefined}>{children}</dd>
    </div>
  );
}

/** Blank means blank — no placeholder content (design.md §9). */
function Blank({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--muted)", fontWeight: 400 }}>{children}</span>;
}

function Timeline({ events }: { events: EmailEvent[] }) {
  const account = useMailboxAccount();
  return (
    <section className="gt-panel-section">
      <h3>Activity</h3>
      {events.length === 0 ? (
        <Blank>No emails recorded against this application.</Blank>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {events.map((event) => {
            const link = gmailLink(event.gmailMessageId, account);
            return (
              <li key={event.id} className="gt-event">
                <i aria-hidden="true" />
                <div className="gt-event-body">
                  <strong>{event.detectedStage ? STAGES[event.detectedStage].label : "Email received"}</strong>
                  <small>
                    {event.senderDomain ? `From ${event.senderDomain}` : "Sender unknown"}
                    {event.detectedRole ? ` · ${event.detectedRole}` : ""}
                  </small>
                  <small className="gt-num">{formatEventDate(event.receivedAt)}</small>
                </div>
                {link ? (
                  <a
                    // A deep link, not the email itself (SM-6, D38).
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Gmail ↗
                  </a>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
