import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Update stock prices every 5 minutes during market hours (9:30 AM - 4:00 PM ET, Monday-Friday)
crons.interval(
  "update stock prices",
  { minutes: 5 },
  internal.background.updateStockPrices
);

// Update news data every 15 minutes
crons.interval(
  "update news data", 
  { minutes: 15 },
  internal.background.updateNewsData
);

// Clean up old data daily at 2 AM ET
crons.cron(
  "cleanup old data",
  "0 2 * * *", // Daily at 2 AM
  internal.background.cleanupOldData
);

// Health check every hour to monitor API status
crons.interval(
  "api health check",
  { hours: 1 },
  internal.background.healthCheck
);

export default crons;