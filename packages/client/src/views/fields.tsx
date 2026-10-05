import { useId, useMemo, type ChangeEvent } from "react";
import { StageEnum, type Stage, type UpdateJobBody } from "@gradtracker/shared";
import { Input, Select, STAGES } from "../ds";
import { visuallyHidden } from "../shell/VisuallyHidden";

/**
 * The five extractable fields, as the two editors hold them: the detail
 * panel's edit mode (T6.1) and the review card's "Edit" (T6.3).
 *
 * Both keep every input as a string and send **only what the student changed**
 * (D27). Sending a field the student did not touch marks it human-edited and
 * locks it against the classifier for good, so "changed" is decided here, once,
 * and the two editors cannot disagree about it.
 */

export type EditableField = "company" | "role" | "stage" | "deadlineAt" | "nextAction";

export const EDITABLE_FIELDS: readonly EditableField[] = ["company", "role", "stage", "deadlineAt", "nextAction"];

export const FIELD_LABELS: Record<EditableField, string> = {
  company: "Company",
  role: "Role",
  stage: "Stage",
  deadlineAt: "Deadline",
  nextAction: "Next action",
};

export type FormValues = Record<EditableField, string>;

export interface FieldError {
  field: EditableField;
  message: string;
}

/** An application, or a review item, which may not have every field yet. */
export interface FieldSource {
  company: string | null;
  role: string | null;
  stage: Stage | null;
  deadlineAt: string | null;
  nextAction: string | null;
}

/** The six stages, from the shared enum — never a second hand-written list. */
export const STAGE_OPTIONS = StageEnum.options.map((stage) => ({ value: stage, label: STAGES[stage].label }));

export function formValues(source: FieldSource): FormValues {
  return {
    company: source.company ?? "",
    role: source.role ?? "",
    stage: source.stage ?? "",
    deadlineAt: toLocalInput(source.deadlineAt),
    nextAction: source.nextAction ?? "",
  };
}

/** Typing a trailing space, or typing and deleting, is not a change. */
function comparable(field: EditableField, value: string): string {
  return field === "stage" || field === "deadlineAt" ? value : value.trim();
}

export function changedFields(values: FormValues, original: FormValues): EditableField[] {
  return EDITABLE_FIELDS.filter((field) => comparable(field, values[field]) !== comparable(field, original[field]));
}

/**
 * The request body for exactly these fields. A blank deadline or next action
 * means "none". A blank company or role is sent as typed, so the server's
 * refusal arrives with the field's name and is shown beneath it.
 */
export function toPatch(values: FormValues, fields: readonly EditableField[]): UpdateJobBody {
  const patch: UpdateJobBody = {};
  for (const field of fields) {
    if (field === "company" || field === "role") patch[field] = values[field].trim();
    else if (field === "stage") patch.stage = values.stage as Stage;
    else if (field === "deadlineAt") patch.deadlineAt = values.deadlineAt === "" ? null : fromLocalInput(values.deadlineAt);
    else {
      const text = values.nextAction.trim();
      patch.nextAction = text === "" ? null : text;
    }
  }
  return patch;
}

/** The field a server refusal names, if it is one of the five. A review
 *  confirmation nests them under `corrections`. */
export function editableFieldOf(field: string | undefined): EditableField | null {
  const name = field?.replace(/^corrections\./, "");
  return name !== undefined && (EDITABLE_FIELDS as readonly string[]).includes(name) ? (name as EditableField) : null;
}

/**
 * ISO instant → the `datetime-local` input's "YYYY-MM-DDTHH:mm", in the
 * browser's own timezone — the same zone the client sends as `x-timezone`, so
 * the deadline typed is the deadline ranked. Representation only: no date
 * arithmetic happens here (rules.md → Client).
 */
export function toLocalInput(iso: string | null): string {
  if (iso === null) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The reverse. Something unparseable goes to the server as typed, where it is
 *  refused with the field's name rather than silently dropped. */
export function fromLocalInput(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/** Stable element ids for one editor's inputs, so focus can move to a field
 *  the server refused without a ref through the design system's components. */
export function useFieldIds(): Record<EditableField, string> {
  const base = useId();
  return useMemo(
    () => ({
      company: `${base}company`,
      role: `${base}role`,
      stage: `${base}stage`,
      deadlineAt: `${base}deadline`,
      nextAction: `${base}next-action`,
    }),
    [base],
  );
}

export interface EditFieldsProps {
  values: FormValues;
  onChange: (field: EditableField, value: string) => void;
  ids: Record<EditableField, string>;
  error: FieldError | null;
  /** A review item may not have a stage yet; an application always has one. */
  allowNoStage?: boolean;
}

/** The five inputs, in the order the panel shows the fields. */
export function EditFields({ values, onChange, ids, error, allowNoStage = false }: EditFieldsProps) {
  const invalid = (field: EditableField) =>
    error?.field === field ? { error: error.message, "aria-invalid": true as const } : {};
  const text = (field: "company" | "role" | "nextAction") => ({
    id: ids[field],
    label: FIELD_LABELS[field],
    value: values[field],
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(field, e.target.value),
    ...invalid(field),
  });

  return (
    <>
      <Input {...text("company")} />
      <Input {...text("role")} />
      <Select
        id={ids.stage}
        label={FIELD_LABELS.stage}
        value={values.stage}
        onChange={(value) => onChange("stage", value)}
        options={allowNoStage ? [{ value: "", label: "Not stated" }, ...STAGE_OPTIONS] : STAGE_OPTIONS}
      />
      <Input
        id={ids.deadlineAt}
        type="datetime-local"
        numeric
        label={FIELD_LABELS.deadlineAt}
        hint="Leave empty if there is none"
        value={values.deadlineAt}
        onChange={(e) => onChange("deadlineAt", e.target.value)}
        {...invalid("deadlineAt")}
      />
      <Input {...text("nextAction")} />
      {/* Announced at once, by field (design.md §10.3: validation errors are
          assertive). The message beneath the field is for the eye. */}
      {error ? (
        <span role="alert" style={visuallyHidden}>
          {`${FIELD_LABELS[error.field]}: ${error.message}`}
        </span>
      ) : null}
    </>
  );
}
