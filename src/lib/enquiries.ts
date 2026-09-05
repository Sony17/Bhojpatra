/**
 * Contact-form enquiry store.
 *
 * The public contact page used to fake a success state and drop the message.
 * Submissions now persist here (Postgres/Neon or local JSON) so a future admin
 * "Enquiries" view can read them back. Same `createStore` idiom as the other
 * stores.
 */
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";

export interface EnquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: "contact-page";
  createdAt: string;
}
const store = createStore<EnquiryRecord>({
  table: "enquiries",
  idField: "id",
});

export function readEnquiries(): Promise<EnquiryRecord[]> {
  return store.list();
}

export function addEnquiry(rec: EnquiryRecord): Promise<void> {
  return store.upsert(rec);
}

export function newEnquiryId(): string {
  return `ENQ-${randomUUID().slice(0, 6).toUpperCase()}`;
}
