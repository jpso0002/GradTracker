import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { ConfirmReviewBody, ReviewItem } from "@gradtracker/shared";
import { Button, EmptyState, Icon, StageBadge, TopBar } from "../ds";
import { ViewTitle } from "../shell/ViewTitle";
import { Meter } from "./Meter";
import { api, ApiError, NetworkError } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { tokenDurationMs } from "../motion";
import { formatDeadline, formatEventDate } from "../format";
import {
  EditFields,
  changedFields,
  editableFieldOf,
  formValues,
  toPatch,
  useFieldIds,
  type EditableField,
  type FormValues,
} from "./fields";

/**
 * The review queue (T6.3).
 *
 * Every card is an email GradTracker would not assert on its own: the model
 * was too unsure, it found a stage only the student may set, or the email may
 * belong to an application already tracked (D26). Nothing on a card is a fact
 * until the student confirms it.
 *
 * Confirming as shown sends nothing but the answer. "Edit" sends only the
 * fields changed — the same rule as the panel (D27). A card with a suggested
 * application asks "the same application, or a new one?" first.
 *
 * Handled cards fade out on the motion tokens, so `prefers-reduced-motion`
 * removes them at once, and focus moves to the next card.
 */

export interface ReviewViewProps {
  /** Called after an item is confirmed or dismissed, so the sidebar re-counts. */
  onChanged?: () => void;
}

const cardId = (eventId: string) => `review-${eventId}`;

export function ReviewView({ onChanged }: ReviewViewProps) {
  const queue = useAsync(() => api.listReview(), []);
  const { hash } = useLocation();
  // Handled here, so gone from the list without a re-read.
  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set());
  // Fading out: still in the list for one animation.
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());
  const emptyRef = useRef<HTMLDivElement>(null);
  // Where focus goes once a handled card has left: the next card's id, or the
  // empty queue ("").
  const focusNext = useRef<string | null>(null);

  const items = (queue.data?.items ?? []).filter((item) => !handled.has(item.eventId));

  useEffect(() => {
    if (focusNext.current === null) return;
    const target = focusNext.current === "" ? emptyRef.current : document.getElementById(focusNext.current);
    focusNext.current = null;
    target?.focus();
  });

  // A row's "Review required" marker links to /review#review-<id>. The card
  // does not exist until the queue loads, so the browser cannot scroll to it.
  const linked = hash.startsWith("#review-") ? hash.slice(1) : null;
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || linked === null || !queue.data) return;
    landed.current = true;
    document.getElementById(linked)?.focus();
  }, [linked, queue.data]);

  const handle = (eventId: string) => {
    const index = items.findIndex((item) => item.eventId === eventId);
    const stillHere = (item: ReviewItem) => item.eventId !== eventId && !leaving.has(item.eventId);
    const next = items.slice(index + 1).find(stillHere) ?? items.slice(0, index).reverse().find(stillHere);

    setLeaving((current) => new Set(current).add(eventId));
    window.setTimeout(() => {
      focusNext.current = next ? cardId(next.eventId) : "";
      setHandled((current) => new Set(current).add(eventId));
    }, tokenDurationMs("--dur-base"));
    onChanged?.();
  };

  const count = items.length;
  return (
    <>
      <ViewTitle title="Needs review" />
      <TopBar
        title="Needs review"
        {...(queue.data && count > 0 ? { subtitle: `${count} ${count === 1 ? "email" : "emails"} to check` } : {})}
      />
      <div
        style={{
          padding: "var(--space-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
          maxWidth: "calc(var(--container-max) / 2)",
        }}
      >
        {queue.loading && !queue.data ? (
          <CardSkeleton />
        ) : queue.offline ? (
          <EmptyState
            icon="wifi-off"
            title="You are offline"
            description="GradTracker cannot reach the server. Nothing in the queue has changed."
            action={<Button onClick={queue.reload}>Try again</Button>}
          />
        ) : queue.error ? (
          <EmptyState
            icon="triangle-alert"
            title="Could not load the review queue"
            description={queue.error.message}
            action={<Button onClick={queue.reload}>Try again</Button>}
          />
        ) : count === 0 ? (
          <div ref={emptyRef} tabIndex={-1} style={{ borderRadius: "var(--radius-lg)" }}>
            <EmptyState
              icon="mail-check"
              title="Nothing to review"
              description="GradTracker was confident about everything it found."
            />
          </div>
        ) : (
          <>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              These emails look like applications. Confirm what GradTracker read, or dismiss the ones
              that aren’t.
            </p>
            <section aria-label="Emails to review" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              {items.map((item) => (
                <ReviewCard
                  key={item.eventId}
                  item={item}
                  leaving={leaving.has(item.eventId)}
                  onHandled={handle}
                />
              ))}
            </section>
          </>
        )}
      </div>
    </>
  );
}

// ── One card ────────────────────────────────────────────────────────────────

type Answer = "same" | "new";

interface CardError {
  field: EditableField | "application";
  message: string;
}

function ReviewCard({
  item,
  leaving,
  onHandled,
}: {
  item: ReviewItem;
  leaving: boolean;
  onHandled: (eventId: string) => void;
}) {
  const toast = useToast();
  const headingId = useId();
  const ids = useFieldIds();
  const sameId = useId();
  const newId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<FormValues>>({});
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<CardError | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestion = item.suggestedJob;
  const original = formValues(item);
  const values: FormValues = { ...original, ...draft };

  // A refused field, or the unanswered question, takes focus.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (focusNext.current === null) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const fail = (next: CardError) => {
    focusNext.current = next.field === "application" ? sameId : ids[next.field];
    if (next.field !== "application") setEditing(true);
    setError(next);
  };

  const change = (field: EditableField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (error?.field === field) setError(null);
  };

  const stopEditing = () => {
    setDraft({});
    setEditing(false);
    if (error?.field !== "application") setError(null);
  };

  const confirm = async () => {
    if (busy || leaving) return;
    // A suggestion is a question, and confirming has to answer it (D26).
    if (suggestion && answer === null) {
      fail({ field: "application", message: "Choose whether this is the same application or a new one." });
      return;
    }

    const fields = editing ? changedFields(values, original) : [];
    const body: ConfirmReviewBody = {
      ...(fields.length > 0 ? { corrections: toPatch(values, fields) } : {}),
      ...(suggestion && answer ? { application: answer } : {}),
    };

    setBusy(true);
    setError(null);
    try {
      const result = await api.confirmReview(item.eventId, body);
      toast.show(
        suggestion && answer === "same"
          ? `Added to ${suggestion.company} — ${suggestion.role}`
          : result.matched
            ? "Added to an application you already track"
            : "Added to your pipeline",
      );
      onHandled(item.eventId);
    } catch (cause) {
      const field = cause instanceof ApiError ? (cause.field === "application" ? "application" : editableFieldOf(cause.field)) : null;
      if (field && cause instanceof ApiError) fail({ field, message: cause.message });
      else toast.show(failure(cause, "Could not confirm this email"), "error");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    if (busy || leaving) return;
    setBusy(true);
    try {
      await api.dismissReview(item.eventId);
      toast.show("Dismissed — GradTracker will not ask about this email again", "info");
      onHandled(item.eventId);
    } catch (cause) {
      toast.show(failure(cause, "Could not dismiss this email"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      id={cardId(item.eventId)}
      tabIndex={-1}
      aria-labelledby={headingId}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
        padding: "var(--card-pad-compact)",
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-lg)",
        opacity: leaving ? 0 : 1,
        transition: "opacity var(--dur-base) var(--ease-exit)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-md)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xxs)", minWidth: 0 }}>
          <h2
            id={headingId}
            style={{ margin: 0, fontSize: "var(--heading-sm-size)", lineHeight: "var(--heading-sm-lh)", color: "var(--text-heading)" }}
          >
            {item.company ?? "Company not found"}
          </h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>{item.role ?? "Role not found"}</p>
        </div>
        {item.stage ? <StageBadge stage={item.stage} /> : null}
      </header>

      {editing ? (
        <form
          aria-label="Correct what GradTracker read"
          className="gt-fields"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              stopEditing();
            }
          }}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
        >
          <EditFields
            values={values}
            onChange={change}
            ids={ids}
            error={error && error.field !== "application" ? { field: error.field, message: error.message } : null}
            allowNoStage={item.stage === null}
          />
          {suggestion ? (
            <SameOrNew
              item={item}
              answer={answer}
              onAnswer={(next) => {
                setAnswer(next);
                if (error?.field === "application") setError(null);
              }}
              error={error?.field === "application" ? error.message : null}
              sameId={sameId}
              newId={newId}
            />
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
            <Button type="submit" iconLeft="check" aria-busy={busy || undefined}>
              Confirm
            </Button>
            <Button type="button" variant="quiet" onClick={stopEditing}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "var(--space-md)",
            }}
          >
            <Detail label="Deadline">
              {item.deadlineAt ? (
                <span className="gt-num">{formatDeadline(item.deadlineAt)}</span>
              ) : (
                <Blank>No deadline found</Blank>
              )}
            </Detail>
            <Detail label="Next action">{item.nextAction ?? <Blank>None found</Blank>}</Detail>
          </dl>

          {suggestion ? (
            <SameOrNew
              item={item}
              answer={answer}
              onAnswer={(next) => {
                setAnswer(next);
                if (error?.field === "application") setError(null);
              }}
              error={error?.field === "application" ? error.message : null}
              sameId={sameId}
              newId={newId}
            />
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
            <Button iconLeft="check" aria-busy={busy || undefined} onClick={() => void confirm()}>
              Confirm
            </Button>
            <Button variant="quiet" iconLeft="pencil" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="ghost" iconLeft="x" onClick={() => void dismiss()}>
              Not an application
            </Button>
          </div>
        </>
      )}

      <footer
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          paddingTop: "var(--space-sm)",
          borderTop: "1px solid var(--border-hairline)",
          fontSize: "var(--caption-size)",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <Icon name="mail" size={14} />
          {item.senderDomain ? `Detected from ${item.senderDomain}` : "Sender unknown"} ·{" "}
          {formatEventDate(item.receivedAt)}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)" }}>
          How sure the model is about this email
          <Meter value={item.confidence} label="How sure the model is about this email" />
        </span>
      </footer>
    </article>
  );
}

/** "The same application, or a new one?" — asked before confirming (D26). */
function SameOrNew({
  item,
  answer,
  onAnswer,
  error,
  sameId,
  newId,
}: {
  item: ReviewItem;
  answer: Answer | null;
  onAnswer: (answer: Answer) => void;
  error: string | null;
  sameId: string;
  newId: string;
}) {
  const suggestion = item.suggestedJob!;
  const option = (value: Answer, id: string, label: string) => (
    <label htmlFor={id} className="gt-touch" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
      <input
        id={id}
        type="radio"
        name={`answer-${item.eventId}`}
        value={value}
        checked={answer === value}
        onChange={() => onAnswer(value)}
        style={{ margin: 0, accentColor: "var(--accent-primary)" }}
      />
      {label}
    </label>
  );

  return (
    <fieldset
      style={{
        margin: 0,
        padding: "var(--space-md)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-lg)",
      }}
    >
      <legend style={{ padding: "0 var(--space-xs)", color: "var(--text-heading)" }}>
        Is this the same application as {suggestion.company} — {suggestion.role}?
      </legend>
      {option("same", sameId, "Same application")}
      {option("new", newId, "New application")}
      {error ? (
        // Body text with an icon, not `--ruby-deep`: that red is 2.23:1 on a
        // dark card (contrast.test.ts). The words carry the error.
        <p
          role="alert"
          style={{
            margin: 0,
            flexBasis: "100%",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            color: "var(--text-body)",
            fontSize: "var(--caption-size)",
          }}
        >
          <Icon name="alert-circle" size={14} />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt
        style={{
          fontSize: "var(--micro-cap-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, color: "var(--text-body)" }}>{children}</dd>
    </div>
  );
}

/** Blank means blank — no placeholder content (design.md §9). */
function Blank({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--text-muted)" }}>{children}</span>;
}

/** Cards, not a spinner: the queue has a known shape. */
function CardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the review queue" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: 160,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.45,
            color: "var(--text-muted)",
          }}
        >
          <Icon name="loader" size={14} />
        </div>
      ))}
    </div>
  );
}

function failure(cause: unknown, fallback: string): string {
  if (cause instanceof NetworkError) return "You are offline — nothing was changed.";
  return cause instanceof Error ? cause.message : fallback;
}
