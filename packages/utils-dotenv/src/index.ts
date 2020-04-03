import { config } from "dotenv";
import findUp from "find-up";

export function loadDotenv() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const path = findUp.sync(".env");

  if (path) {
    config({ path });
  }
}
