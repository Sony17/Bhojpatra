import type { ComponentProps, ReactNode } from "react";
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
  footerNode,
  navLinks,
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
  /** Replaces the standard Footer (e.g. the new ad footer on /home-recreate). */
  footerNode?: ReactNode;
  /** Overrides the header's nav links (see Header `links`). */
  navLinks?: ComponentProps<typeof Header>["links"];
  className?: string;
  mainClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col w-full min-w-0 max-w-full overflow-x-clip", className)}>
      <Header links={navLinks} />
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
      {footer && (footerNode ?? <Footer />)}
      {chat && <FloatingChat />}
    </div>
  );
}
