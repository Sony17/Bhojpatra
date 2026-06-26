import type { Metadata } from "next";
import ContentManager from "@/components/admin/content/ContentManager";

export const metadata: Metadata = { title: "Content Control" };

export default function ContentPage() {
  return <ContentManager />;
}
