"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { Bell } from "@/components/admin/shared/icons";
import type { AdminNotification } from "@/lib/admin/types";

/**
 * Notifications feed. Receives the typed list as props and seeds local state for
 * the mock "Mark all read" action. Replaceable by an API list with no body edits.
 *
 * Renders its own header (bell + unread badge + action) inside the card so the
 * icon can sit beside the title.
 */
interface NotificationsPanelProps {
  notifications: AdminNotification[];
  className?: string;
}

export default function NotificationsPanel({
  notifications,
  className,
}: NotificationsPanelProps) {
  const [items, setItems] = useState<AdminNotification[]>(notifications);
  const unread = items.filter((n) => n.unread).length;

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));

  return (
    <WidgetCard className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-2 text-ink">
            <Bell className="h-5 w-5" />
          </span>
          <h2 className="font-display text-lg font-semibold text-ink">
            Notifications
            {unread > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-maroon px-1.5 text-xs font-semibold text-cream">
                {unread}
              </span>
            )}
          </h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={markAllRead}
          disabled={unread === 0}
        >
          Mark all read
        </Button>
      </div>

      <ul className="space-y-3">
        {items.map((n) => (
          <li
            key={n.id}
            className={
              "flex items-start gap-3 rounded-card border border-cream-3 p-4 " +
              (n.unread ? "border-l-4 border-l-maroon" : "")
            }
          >
            <span
              aria-hidden="true"
              className={
                "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                (n.unread ? "bg-maroon" : "bg-cream-3")
              }
            />
            <div className="min-w-0">
              <p className={n.unread ? "font-medium text-ink" : "text-ink"}>
                {n.message}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{n.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
