// Delay fast text changes so filtering does not recalculate on every keystroke.
import { useEffect, useState } from 'react';

// Return the latest value only after the configured quiet period.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
