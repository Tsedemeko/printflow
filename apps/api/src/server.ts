import { assertProductionConfig, config } from "./config.js";
import { createApp } from "./app.js";
import { hydratePersistentState } from "./store.js";
import { ensureRuntimeSchema } from "./services/migrate.js";
import { remotePersistenceEnabled } from "./services/persistence.js";

assertProductionConfig();

// Create/refresh our own tables before loading state, so a fresh database needs no manual SQL.
await ensureRuntimeSchema();
await hydratePersistentState();

// Make the persistence target unmistakable in the logs.
if (remotePersistenceEnabled()) {
  console.log("[persistence] Database (Supabase) is the source of truth — local disk is not used.");
} else {
  const warn = config.nodeEnv === "production" ? "WARNING: " : "";
  console.warn(`[persistence] ${warn}No database configured — data is stored on local disk only and will reset on redeploy. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to persist to the database.`);
}

const app = createApp();
app.listen(config.port, () => {
  console.log(`PrintFlow API listening on http://localhost:${config.port}`);
});
