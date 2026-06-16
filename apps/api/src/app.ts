import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { router } from "./routes.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({
    limit: "10mb",
    verify: (req, _res, buf) => { (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf8"); }
  }));
  app.use(router);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request", issues: error.issues });
    }
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(statusCode).json({ error: message });
  });
  return app;
}
