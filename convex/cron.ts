import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Update stock prices every 30 minutes during market hours (9:30 AM - 4:00 PM ET, Monday-Friday)
crons.interval(
  "update stock prices",
  { minutes: 30 },
  internal.background.updateStockPrices
);

// Update news data twice daily at 6 AM and 12 PM ET (before market open and midday)
crons.cron(
  "update news data morning", 
  "0 6 * * *", // Daily at 6 AM
  internal.background.updateNewsData
);

crons.cron(
  "update news data midday", 
  "0 12 * * *", // Daily at 12 PM
  internal.background.updateNewsData
);

// Clean up old data daily at 2 AM ET
crons.cron(
  "cleanup old data",
  "0 2 * * *", // Daily at 2 AM
  internal.background.cleanupOldData
);

// Health check every 4 hours to monitor API status (reduced frequency)
crons.interval(
  "api health check",
  { hours: 4 },
  internal.background.healthCheck
);

export default crons;