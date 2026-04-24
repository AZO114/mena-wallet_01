import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { userId, unreadOnly } = req.query;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    let conditions: any[] = [eq(notificationsTable.userId, userId as string)];

    if (unreadOnly === "true") {
      conditions.push(eq(notificationsTable.isRead, false));
    }

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.createdAt));

    res.json(
      notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        transactionId: n.transactionId,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, req.params.id));

    const [n] = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, req.params.id));

    if (!n) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      id: n.id,
      userId: n.userId,
      transactionId: n.transactionId,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/read-all", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, userId));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
