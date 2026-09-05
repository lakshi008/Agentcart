// Backward-compatible alias. The catalog is now downloaded from Kaggle via kagglehub.
import { spawnSync } from "child_process";
const result = spawnSync(process.platform === "win32" ? "python" : "python3", ["scripts/fetch-kaggle.py"], { stdio: "inherit" });
process.exit(result.status ?? 1);
