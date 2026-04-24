import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, notificationsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

function fmt(n: number) {
  return n.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}
function fmtDate(d: Date) {
  return d.toLocaleString("ar-LY", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function getDbContext(): Promise<string> {
  const transactions = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));

  const pending = transactions.filter((t) => t.status === "pending");
  const received = transactions.filter((t) => t.status === "received");
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPaid = transactions.reduce((sum, t) => sum + Number(t.paidAmount), 0);
  const totalPending = pending.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalReceived = received.reduce((sum, t) => sum + Number(t.amount), 0);

  // Per-recipient stats
  const byRecipient: Record<string, { count: number; amount: number; paid: number; pending: number }> = {};
  for (const t of transactions) {
    const r = t.recipientName || "غير محدد";
    if (!byRecipient[r]) byRecipient[r] = { count: 0, amount: 0, paid: 0, pending: 0 };
    byRecipient[r].count++;
    byRecipient[r].amount += Number(t.amount);
    byRecipient[r].paid += Number(t.paidAmount);
    if (t.status === "pending") byRecipient[r].pending += Number(t.amount);
  }
  const recipientStats = Object.entries(byRecipient)
    .map(([name, s]) => `  • ${name}: ${s.count} معاملة | إجمالي ${fmt(s.amount)} د.ل | مسدد ${fmt(s.paid)} د.ل | معلق ${fmt(s.pending)} د.ل`)
    .join("\n");

  // Full transaction list
  const txLines = transactions.map((t, i) => {
    const status = t.status === "pending" ? "⏳ معلقة" : "✅ مستلمة";
    const remaining = Number(t.amount) - Number(t.paidAmount);
    let line = `[${i + 1}] رقم: ${t.id}
   المرسل: ${t.senderName}
   المستقبل: ${t.recipientName}
   المبلغ: ${fmt(Number(t.amount))} د.ل | المسدد: ${fmt(Number(t.paidAmount))} د.ل | المتبقي: ${fmt(remaining)} د.ل
   الحالة: ${status}
   تاريخ الإنشاء: ${fmtDate(t.createdAt)}`;
    if (t.confirmedByName) line += `\n   تأكيد الاستلام بواسطة: ${t.confirmedByName}`;
    if (t.confirmedAt) line += ` في ${fmtDate(t.confirmedAt)}`;
    if (t.notes) line += `\n   ملاحظة المرسل: ${t.notes}`;
    if (t.confirmationNotes) line += `\n   ملاحظة الاستلام: ${t.confirmationNotes}`;
    return line;
  }).join("\n\n");

  const lastTx = transactions[0];
  const lastTxSummary = lastTx
    ? `المرسل: ${lastTx.senderName} | المستقبل: ${lastTx.recipientName} | المبلغ: ${fmt(Number(lastTx.amount))} د.ل | الحالة: ${lastTx.status === "pending" ? "معلقة" : "مستلمة"} | التاريخ: ${fmtDate(lastTx.createdAt)}`
    : "لا توجد معاملات";

  const now = new Date().toLocaleString("ar-LY", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", weekday: "long" });

  return `أنت مساعد ذكي متخصص لشركة MENA Express لإدارة القيم المالية.
التاريخ والوقت الحالي: ${now}

⚠️ قواعد صارمة يجب اتباعها دائماً:
1. إجاباتك عن أي سؤال يخص البيانات (معاملات، أشخاص، مبالغ، تواريخ) يجب أن تأتي فقط من البيانات المقدمة أدناه — لا من معلومات عامة.
2. إذا سألك المستخدم "من آخر حد استلم قيمة؟" → ابحث في قائمة المعاملات الكاملة وأعطِه الإجابة الدقيقة من البيانات.
3. إذا سألك عن مبلغ أو شخص أو تاريخ → اقرأ البيانات المقدمة واستخرج الرقم الدقيق.
4. لا تخترع أي معلومة ولا تعطِ أرقاماً تقريبية — الأرقام الموجودة في البيانات هي الصحيحة.
5. أجب بالعربية دائماً بشكل واضح ومباشر.
6. يمكنك تحليل الصور والمستندات إذا أُرسلت إليك.

فيما يلي البيانات الكاملة والحالية للنظام — هذه هي مصدر الحقيقة الوحيد:

━━━━━━━━━━━━━━━━━━━━━━
📊 الإحصائيات الإجمالية (${transactions.length} معاملة):
- إجمالي القيم: ${fmt(totalAmount)} د.ل
- القيم المعلقة: ${fmt(totalPending)} د.ل (${pending.length} معاملة)
- القيم المستلمة: ${fmt(totalReceived)} د.ل (${received.length} معاملة)
- إجمالي المسدد: ${fmt(totalPaid)} د.ل
- المتبقي غير المسدد: ${fmt(totalAmount - totalPaid)} د.ل
- نسبة الاستلام: ${transactions.length > 0 ? ((received.length / transactions.length) * 100).toFixed(1) : 0}%

━━━━━━━━━━━━━━━━━━━━━━
🔴 آخر معاملة مسجلة:
${lastTxSummary}

━━━━━━━━━━━━━━━━━━━━━━
👥 إحصائيات حسب المستقبل:
${recipientStats}

━━━━━━━━━━━━━━━━━━━━━━
📋 قائمة جميع المعاملات (من الأحدث للأقدم):

${txLines}

━━━━━━━━━━━━━━━━━━━━━━
المستخدمون في النظام:
- معتز الورفلي (مرسل): يضيف القيم
- سلوان عباس (مستقبل): يستلم ويؤكد
- ريان عباس (مستقبل): يستلم ويؤكد
- أنس جميل (مستقبل): يستلم ويؤكد`;
}

router.post("/chat", async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
      return;
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    const systemContext = await getDbContext();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mena-wallet.replit.app",
        "X-Title": "Mena AI Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemContext },
          ...messages,
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", errText);
      let errMsg = "AI service error";
      try {
        const errJson = JSON.parse(errText);
        if (response.status === 429 || errJson?.error?.code === 429) {
          errMsg = "rate limit: " + (errJson?.error?.metadata?.raw || "too many requests");
          res.status(429).json({ error: errMsg });
          return;
        }
        errMsg = errJson?.error?.message || errMsg;
      } catch {}
      res.status(502).json({ error: errMsg, details: errText });
      return;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content ?? "";

    res.json({
      message: content,
      model: data.model ?? MODEL,
      usage: data.usage,
    });
  } catch (err: any) {
    console.error("AI chat error:", err);
    if (err?.name === "AbortError" || err?.code === "UND_ERR_HEADERS_TIMEOUT") {
      res.status(504).json({ error: "انتهى وقت الانتظار — الـ AI يعالج الصور بوقت أطول، حاول مرة أخرى" });
      return;
    }
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
