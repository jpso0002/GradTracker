import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { ConfirmReviewBody, ReviewItem } from "@gradtracker/shared";
import { Button, CompanyLogo, EmptyState, Icon, StageBadge, TopBar } from "../ui";
import { ViewTitle } from "../shell/ViewTitle";
import { Meter } from "./Meter";
import { api, ApiError, NetworkError } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { tokenDurationMs } from "../motion";
import { formatDeadline, formatEventDate } from "../format";
import { gmailLink, useMailboxAccount } from "../gmailLink";
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
 * The review queue (T6.3), in Will's layout (D41): the queue on the left, one
 * email at a time on the right.
 *
 * Every item is an email GradTracker would not assert on its own: the model
 * was too unsure, it found a stage only the student may set, or the email may
 * belong to an application already tracked (D26). Nothing on a card is a fact
 * until the student confirms it.
 *
 * Confirming as shown sends nothing but the answer. "Edit" sends only the
 * fields changed — the same rule as the panel (D27). A card with a suggested
 * application asks "the same application, or a new one?" first.
 *
 * A handled card fades out on the motion tokens, so `prefers-reduced-motion`
 * removes it at once, and the next email takes its place and focus.
 */

export interface ReviewViewProps {
  /** Called after an item is confirmed or dismissed, so the sidebar re-counts. */
  onChanged?: () => void;
}

const cardId = (eventId: string) => `review-${eventId}`;

/** Why GradTracker asked, in the queue's few words. */
function reason(item: ReviewItem): string {
  if (item.suggestedJob) return "May be one you track";
  if (item.stage === "withdrawn") return "Withdrawal to confirm";
  if (item.company === null) return "Company not found";
  return `${Math.round(item.confidence * 100)}% confident`;
}

export function ReviewView({ onChanged }: ReviewViewProps) {
  const queue = useAsync(() => api.listReview(), []);
  const { hash } = useLocation();
  // Handled here, so gone from the list without a re-read.
  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set());
  // Fading out: still shown for one animation.
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  // Where focus goes next: a card's id, or the empty queue (""). State, not a
  // ref, so it is applied after the render that shows that card — a ref was
  // read by effects left over from the render before, when the next card was
  // not there yet, and focus fell to the page.
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  const items = (queue.data?.items ?? []).filter((item) => !handled.has(item.eventId));
  const selected = items.find((item) => item.eventId === selectedId) ?? items[0];

  useEffect(() => {
    if (focusTarget === null) return;
    const target = focusTarget === "" ? emptyRef.current : document.getElementById(focusTarget);
    if (!target) return;
    target.focus();
    setFocusTarget(null);
  }, [focusTarget, selected?.eventId, items.length]);

  // A row's "Review required" marker links to /review#review-<id>: open that
  // email, and put focus on it.
  const linked = hash.startsWith("#review-") ? hash.slice("#review-".length) : null;
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || linked === null || !queue.data) return;
    landed.current = true;
    if (queue.data.items.some((item) => item.eventId === linked)) {
      setSelectedId(linked);
      setFocusTarget(cardId(linked));
    }
  }, [linked, queue.data]);

  const choose = (eventId: string) => {
    setSelectedId(eventId);
    setFocusTarget(cardId(eventId));
  };

  const handle = (eventId: string) => {
    const index = items.findIndex((item) => item.eventId === eventId);
    const stillHere = (item: ReviewItem) => item.eventId !== eventId && !leaving.has(item.eventId);
    const next = items.slice(index + 1).find(stillHere) ?? items.slice(0, index).reverse().find(stillHere);

    setLeaving((current) => new Set(current).add(eventId));
    window.setTimeout(() => {
      setFocusTarget(next ? cardId(next.eventId) : "");
      setSelectedId(next?.eventId ?? null);
      setHandled((current) => new Set(current).add(eventId));
    }, tokenDurationMs("--dur-base"));
    onChanged?.();
  };

  const count = items.length;
  return (
    <>
      <ViewTitle title="Needs review" />
      <TopBar title="Needs review" />
      <div className="gt-page" style={{ maxWidth: 1100 }}>
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
          <div ref={emptyRef} tabIndex={-1} style={{ borderRadius: 12 }}>
            <EmptyState icon="mail-check" title="Nothing to review" description="GradTracker was confident about everything it found." />
          </div>
        ) : (
          <>
            <section className="gt-page-head" aria-label="About this queue" style={{ paddingBottom: 24, borderBottom: "1px solid var(--line)", marginBottom: 0 }}>
              <div>
                <p className="gt-eyebrow">Inbox check</p>
                <h2>A few things need your eye.</h2>
                <span className="lede">
                  These emails look like applications. Confirm what GradTracker read, or dismiss the ones that aren’t.
                </span>
              </div>
              <div className="gt-review-progress">
                <strong>{count}</strong>
                <span>left to review</span>
              </div>
            </section>

            <div className="gt-review-layout">
              <nav className="gt-review-queue" aria-label="Review queue">
                <p className="gt-eyebrow">Review queue</p>
                <ul>
                  {items.map((item) => (
                    <li key={item.eventId}>
                      <button
                        type="button"
                        aria-current={item.eventId === selected?.eventId ? "true" : undefined}
                        onClick={() => choose(item.eventId)}
                      >
                        <CompanyLogo company={item.company ?? "?"} />
                        <span className="text">
                          <strong>{item.company ?? "Company not found"}</strong>
                          <small>{reason(item)}</small>
                        </span>
                        <Icon name="chevron-right" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {selected ? (
                <ReviewCard
                  // A fresh card per email: an open edit belonged to the last.
                  key={selected.eventId}
                  item={selected}
                  leaving={leaving.has(selected.eventId)}
                  onHandled={handle}
                />
              ) : null}
            </div>
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
  const link = gmailLink(item.gmailMessageId, useMailboxAccount());
  const original = formValues(item);
  const values: FormValues = { ...original, ...draft };
  const percent = Math.round(item.confidence * 100);

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

  const sameOrNew = suggestion ? (
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
  ) : null;

  return (
    <article
      id={cardId(item.eventId)}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="gt-review-card"
      style={{ opacity: leaving ? 0 : 1, transition: "opacity var(--dur-base) var(--ease-exit)" }}
    >
      <header className="gt-source-line">
        <CompanyLogo company={item.company ?? "?"} large />
        <div className="text">
          <p className="gt-eyebrow">Detected from {item.senderDomain ?? "an unknown sender"}</p>
          <h2 id={headingId} style={{ fontSize: 18, margin: 0 }}>
            {item.company ?? "Company not found"}
          </h2>
          <small>
            {item.role ?? "Role not found"} · {formatEventDate(item.receivedAt)}
          </small>
        </div>
        {link ? (
          <a
            // The student reads the email itself before deciding (D38).
            // GradTracker keeps none of it, so this goes to their inbox.
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            Open in Gmail ↗
          </a>
        ) : null}
      </header>

      <div className={`gt-confidence-note${percent >= 75 ? " sure" : ""}`}>
        <Icon name="sparkles" size={17} />
        <span style={{ flex: 1 }}>
          We’re <strong>{percent}% confident</strong> this is an application update. Please check the details below.
        </span>
        <Meter value={item.confidence} label="How sure the model is about this email" />
      </div>

      {editing ? (
        <form
          aria-label="Correct what GradTracker read"
          className="gt-fields gt-detected"
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
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <EditFields
            values={values}
            onChange={change}
            ids={ids}
            error={error && error.field !== "application" ? { field: error.field, message: error.message } : null}
            allowNoStage={item.stage === null}
          />
          {sameOrNew}
          <div className="gt-review-actions" style={{ margin: "0 -22px", paddingBottom: 0 }}>
            <Button type="button" variant="quiet" onClick={stopEditing}>
              Cancel
            </Button>
            <Button type="submit" iconLeft="check" aria-busy={busy || undefined}>
              Confirm
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="gt-detected">
            <p className="gt-eyebrow" style={{ fontSize: 11 }}>
              Detected details
            </p>
            <dl style={{ margin: 0 }}>
              <Detail label="Company">{item.company ?? <Blank>Not found</Blank>}</Detail>
              <Detail label="Role">{item.role ?? <Blank>Not found</Blank>}</Detail>
              <Detail label="Stage">{item.stage ? <StageBadge stage={item.stage} /> : <Blank>Not stated</Blank>}</Detail>
              <Detail label="Deadline">
                {item.deadlineAt ? <span className="gt-num">{formatDeadline(item.deadlineAt)}</span> : <Blank>No deadline found</Blank>}
              </Detail>
              <Detail label="Next action">{item.nextAction ?? <Blank>None found</Blank>}</Detail>
            </dl>
            {sameOrNew}
          </div>

          <div className="gt-review-actions">
            <Button variant="quiet" iconLeft="x" onClick={() => void dismiss()}>
              Not an application
            </Button>
            <Button variant="quiet" iconLeft="pencil" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button iconLeft="check" aria-busy={busy || undefined} onClick={() => void confirm()}>
              Confirm
            </Button>
          </div>
        </>
      )}
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
    <label htmlFor={id} className="gt-touch" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
      <input
        id={id}
        type="radio"
        name={`answer-${item.eventId}`}
        value={value}
        checked={answer === value}
        onChange={() => onAnswer(value)}
        style={{ margin: 0, accentColor: "var(--lavender)" }}
      />
      {label}
    </label>
  );

  return (
    <fieldset
      style={{
        margin: "4px 0 14px",
        padding: 14,
        border: "1px solid var(--lavender-line)",
        background: "color-mix(in srgb, var(--lavender-soft) 45%, var(--surface))",
        borderRadius: 9,
        display: "flex",
        flexWrap: "wrap",
        gap: 18,
      }}
    >
      <legend style={{ padding: "0 6px", color: "var(--ink)", fontWeight: 600, fontSize: 14 }}>
        Is this the same application as {suggestion.company} — {suggestion.role}?
      </legend>
      {option("same", sameId, "Same application")}
      {option("new", newId, "New application")}
      {error ? (
        // Body text with an icon: the words carry the error, not the colour.
        <p role="alert" style={{ margin: 0, flexBasis: "100%", display: "flex", alignItems: "center", gap: 6, color: "var(--ink)", fontSize: 13 }}>
          <Icon name="alert-circle" size={14} />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gt-detected-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Blank means blank — no placeholder content (design.md §9). */
function Blank({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--muted)" }}>{children}</span>;
}

/** A card's shape, not a spinner: the queue has a known shape. */
function CardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the review queue" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: 160,
            borderRadius: 13,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.5,
            color: "var(--muted)",
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
