import { redirect } from "next/navigation";

/**
 * Reports were merged into the dashboard's analytics section. Keep this route as
 * a permanent redirect so any old links / bookmarks land on the right place.
 */
export default function ReportsPage() {
  redirect("/admin/dashboard");
}
