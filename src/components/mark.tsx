/** Anish's mark: unavatar's pixel smile on a 16-unit grid, every bar 2px. One tone, static. */
export function Mark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden shapeRendering="crispEdges" className={`shrink-0 fill-fg ${className}`}>
      <rect x="1" y="1" width="2" height="4" />
      <rect x="8" y="1" width="2" height="9" />
      <rect x="6" y="8" width="2" height="2" />
      <rect x="13" y="1" width="2" height="4" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      <rect x="4" y="14" width="8" height="2" />
    </svg>
  );
}
