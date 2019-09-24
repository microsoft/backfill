import * as execa from "execa";
import * as fs from "fs-extra";
import { logger } from "backfill-logger";

export type ExecaReturns = execa.ExecaReturns;
export type BuildCommand = () => Promise<ExecaReturns | void>;

export function getRawBuildCommand(): string {
  return process.argv.slice(2).join(" ");
}

export function createBuildCommand(
  buildCommand: string[],
  clearOutputFolder: boolean,
  outputFolder: string
): () => Promise<ExecaReturns | void> {
  return async (): Promise<ExecaReturns | void> => {
    const parsedBuildCommand = buildCommand.join(" ");

    if (!parsedBuildCommand) {
      throw new Error("Command not provided");
    }

    // Clear outputFolder to guarantee a deterministic cache
    if (clearOutputFolder) {
      fs.removeSync(outputFolder);
    }

    // Set up runner
    logger.profile("buildCommand:run");
    const runner = execa.shell(parsedBuildCommand);

    // Stream stdout and stderr
    if (process.env.NODE_ENV !== "test") {
      runner.stdout.pipe(process.stdout);
      runner.stderr.pipe(process.stderr);
    }

    return (
      runner
        // Add build time to the performance logger
        .then(() => {
          logger.setTime("buildTime", "buildCommand:run");
        })
        // Catch to pretty-print the command that failed and re-throw
        .catch(err => {
          if (process.env.NODE_ENV !== "test") {
            logger.error(`\nFailed while running: ${parsedBuildCommand}`);
          }
          throw err;
        })
    );
  };
}
