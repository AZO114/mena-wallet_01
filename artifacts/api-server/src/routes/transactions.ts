import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, notificationsTable } from "@workspace/db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

const router: IRouter = Router();

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function mapTransaction(t: any) {
  return {
    id: t.id,
    senderName: t.senderName,
    recipientName: t.recipientName,
    amount: Number(t.amount),
    paidAmount: Number(t.paidAmount),
    status: t.status,
    confirmedBy: t.confirmedBy,
    confirmedByName: t.confirmedByName,
    confirmedAt: t.confirmedAt?.toISOString() ?? null,
    notes: t.notes,
    confirmationNotes: t.confirmationNotes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { status, search, minAmount, maxAmount, startDate, endDate } = req.query;

    let conditions: any[] = [];

    if (status && status !== "all") {
      conditions.push(eq(transactionsTable.status, status as string));
    }
    if (minAmount) {
      conditions.push(gte(transactionsTable.amount, String(minAmount)));
    }
    if (maxAmount) {
      conditions.push(lte(transactionsTable.amount, String(maxAmount)));
    }
    if (startDate) {
      conditions.push(gte(transactionsTable.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(transactionsTable.createdAt, end));
    }

    const query = db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
    let results = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    if (search) {
      const searchStr = (search as string).toLowerCase();
      results = results.filter(
        (t) => t.senderName.toLowerCase().includes(searchStr) || t.notes?.toLowerCase().includes(searchStr)
      );
    }

    res.json(results.map(mapTransaction));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { senderName, amount, paidAmount, notes, createdByUserId } = req.body;

    if (!senderName || !amount || !createdByUserId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const id = generateId();
    const now = new Date();

    await db.insert(transactionsTable).values({
      id,
      senderName,
      recipientName: "سلوان وريان وأنس",
      amount: String(amount),
      paidAmount: String(paidAmount ?? 0),
      status: "pending",
      notes: notes ?? null,
      createdByUserId,
      createdAt: now,
      updatedAt: now,
    });

    const dateStr = now.toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });

    const recipientTitle = "✅ تم استلام قيمة جديدة معلقة";
    const recipientBody = `صاحب القيمة: ${senderName}\nالمبلغ: ${Number(amount).toLocaleString("ar-LY")} د.ل\nالمسدد: ${Number(paidAmount ?? 0).toLocaleString("ar-LY")} د.ل\nالتاريخ: ${dateStr}\nالوقت: ${timeStr}`;

    await db.insert(notificationsTable).values([
      { id: generateId(), userId: "salwan", transactionId: id, title: recipientTitle, body: recipientBody, isRead: false, createdAt: now },
      { id: generateId(), userId: "rayan", transactionId: id, title: recipientTitle, body: recipientBody, isRead: false, createdAt: now },
      { id: generateId(), userId: "anas", transactionId: id, title: recipientTitle, body: recipientBody, isRead: false, createdAt: now },
      {
        id: generateId(),
        userId: "muataz",
        transactionId: id,
        title: "✅ تم استلام قيمة جديدة معلقة",
        body: `تم استلام قيمة جديدة معلقة لـ ${senderName} بمبلغ ${Number(amount).toLocaleString("ar-LY")} د.ل`,
        isRead: false,
        createdAt: now,
      },
    ]);

    const [created] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
    res.status(201).json(mapTransaction(created));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [t] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, req.params.id));
    if (!t) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapTransaction(t));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { senderName, amount, paidAmount, notes } = req.body;
    const [t] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, req.params.id));

    if (!t) { res.status(404).json({ error: "المعاملة غير موجودة" }); return; }
    if (t.status !== "pending") { res.status(400).json({ error: "لا يمكن تعديل معاملة مستلمة" }); return; }

    const now = new Date();
    const updateData: any = { updatedAt: now };
    if (senderName !== undefined) updateData.senderName = senderName;
    if (amount !== undefined) updateData.amount = String(amount);
    if (paidAmount !== undefined) updateData.paidAmount = String(paidAmount);
    if (notes !== undefined) updateData.notes = notes;

    await db.update(transactionsTable).set(updateData).where(eq(transactionsTable.id, req.params.id));

    const dateStr = now.toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
    const editTitle = "✏️ تم تعديل قيمة";

    const changes: string[] = [];
    if (senderName !== undefined && senderName !== t.senderName) {
      changes.push(`الاسم: ${t.senderName} ← ${senderName}`);
    }
    if (amount !== undefined && Number(amount) !== Number(t.amount)) {
      changes.push(`المبلغ الكلي: ${Number(t.amount).toLocaleString("ar-LY")} ← ${Number(amount).toLocaleString("ar-LY")} د.ل`);
    }
    if (paidAmount !== undefined && Number(paidAmount) !== Number(t.paidAmount)) {
      changes.push(`المسدد: ${Number(t.paidAmount).toLocaleString("ar-LY")} ← ${Number(paidAmount).toLocaleString("ar-LY")} د.ل`);
    }
    if (notes !== undefined && notes !== t.notes) {
      changes.push(`الملاحظات: ${t.notes ?? "—"} ← ${notes || "—"}`);
    }

    const changesText = changes.length > 0 ? changes.join("\n") : "لا توجد تغييرات";
    const editBody = `تم تعديل قيمة ${senderName ?? t.senderName}\n\nالتغييرات:\n${changesText}\n\nالتاريخ: ${dateStr} | ${timeStr}`;

    await db.insert(notificationsTable).values([
      { id: generateId(), userId: "muataz", transactionId: t.id, title: editTitle, body: editBody, isRead: false, createdAt: now },
    ]);

    const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, req.params.id));
    res.json(mapTransaction(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/confirm", async (req, res) => {
  try {
    const { confirmedByUserId, confirmedByName, confirmationNotes } = req.body;
    const now = new Date();

    const [t] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, req.params.id));
    if (!t) { res.status(404).json({ error: "Not found" }); return; }
    if (t.status === "received") { res.status(400).json({ error: "Already confirmed" }); return; }

    await db.update(transactionsTable).set({
      status: "received",
      confirmedBy: confirmedByUserId,
      confirmedByName,
      confirmedAt: now,
      confirmationNotes: confirmationNotes ?? null,
      updatedAt: now,
    }).where(eq(transactionsTable.id, req.params.id));

    const dateStr = now.toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
    const allReceivers = ["salwan", "rayan", "anas"];
    const otherReceivers = allReceivers.filter((r) => r !== confirmedByUserId);

    const noteText = confirmationNotes ? `\nملاحظة: ${confirmationNotes}` : "";

    await db.insert(notificationsTable).values([
      {
        id: generateId(),
        userId: "muataz",
        transactionId: t.id,
        title: "✅ تم استلام القيمة",
        body: `استلم ${confirmedByName} قيمة ${t.senderName} بمبلغ ${Number(t.amount).toLocaleString("ar-LY")} د.ل\nالتاريخ: ${dateStr} | ${timeStr}${noteText}`,
        isRead: false,
        createdAt: now,
      },
      ...otherReceivers.map((userId) => ({
        id: generateId(),
        userId,
        transactionId: t.id,
        title: "✅ تأكيد استلام",
        body: `قام ${confirmedByName} بتأكيد استلام قيمة ${t.senderName} (${Number(t.amount).toLocaleString("ar-LY")} د.ل)${noteText}`,
        isRead: false,
        createdAt: now,
      })),
    ]);

    const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, req.params.id));
    res.json(mapTransaction(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/reports/financial", async (req, res) => {
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

    const query = db.select().from(transactionsTable);
    const transactions = startDate
      ? await query.where(gte(transactionsTable.createdAt, startDate))
      : await query;

    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPaid = transactions.reduce((sum, t) => sum + Number(t.paidAmount), 0);
    const pending = transactions.filter((t) => t.status === "pending");
    const received = transactions.filter((t) => t.status === "received");
    const totalPending = pending.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalReceived = received.reduce((sum, t) => sum + Number(t.amount), 0);

    const byMonth: Record<string, { amount: number; count: number }> = {};
    for (const t of transactions) {
      const key = t.createdAt.toISOString().substring(0, 7);
      if (!byMonth[key]) byMonth[key] = { amount: 0, count: 0 };
      byMonth[key].amount += Number(t.amount);
      byMonth[key].count += 1;
    }

    const transactionsByPeriod = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...data }));

    res.json({ totalAmount, totalPaid, totalPending, totalReceived, pendingCount: pending.length, receivedCount: received.length, transactionsByPeriod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [t] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, req.params.id));
    if (!t) { res.status(404).json({ error: "المعاملة غير موجودة" }); return; }

    await db.delete(notificationsTable).where(eq(notificationsTable.transactionId, req.params.id));
    await db.delete(transactionsTable).where(eq(transactionsTable.id, req.params.id));
    res.json({ success: true, deletedId: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
