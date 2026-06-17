export default function Loading() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}
