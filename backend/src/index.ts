import "dotenv/config";
import express, { Request, Response, Application } from "express";
import cors from "cors";
import { validateEnv, env } from "./config/env.js";
import { disconnectPrisma, getDatabaseInfo, getPrisma, initPrisma } from "./lib/prisma.js";

validateEnv();

const app: Application = express();

app.use(cors());
app.use(express.json());

initPrisma();

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "School Management System API",
    mode: env.mode,
    database: getDatabaseInfo().provider,
  });
});

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.json({ status: "ok", ...getDatabaseInfo() });
  } catch (error) {
    res.status(503).json({
      status: "error",
      ...getDatabaseInfo(),
      message: error instanceof Error ? error.message : "Database connection failed",
    });
  }
});
app.post("/create-user", async (req: Request, res: Response) => {
  const { email, name, phone } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  const userData: { email: string; name?: string; phone?: string } = { email };
  if (name) userData.name = name;
  if (phone) userData.phone = phone;
  try {
    const user = await getPrisma().user.create({
      data: userData,
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create user",
    });
  }
});
app.get("/get-users", async (_req: Request, res: Response) => {
  try {
    const users = await getPrisma().user.findMany({
      orderBy: { id: "asc" },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch users",
    });
  }
});

app.listen(env.port, () => {
  const db = getDatabaseInfo();
  console.log(`Server running on http://localhost:${env.port}`);
  console.log(`Mode: ${db.mode} (${db.provider})`);
});

process.on("SIGINT", async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectPrisma();
  process.exit(0);
});
