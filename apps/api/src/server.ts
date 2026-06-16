import { assertProductionConfig, config } from "./config.js";
import { createApp } from "./app.js";
import { hydratePersistentState } from "./store.js";

assertProductionConfig();

await hydratePersistentState();

const app = createApp();
app.listen(config.port, () => {
  console.log(`PrintFlow API listening on http://localhost:${config.port}`);
});
