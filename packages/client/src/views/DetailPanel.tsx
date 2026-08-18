import { useState } from "react";
import type { EmailEvent, FieldProvenance, Job } from "@gradtracker/shared";
import {
  Button,
  Card,
  ConfidenceMeter,
  DeadlinePill,
  Icon,
  IconButton,
  StageBadge,
  Tag,
} from "../ds";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { deadlineWording, formatDeadline, formatEventDate } from "../format";

/**
 * The 380px detail panel (T5.6).
 *
 * The panel's real job is to be honest about where each value came from. Every
 * extracted field carries **either** a confidence meter **or** an "Edited" tag
 * — never both, never neither (design.md §7). That is not decoration: it is
 * the difference between "the model guessed this" and "you told us this", and
 * a student correcting a deadline needs to know which they are looking at.
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
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
          <Header job={detail.data.job} />
          <Fields job={detail.data.job} />
          <Timeline events={detail.data.timeline} />
          <Button
            variant="quiet"
            iconLeft="archive"
            disabled={busy}
            fullWidth
            onClick={() => void withdraw()}
          >
            Withdraw application
          </Button>
        </>
      ) : null}
    </aside>
  );
}

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
