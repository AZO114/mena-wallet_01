import { pgTable, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  senderName: text("sender_name").notNull(),
  recipientName: text("recipient_name").notNull().default("سلوان وريان"),
  amount: numeric("amount", { precision: 15, scale: 3 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 3 }).notNull(),
  status: text("status").notNull().default("pending"),
  confirmedBy: text("confirmed_by"),
  confirmedByName: text("confirmed_by_name"),
  confirmedAt: timestamp("confirmed_at"),
  notes: text("notes"),
  confirmationNotes: text("confirmation_notes"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
