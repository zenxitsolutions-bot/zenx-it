import RPNInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "../../utils/cn";

interface PhoneFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  required?: boolean;
  className?: string;
}

// Wraps react-phone-number-input (a flag dropdown + number field, producing E.164 like
// "+14155550123") so every phone field here shares one country picker instead of a bare text box
// — see admin-server/src/schemas/{enquiry,provisioning}.schema.js's isValidPhoneNumber check,
// which this value shape satisfies directly. Styled to match Field.tsx's fieldClasses.
export function PhoneField({ id, value, onChange, onBlur, name, required, className }: PhoneFieldProps) {
  return (
    <RPNInput
      id={id}
      international
      defaultCountry="US"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onBlur={onBlur}
      name={name}
      required={required}
      className={cn(
        "zenx-phone-field flex w-full items-center gap-1.5 rounded-md border border-border bg-ink px-3.5 py-2.5 text-sm text-offwhite transition focus-within:border-lime",
        className
      )}
      numberInputProps={{
        className: "h-full w-full min-w-0 border-0 bg-transparent p-0 text-sm text-offwhite outline-none placeholder:text-dim",
      }}
    />
  );
}
