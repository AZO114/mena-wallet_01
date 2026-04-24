import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, transactionsTable, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

type RawTx = {
  id: string;
  sender_name: string;
  recipient_name: string;
  amount: string;
  paid_amount: string;
  status: string;
  confirmed_by: string | null;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  notes: string | null;
  confirmation_notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

async function main() {
  const file = process.argv[2] ?? "attached_assets/transactions_1777056222980.json";
  const path = resolve(process.cwd(), file);
  const raw: RawTx[] = JSON.parse(readFileSync(path, "utf-8"));

  console.log(`Loaded ${raw.length} transactions from ${file}`);

  const rows = raw.map((t) => ({
    id: t.id,
    senderName: t.sender_name,
    recipientName: t.recipient_name,
    amount: t.amount,
    paidAmount: t.paid_amount,
    status: t.status,
    confirmedBy: t.confirmed_by,
    confirmedByName: t.confirmed_by_name,
    confirmedAt: t.confirmed_at ? new Date(t.confirmed_at) : null,
    notes: t.notes,
    confirmationNotes: t.confirmation_notes,
    createdByUserId: t.created_by_user_id,
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  }));

  const result = await db
    .insert(transactionsTable)
    .values(rows)
    .onConflictDoUpdate({
      target: transactionsTable.id,
      set: {
        senderName: sql`excluded.sender_name`,
        recipientName: sql`excluded.recipient_name`,
        amount: sql`excluded.amount`,
        paidAmount: sql`excluded.paid_amount`,
        status: sql`excluded.status`,
        confirmedBy: sql`excluded.confirmed_by`,
        confirmedByName: sql`excluded.confirmed_by_name`,
        confirmedAt: sql`excluded.confirmed_at`,
        notes: sql`excluded.notes`,
        confirmationNotes: sql`excluded.confirmation_notes`,
        createdByUserId: sql`excluded.created_by_user_id`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
    .returning({ id: transactionsTable.id });

  console.log(`Upserted ${result.length} transactions`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
