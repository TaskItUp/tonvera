import express, { type Request, type Response } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import cors from "cors";
import dotenv from 'dotenv';
import stakingApiRouter from "./stakingApi";
import { StakingServer } from "./stakingServer";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize staking backend
let stakingServerInstance: StakingServer | null = null;

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "TON Staking Server running" });
});

// Mount staking API routes
app.use('/api', stakingApiRouter);

const server = createServer(app);

async function main() {
  const port = 5000;

  try {
    // Initialize staking server components
    log("🔄 Initializing TON Staking Server...");
    stakingServerInstance = new StakingServer();
    await stakingServerInstance.initialize();
    log("✅ TON Staking Server initialized");
  } catch (error) {
    log(`❌ Failed to initialize staking server: ${error}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(port, "0.0.0.0", () => {
    log(`🚀 TON Staking Server running on http://localhost:${port}`);
    log(`📊 Health check: http://localhost:${port}/api/health`);
    log(`🔗 API endpoints: http://localhost:${port}/api/*`);
  });
}

main();