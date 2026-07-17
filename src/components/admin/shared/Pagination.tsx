/**
 * Pagination control. Stateless — parent owns the page. Works with client
 * slicing now and server `page`/`pageSize` params later (same props).
 */
interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const btn =
    "focus-ring inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-control border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:min-w-9";

  // Windowed page list: first, last and current ±1 with "…" gaps, so a large
  // page count never overflows the row on any screen.
  const pages: Array<number | "gap"> = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-ink-soft">
        Showing <span className="font-medium text-ink">{from}</span>–
        <span className="font-medium text-ink">{to}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>

      <div className="flex flex-nowrap items-center justify-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={btn + " border-cream-3 text-ink hover:bg-cream-2"}
        >
          Prev
        </button>

        {pages.map((p, i) =>
          p === "gap" ? (
            <span
              key={`gap-${i}`}
              aria-hidden="true"
              className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center text-sm text-ink-soft"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={
                btn +
                (p === page
                  ? " border-maroon bg-maroon text-cream"
                  : " border-cream-3 text-ink hover:bg-cream-2")
              }
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={btn + " border-cream-3 text-ink hover:bg-cream-2"}
        >
          Next
        </button>
      </div>
    </div>
  );
}
