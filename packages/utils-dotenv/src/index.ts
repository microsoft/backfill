import { config } from "dotenv";
import * as findUp from "find-up";

export function loadDotenv() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const path = findUp.sync(".env");

  if (path) {
    config({ path });
  }
}
