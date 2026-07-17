/**
 * Quiet hairline between homepage bands — a single diamond motif, brand red.
 * Kept subtle so sections feel continuous, not stitched.
 */
export default function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto flex max-w-3xl items-center gap-3 px-5 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-maroon/25" />
      <span className="h-1.5 w-1.5 rotate-45 bg-maroon/80" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-maroon/25" />
    </div>
  );
}
