// ============================================================================
// EMP-EXIT SERVER ENTRY POINT
// ============================================================================

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { config } from "./config";
import { initDB, closeDB } from "./db/adapters";
import { initEmpCloudDB, migrateEmpCloudDB, closeEmpCloudDB } from "./db/empcloud";
import { logger } from "./utils/logger";

// Route imports
import { healthRoutes } from "./api/routes/health.routes";
import { authRoutes } from "./api/routes/auth.routes";
import { exitRoutes } from "./api/routes/exit.routes";
import { selfServiceRoutes } from "./api/routes/self-service.routes";
import { checklistRoutes } from "./api/routes/checklist.routes";
import { clearanceRoutes } from "./api/routes/clearance.routes";
import { interviewRoutes } from "./api/routes/interview.routes";
import { fnfRoutes } from "./api/routes/fnf.routes";
import { assetRoutes } from "./api/routes/asset.routes";
import { ktRoutes } from "./api/routes/kt.routes";
import { letterRoutes } from "./api/routes/letter.routes";
import { alumniRoutes } from "./api/routes/alumni.routes";
import { analyticsRoutes } from "./api/routes/analytics.routes";
import { predictionRoutes } from "./api/routes/prediction.routes";
import { settingsRoutes } from "./api/routes/settings.routes";
import { buyoutRoutes } from "./api/routes/buyout.routes";
import { rehireRoutes } from "./api/routes/rehire.routes";
import { emailTemplateRoutes } from "./api/routes/email-template.routes";
import { errorHandler } from "./api/middleware/error.middleware";
import { apiLimiter } from "./api/middleware/rate-limit.middleware";
import { swaggerUIHandler, openapiHandler } from "./api/docs";

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (config.cors.origin === "*") return callback(null, true);
      // Allow empcloud.com subdomains (production & test)
      if (origin.endsWith(".empcloud.com") && origin.startsWith("https://")) {
        return callback(null, true);
      }
      if (
        config.env === "development" &&
        (origin.startsWith("http://localhost") ||
          origin.startsWith("http://127.0.0.1") ||
          origin.endsWith(".ngrok-free.dev"))
      ) {
        return callback(null, true);
      }
      const allowed = config.cors.origin.split(",").map((s) => s.trim());
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.use("/health", healthRoutes);

// ---------------------------------------------------------------------------
// API Routes (v1)
// ---------------------------------------------------------------------------
const v1 = express.Router();
v1.use(apiLimiter);

// Auth (no apiLimiter — has its own authLimiter)
v1.use("/auth", authRoutes);

// Exit management routes
v1.use("/exits", exitRoutes);
v1.use("/self-service", selfServiceRoutes);
v1.use("/checklists", checklistRoutes);
v1.use("/clearance", clearanceRoutes);
v1.use("/interviews", interviewRoutes);
v1.use("/fnf", fnfRoutes);
v1.use("/assets", assetRoutes);
v1.use("/kt", ktRoutes);
v1.use("/letters", letterRoutes);
v1.use("/letter-templates", letterRoutes); // alias — some clients use /letter-templates instead of /letters
v1.use("/alumni", alumniRoutes);
v1.use("/analytics", analyticsRoutes);
v1.use("/predictions", predictionRoutes);
v1.use("/settings", settingsRoutes);
v1.use("/buyout", buyoutRoutes);
v1.use("/rehire", rehireRoutes);
v1.use("/email-templates", emailTemplateRoutes);

app.use("/api/v1", v1);

// API Documentation
app.get("/api/docs", swaggerUIHandler);
app.get("/api/docs/openapi.json", openapiHandler);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function start() {
  try {
    // Validate configuration
    const { validateConfig } = await import("./config/validate");
    validateConfig();

    // Initialize EmpCloud master database (users, orgs, auth)
    await initEmpCloudDB();
    await migrateEmpCloudDB();

    // Initialize exit module database
    const db = await initDB();
    logger.info("Exit database connected");

    // Run migrations
    await db.migrate();
    logger.info("Exit database migrations applied");

    // Start server
    app.listen(config.port, config.host, () => {
      logger.info(`emp-exit server running at http://${config.host}:${config.port}`);
      logger.info(`   Environment: ${config.env}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down...");
  await closeDB();
  await closeEmpCloudDB();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();

export { app };
