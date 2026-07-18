import type { ReactNode } from "react";
import PublicShell from "@/components/app/PublicShell";
import RequireSession from "@/components/auth/RequireSession";
import AccountShell from "@/components/account/AccountShell";

/**
 * Chrome for the signed-in account area (My Profile / Settings / Change Password
 * / Roles). Gated by `RequireSession role="customer"` — customer is universal,
 * so any signed-in booking user passes; admins (who read as signed-out here) and
 * anonymous visitors are bounced. `AccountShell` adds the section nav shared by
 * every child page.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <RequireSession role="customer">
        <AccountShell>{children}</AccountShell>
      </RequireSession>
    </PublicShell>
  );
}
