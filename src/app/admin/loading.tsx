import LoadingSkeleton from "@/components/admin/shared/LoadingSkeleton";

/**
 * App Router loading boundary for every `/admin/*` route. Renders inside the
 * admin shell (sidebar + topbar stay put) while a page's server work resolves —
 * shows immediately when pages move to async data fetching.
 */
export default function AdminLoading() {
  return <LoadingSkeleton />;
}
