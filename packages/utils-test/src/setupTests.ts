import { setLogLevel } from "backfill-logger";

// Set timeout to 30 seconds
jest.setTimeout(30 * 1000);

setLogLevel("error");
