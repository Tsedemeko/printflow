import { assertProductionConfig, config } from "./config.js";
import { createApp } from "./app.js";
import { hydratePersistentState } from "./store.js";
import { ensureRuntimeSchema } from "./services/migrate.js";

assertProductionConfig();

// Create/refresh our own tables before loading state, so a fresh database needs no manual SQL.
await ensureRuntimeSchema();
await hydratePersistentState();

const app = createApp();
app.listen(config.port, () => {
  console.log(`PrintFlow API listening on http://localhost:${config.port}`);
});
