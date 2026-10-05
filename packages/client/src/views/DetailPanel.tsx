import { useEffect, useId, useRef, useState } from "react";
import type { EmailEvent, FieldProvenance, Job } from "@gradtracker/shared";
import {
  Button,
  Card,
  ConfidenceMeter,
  DeadlinePill,
  Icon,
  IconButton,
  StageBadge,
  STAGES,
  Tag,
} from "../ds";
import { api, ApiError, NetworkError } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { deadlineWording, formatDeadline, formatEventDate } from "../format";
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

const GMAIL_SEARCH = "https://mail.google.com/mail/u/0/#search/";

export interface DetailPanelProps {
  jobId: string;
  onClose: () => void;
  /** Called after a mutation so the list behind the panel re-reads. */
  onChanged: () => void;
}

export function DetailPanel({ jobId, onClose, onChanged }: DetailPanelProps) {
  const detail = useAsync(() => api.getJob(jobId), [jobId]);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const editButtonId = useId();
  // Closing the editor hands focus back to the control that opened it.
  const refocusEdit = useRef(false);

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

  return (
    <aside
      aria-label="Application detail"
      style={{
        width: "var(--panel-w, 380px)",
        flex: "0 0 auto",
        borderLeft: "1px solid var(--border-hairline)",
        background: "var(--surface-card)",
        padding: "var(--space-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-lg)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "var(--space-xs)" }}>
        {detail.data && !editing ? (
          <Button id={editButtonId} variant="quiet" size="sm" iconLeft="pencil" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
        <IconButton icon="x" label="Close detail panel" onClick={onClose} />
      </div>

      {detail.loading && !detail.data ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : detail.error ? (
        <p style={{ color: "var(--text-muted)" }}>
          {detail.offline ? "You are offline." : detail.error.message}
        </p>
      ) : detail.data ? (
        <>
          {editing ? (
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
          ) : (
            <>
              <Header job={detail.data.job} />
              <Fields job={detail.data.job} />
            </>
          )}
          <Timeline events={detail.data.timeline} />
          {editing ? null : (
            <Button
              variant="quiet"
              iconLeft="archive"
              disabled={busy}
              fullWidth
              onClick={() => void withdraw()}
            >
              Withdraw application
            </Button>
          )}
        </>
      ) : null}
    </aside>
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
        gap: "var(--space-sm)",
        padding: "var(--space-md)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-sunken)",
        fontSize: "var(--body-tabular-size)",
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
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
      <h2
        style={{
          margin: 0,
          fontSize: "var(--heading-md-size)",
          fontWeight: "var(--weight-thin)",
          letterSpacing: "var(--heading-md-ls)",
          color: "var(--text-heading)",
        }}
      >
        {job.company}
      </h2>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--body-size)" }}>
        {job.role}
      </p>
      <div style={{ marginTop: "var(--space-xs)" }}>
        <StageBadge stage={job.stage} />
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
function Provenance({ entry, hasValue }: { entry: FieldProvenance | undefined; hasValue: boolean }) {
  if (!entry || !hasValue) return null;
  return entry.source === "human" ? (
    <Tag>Edited</Tag>
  ) : entry.confidence !== null ? (
    <ConfidenceMeter value={entry.confidence} showValue />
  ) : null;
}

function Fields({ job }: { job: Job }) {
  const provenance = (field: string) => job.provenance.find((p) => p.field === field);

  return (
    <Card padding="compact" surface="sunken" elevation={0}>
      <dl style={{ margin: 0, display: "grid", gap: "var(--space-md)" }}>
        <Field label="Deadline" provenance={provenance("deadline_at")} hasValue={job.deadlineAt !== null}>
          {job.deadlineAt ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)" }}>
              <DeadlinePill {...(job.daysLeft !== null ? { daysLeft: job.daysLeft } : {})}>
                {formatDeadline(job.deadlineAt)}
              </DeadlinePill>
              {job.daysLeft !== null ? (
                <span style={{ color: "var(--text-muted)", fontSize: "var(--caption-size)" }}>
                  {deadlineWording(job.daysLeft)}
                </span>
              ) : null}
            </span>
          ) : (
            <Blank>No deadline found</Blank>
          )}
        </Field>

        <Field label="Next action" provenance={provenance("next_action")} hasValue={job.nextAction !== null}>
          {job.nextAction ?? <Blank>Nothing outstanding</Blank>}
        </Field>

        <Field label="Detected from" provenance={undefined} hasValue={job.senderDomain !== null}>
          {job.senderDomain ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="mail" size={14} />
              {job.senderDomain}
            </span>
          ) : (
            <Blank>Unknown sender</Blank>
          )}
        </Field>
      </dl>
    </Card>
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
  return (
    <div>
      <dt
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          fontSize: "var(--micro-cap-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {label}
        <Provenance entry={provenance} hasValue={hasValue} />
      </dt>
      <dd style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--body-size)" }}>
        {children}
      </dd>
    </div>
  );
}

/** Blank means blank — no placeholder content (design.md §9). */
function Blank({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--text-muted)" }}>{children}</span>;
}

function Timeline({ events }: { events: EmailEvent[] }) {
  if (events.length === 0) {
    return (
      <section>
        <SectionTitle>Timeline</SectionTitle>
        <Blank>No emails recorded against this application.</Blank>
      </section>
    );
  }

  return (
    <section>
      <SectionTitle>Timeline</SectionTitle>
      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {events.map((event) => (
          <li
            key={event.id}
            style={{
              padding: "var(--space-sm) 0",
              borderBottom: "1px solid var(--border-hairline)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              {event.detectedStage ? <StageBadge stage={event.detectedStage} size="sm" /> : <span />}
              <span
                className="gt-num"
                style={{ color: "var(--text-muted)", fontSize: "var(--caption-size)" }}
              >
                {formatEventDate(event.receivedAt)}
              </span>
            </div>

            <span style={{ color: "var(--text-muted)", fontSize: "var(--caption-size)" }}>
              {event.detectedCompany ?? "Unknown company"}
              {event.detectedRole ? ` · ${event.detectedRole}` : ""}
            </span>

            {event.senderDomain ? (
              <a
                // A deep link, not the email itself. GradTracker stores no
                // subject or body, so the only honest way to show a student
                // the source is to send them to their own inbox (SM-6).
                href={`${GMAIL_SEARCH}${encodeURIComponent(`rfc822msgid:${event.gmailMessageId}`)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "var(--caption-size)",
                }}
              >
                <Icon name="external-link" size={12} />
                Open in Gmail · {event.senderDomain}
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "0 0 var(--space-sm)",
        fontSize: "var(--micro-cap-size)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: "var(--weight-medium)",
      }}
    >
      {children}
    </h3>
  );
}
