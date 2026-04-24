import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/transactions", transactionsRouter);
router.use("/notifications", notificationsRouter);
router.use("/reports", reportsRouter);
router.use("/ai", aiRouter);

export default router;
