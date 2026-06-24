import {
  cancel,
  confirm,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts";

/** Thrown when the user aborts an interactive prompt (Ctrl-C / Esc). */
export class PromptCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "PromptCancelled";
  }
}

/**
 * Returns `true` when interactive prompts can run — a TTY on stdin that is not
 * a CI environment.
 */
export function canPrompt(): boolean {
  return Boolean(process.stdin.isTTY) && !process.env["CI"];
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cancelled.");
    throw new PromptCancelled();
  }
  return value as T;
}

/** Prompts for free text with an optional default. */
export async function promptText(opts: {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
}): Promise<string> {
  const value = unwrap(
    await text({
      message: opts.message,
      placeholder: opts.placeholder,
      defaultValue: opts.defaultValue,
      initialValue: opts.defaultValue,
      validate: opts.validate
        ? (v) => opts.validate!(v ?? "")
        : undefined,
    }),
  );
  return (value ?? opts.defaultValue ?? "").trim();
}

/** Prompts for a single choice from a list. */
export async function promptSelect<T extends string>(opts: {
  message: string;
  options: Array<{ value: T; label: string; hint?: string }>;
  initialValue?: T;
}): Promise<T> {
  return unwrap(
    await select({
      message: opts.message,
      options: opts.options as unknown as Parameters<
        typeof select<T>
      >[0]["options"],
      initialValue: opts.initialValue,
    }),
  );
}

/** Prompts for zero or more choices from a list. */
export async function promptMultiselect<T extends string>(opts: {
  message: string;
  options: Array<{ value: T; label: string; hint?: string }>;
  initialValues?: T[];
  required?: boolean;
}): Promise<T[]> {
  return unwrap(
    await multiselect({
      message: opts.message,
      options: opts.options as unknown as Parameters<
        typeof multiselect<T>
      >[0]["options"],
      initialValues: opts.initialValues,
      required: opts.required ?? false,
    }),
  );
}

/** Prompts for a yes/no confirmation. */
export async function promptConfirm(opts: {
  message: string;
  initialValue?: boolean;
}): Promise<boolean> {
  return unwrap(
    await confirm({
      message: opts.message,
      initialValue: opts.initialValue ?? true,
    }),
  );
}
