import type { ReactNode } from "react";
import PublicShell from "@/components/app/PublicShell";
import RequireSession from "@/components/auth/RequireSession";
import AccountShell from "@/components/account/AccountShell";

/**
 * Chrome for the signed-in account area (My Profile / Settings / Change
 * Password). Shared by every role — `RequireSession` with no `role` admits any
 * signed-in account; admins (who read as signed-out here) and anonymous
 * visitors are bounced. `AccountShell` adds the section nav shared by every
 * child page.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <RequireSession>
        <AccountShell>{children}</AccountShell>
      </RequireSession>
    </PublicShell>
  );
}
