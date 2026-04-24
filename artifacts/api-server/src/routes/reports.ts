import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { gte, and, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/financial", async (req, res) => {
  try {
    const { period } = req.query;

    let startDate: Date | undefined;
    const now = new Date();

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const allTransactions = await db.select().from(transactionsTable);

    const transactions = startDate
      ? allTransactions.filter((t) => t.createdAt >= startDate!)
      : allTransactions;

    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPaid = transactions.reduce((sum, t) => sum + Number(t.paidAmount), 0);
    const pending = transactions.filter((t) => t.status === "pending");
    const received = transactions.filter((t) => t.status === "received");
    const totalPending = pending.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalReceived = received.reduce((sum, t) => sum + Number(t.amount), 0);

    const byMonth: Record<string, { amount: number; count: number }> = {};
    for (const t of allTransactions) {
      const key = t.createdAt.toISOString().substring(0, 7);
      if (!byMonth[key]) byMonth[key] = { amount: 0, count: 0 };
      byMonth[key].amount += Number(t.amount);
      byMonth[key].count += 1;
    }

    const currMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[currMonthKey]) byMonth[currMonthKey] = { amount: 0, count: 0 };

    const transactionsByPeriod = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([p, data]) => ({ period: p, ...data }));

    res.json({
      totalAmount,
      totalPaid,
      totalPending,
      totalReceived,
      pendingCount: pending.length,
      receivedCount: received.length,
      transactionsByPeriod,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/export", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let conditions: any[] = [];
    if (startDate) {
      conditions.push(gte(transactionsTable.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(transactionsTable.createdAt, end));
    }

    const query = db.select().from(transactionsTable);
    const transactions = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    res.json(
      transactions.map((t) => ({
        id: t.id,
        senderName: t.senderName,
        recipientName: t.recipientName,
        amount: Number(t.amount),
        paidAmount: Number(t.paidAmount),
        remaining: Number(t.amount) - Number(t.paidAmount),
        status: t.status === "received" ? "مستلمة" : "معلقة",
        confirmedByName: t.confirmedByName ?? "—",
        notes: t.notes ?? "—",
        confirmationNotes: t.confirmationNotes ?? "—",
        createdAt: t.createdAt.toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" }),
        confirmedAt: t.confirmedAt
          ? t.confirmedAt.toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" })
          : "—",
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
