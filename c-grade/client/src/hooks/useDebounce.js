import { useEffect, useState } from 'react';

/**
 * Debounces rapid input changes (e.g. search fields) by delayMs milliseconds.
 * @template T
 * @param {T} value
 * @param {number} [delayMs=300]
 * @returns {T}
 */
export function useDebounce(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
