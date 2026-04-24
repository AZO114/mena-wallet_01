import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

app.use((err: any, _req: any, res: any, next: any) => {
  if (err.type === "entity.too.large") {
    res.status(413).json({ error: "الملف كبير جداً، حاول تقليل حجم الصورة" });
    return;
  }
  next(err);
});

export default app;
