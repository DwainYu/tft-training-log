import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const CONTROL =
  "w-full rounded-lg border border-line bg-base-900/80 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-gold-500/55 focus:bg-base-900";

export function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
  className = "",
}: {
  label?: string;
  hint?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ink-400"
        >
          {label}
          {required && <span className="text-gold-400">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-ink-600">{hint}</p>}
    </div>
  );
}

export function Input({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return <input className={`${CONTROL} ${className}`} {...rest} />;
}

export function Textarea({
  className = "",
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return <textarea rows={rows} className={`${CONTROL} resize-y leading-relaxed ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>): ReactNode {
  return (
    <select className={`${CONTROL} appearance-none pr-8 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }): ReactNode {
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink-200 ${className}`}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-[var(--color-gold-400)]"
        {...rest}
      />
      {label}
    </label>
  );
}

/** Comma / slash separated list input, kept as text for the MVP. */
export function ChipInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}): ReactNode {
  return (
    <Input
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
