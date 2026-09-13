// Listing hook: progressive load plus a short-lived tab-session cache.
import { useEffect, useState } from 'react';
import { getAllPages, getPage } from '../api';

const CACHE_KEY = 'ivy-listings-cache-v1';
const CACHE_MAX_AGE = 5 * 60 * 1000;

// Return fresh cached records, otherwise let the API load them again.
function readCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return cached && Date.now() - cached.savedAt < CACHE_MAX_AGE ? cached.items : null;
  } catch { return null; }
}

// Render the first page promptly, then hydrate the complete local filter index.
// Provide listings and an explicit loading stage to every consumer.
export function useListings() {
  const [items, setItems] = useState(readCache() || []);
  const [state, setState] = useState(readCache() ? 'ready' : 'loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (readCache()) return undefined;

    getPage('/v1/listings', { limit: 50, offset: 0 })
      .then((first) => {
        if (!active) return;
        setItems(first.results);
        setState('updating');
        return getAllPages('/v1/listings', first);
      })
      .then((records) => {
        if (!active || !records) return;
        setItems(records);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: records }));
        setState('ready');
      })
      .catch((requestError) => active && (setError(requestError.message), setState('error')));

    return () => { active = false; };
  }, []);

  return { items, state, error };
}
