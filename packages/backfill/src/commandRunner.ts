import * as execa from "execa";
import { telemetry } from "backfill-telemetry";

export type ExecaReturns = execa.ExecaReturns;
export type BuildCommand = () => Promise<ExecaReturns | void>;

export function getRawBuildCommand(): string {
  return process.argv.slice(2).join(" ");
}

export function createBuildCommand(
  buildCommand: string[]
): () => Promise<ExecaReturns | void> {
  return async (): Promise<ExecaReturns | void> => {
    const parsedBuildCommand = buildCommand.join(" ");

    if (!parsedBuildCommand) {
      throw new Error("Command not provided");
    }

    // Set up runner
    const startTime = Date.now();
    const runner = execa.shell(parsedBuildCommand);

    // Stream stdout and stderr
    if (process.env.NODE_ENV !== "test") {
      runner.stdout.pipe(process.stdout);
      runner.stderr.pipe(process.stderr);
    }

    return (
      runner
        // Add build time to telemetry
        .then(() => telemetry.setTime("buildTime", startTime, Date.now()))
        // Catch to pretty-print the command that failed and re-throw
        .catch(err => {
          if (process.env.NODE_ENV !== "test") {
            console.error(`\nFailed while running: ${parsedBuildCommand}`);
          }
          throw err;
        })
    );
  };
}
