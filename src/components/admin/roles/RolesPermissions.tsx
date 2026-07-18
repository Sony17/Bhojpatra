"use client";

/**
 * Roles & Permissions — the admin team's roles and a roles × modules access
 * matrix. Read-only overview for now (mirrors an eventual RBAC config): each
 * module shows what each role can do (Full / View / None). The access levels
 * intentionally sit outside StatusBadge's TONE map, so we style the pills here
 * with brand-only classes.
 */

import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import { Key } from "@/components/admin/shared/icons";
import { adminRoles, permissionRows } from "@/lib/admin/mockData";
import type { AccessLevel, PermissionRow } from "@/lib/admin/types";

/** Brand-only pill styles per access level (not covered by StatusBadge's map). */
const ACCESS_TONE: Record<AccessLevel, string> = {
  Full: "bg-maroon text-cream",
  View: "border border-maroon text-maroon",
  None: "bg-cream-2 text-ink-soft",
};

function AccessPill({ level }: { level: AccessLevel }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
        ACCESS_TONE[level]
      }
    >
      {level}
    </span>
  );
}

export default function RolesPermissions() {
  /** Role columns for the matrix, derived from the canonical role list. */
  const roleNames = adminRoles.map((r) => r.name);

  const columns: Column<PermissionRow>[] = [
    {
      key: "module",
      header: "Module",
      cell: (row) => <span className="font-medium text-ink">{row.module}</span>,
    },
    ...roleNames.map(
      (role): Column<PermissionRow> => ({
        key: role,
        header: role,
        cell: (row) => <AccessPill level={row.access[role] ?? "None"} />,
      }),
    ),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Roles & Permissions"
        subtitle="Who can access what across the platform."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {adminRoles.map((role) => (
          <div
            key={role.name}
            className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-maroon">
              <Key className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">
              {role.name}
            </h3>
            <p className="mt-1 font-medium text-maroon">
              {role.members} {role.members === 1 ? "member" : "members"}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{role.description}</p>
          </div>
        ))}
      </div>

      <WidgetCard title="Permission Matrix">
        <DataTable
          columns={columns}
          rows={permissionRows}
          getRowKey={(row) => row.module}
          bare
          minWidthClass="min-w-[560px]"
        />
      </WidgetCard>
    </div>
  );
}
