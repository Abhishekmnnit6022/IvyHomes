// API values need normalising before they are shown to a home seeker.
// Data normalization rules derived from the live API audit.
export const areaSqft = (value) => Number(value) < 250 ? Math.round(Number(value) * 10.7639) : Number(value || 0);

// Convert unusually small per-square-foot prices into total listing prices.
export const listingPrice = (listing) => {
  const raw = Number(listing.price || 0);
  return raw > 0 && raw < 100000 ? raw * areaSqft(listing.carpet_area) : raw;
};

// Translate project price values expressed in crore or lakh notation.
export const projectPrice = (value) => Number(value) < 10 ? Number(value) * 10000000 : Number(value) * 100000;

// Format a numeric INR value for the interface.
export const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value || 0));

// Improve API lowercase labels for display without changing their filter values.
export const titleCase = (value = '') => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

// Calculate a deterministic median for locally-derived market insight cards.
export const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
