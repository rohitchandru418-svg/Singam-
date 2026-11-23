import { rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.env.SINGAM_DB_PATH ?? path.join(here, "..", "data", "singam.db");
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  const target = file + suffix;
  if (existsSync(target)) {
    rmSync(target);
    console.log(`removed ${target}`);
  }
}
console.log("database reset; it will be reseeded on the next request");
