import { Router, type IRouter } from "express";

const router: IRouter = Router();

const USERS = [
  { userId: "muataz", name: "معتز الورفلي", role: "sender", pin: "MU@2025" },
  { userId: "salwan", name: "سلوان عباس", role: "receiver", pin: "SA@2025" },
  { userId: "rayan", name: "ريان عباس", role: "receiver", pin: "RA@2025" },
  { userId: "anas", name: "أنس جميل", role: "receiver", pin: "AJ@2025" },
];

router.post("/login", (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    res.status(400).json({ error: "PIN is required" });
    return;
  }

  const user = USERS.find((u) => u.pin === pin);

  if (!user) {
    res.status(401).json({ error: "رمز خاطئ. يرجى المحاولة مجدداً." });
    return;
  }

  res.json({
    userId: user.userId,
    name: user.name,
    role: user.role,
    token: `token-${user.userId}-${Date.now()}`,
  });
});

export default router;
