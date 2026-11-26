import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

/**
 * Accessible password input with an inline show/hide eye toggle.
 * Supports React Hook Form register props (ref, name, onChange, onBlur) and controlled value/onChange.
 */
export function PasswordInput({ className = '', ref, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`.trim()}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 transition-colors hover:text-amber-400 focus:text-amber-400 focus:outline-none"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
