import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import { cn } from "@/components/ui";

/**
 * One public-app chrome for every non-admin screen: Header (incl. bottom tabs),
 * padded main, Footer, FloatingChat. Home passes `hero` to skip the top pad /
 * page wash so the full-bleed hero can own the first viewport.
 */
export default function PublicShell({
  children,
  hero = false,
  detail = false,
  chat = true,
  footer = true,
  className,
  mainClassName,
}: {
  children: ReactNode;
  /** Full-bleed hero page (home) — no app-page-pad / wash. */
  hero?: boolean;
  /** Detail / AppBar screen — skips mobile top pad so AppBar attaches to top-0. */
  detail?: boolean;
  chat?: boolean;
  footer?: boolean;
  className?: string;
  mainClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col w-full min-w-0 max-w-full overflow-x-clip", className)}>
      <Header />
      <main
        className={cn(
          "app-shell-main flex-1 w-full min-w-0 max-w-full",
          !hero &&
            (detail
              ? "app-page-wash app-detail-page-pad"
              : "app-page-wash app-page-pad"),
          !footer && "app-bottom-safe",
          mainClassName,
        )}
      >
        {children}
      </main>
      {footer && <Footer />}
      {chat && <FloatingChat />}
    </div>
  );
}
