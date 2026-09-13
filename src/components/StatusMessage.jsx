// Shared status component keeps loading and API errors visually consistent.
export function StatusMessage({ children, type = 'info' }) {
  return <p className={`status ${type}`}>{children}</p>;
}
