import { setLogLevel } from "backfill-generic-logger";

// Set timeout to 30 seconds
jest.setTimeout(30 * 1000);

setLogLevel("error");
