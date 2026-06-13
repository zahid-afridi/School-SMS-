import "dotenv/config";
import express, { Request, Response, Application } from "express";
import cors from "cors";
import { validateEnv, env } from "./config/env.js";
import { HttpStatus } from "./constants/httpStatus.js";
import { ApiMessages } from "./constants/messages.js";
import { disconnectPrisma, getDatabaseInfo, getPrisma, initPrisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import router from "./routes/index.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { AppError } from "./utils/AppError.js";
import { asyncHandler } from "./utils/asyncHandler.js";

validateEnv();

const app: Application = express();

app.use(cors());
app.use(express.json());

initPrisma();

app.get(
  "/health",
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      return ApiResponse.success(res, {
        message: "Service is healthy",
        data: getDatabaseInfo(),
      });
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : ApiMessages.DB_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  })
);

app.use("/api", router);

app.use(notFoundHandler);
app.use(errorHandler);

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
