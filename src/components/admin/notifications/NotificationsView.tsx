"use client";

/**
 * Notifications — a read-only feed of platform activity across vendors,
 * bookings and payments. Rows carry an unread flag and a coarse category used
 * for filtering; clicking a row (or "Mark all as read") clears the flag in
 * local state. Read-model only — this mirrors an eventual notifications API.
 */

import { useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import EmptyState from "@/components/admin/shared/EmptyState";
import { Bell, Mail, ShieldCheck } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import { adminNotifications } from "@/lib/admin/mockData";
import type { AdminNotification } from "@/lib/admin/types";

const UNCATEGORISED = "General";

const categoryOf = (n: AdminNotification) => n.category ?? UNCATEGORISED;

export default function NotificationsView() {
  const [items, setItems] = useState<AdminNotification[]>(adminNotifications);
  const [category, setCategory] = useState("All");

  const stats = useMemo(() => {
    const unread = items.filter((i) => i.unread).length;
    return { total: items.length, unread, read: items.length - unread };
  }, [items]);

  const categoryOptions = useMemo(() => {
    const distinct = Array.from(new Set(items.map(categoryOf)));
    return [
      { label: "All Categories", value: "All" },
      ...distinct.map((c) => ({ label: c, value: c })),
    ];
  }, [items]);

  const filtered = useMemo(
    () =>
      category === "All"
        ? items
        : items.filter((i) => categoryOf(i) === category),
    [items, category],
  );

  const markAllRead = () =>
    setItems((prev) => prev.map((i) => (i.unread ? { ...i, unread: false } : i)));

  const markRead = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unread: false } : i)));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Notifications"
        subtitle="Platform activity across vendors, bookings and payments."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Bell} label="Total" value={String(stats.total)} />
        <StatCard icon={Mail} label="Unread" value={String(stats.unread)} />
        <StatCard icon={ShieldCheck} label="Read" value={String(stats.read)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={setCategory}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={markAllRead}
          disabled={stats.unread === 0}
        >
          Mark all as read
        </Button>
      </div>

      <WidgetCard title="Recent Activity">
        {filtered.length === 0 ? (
          <EmptyState
            title="No notifications"
            message="Try a different category filter."
          />
        ) : (
          <ul className="divide-y divide-cream-3">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-cream-2"
                >
                  <span
                    aria-hidden="true"
                    className={
                      "h-2 w-2 shrink-0 rounded-full " +
                      (n.unread ? "bg-maroon" : "bg-cream-3")
                    }
                  />
                  <span className="inline-flex shrink-0 items-center rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                    {categoryOf(n)}
                  </span>
                  <span
                    className={
                      "min-w-0 flex-1 text-sm text-ink " +
                      (n.unread ? "font-medium" : "")
                    }
                  >
                    {n.message}
                  </span>
                  <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-ink-soft">
                    {n.time}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </WidgetCard>
    </div>
  );
}
