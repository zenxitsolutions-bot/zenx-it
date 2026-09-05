import * as React from 'react';
import RPNInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

// Wraps react-phone-number-input (a flag dropdown + number field, storing E.164 like
// "+14155550123") so every phone field in the app shares one country picker instead of a bare
// text box — see server/src/schemas/user.schema.js's isValidPhoneNumber check, which this value
// shape satisfies directly.
const PhoneInput = React.forwardRef(function PhoneInput({ className, ...props }, ref) {
  return (
    <RPNInput
      ref={ref}
      international
      defaultCountry="US"
      className={cn(
        'nourishly-phone-input flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:text-sm',
        className
      )}
      numberInputProps={{
        className: 'h-full w-full min-w-0 border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground md:text-sm',
      }}
      {...props}
    />
  );
});

export { PhoneInput };
