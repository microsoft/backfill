import * as execa from "execa";
import * as fs from "fs-extra";
import * as fg from "fast-glob";
import { Reporter } from "backfill-reporting";

export type ExecaReturns = execa.ExecaChildProcess;
export type BuildCommand = () => Promise<ExecaReturns | void>;

export function getRawBuildCommand(): string {
  return process.argv.slice(2).join(" ");
}

export function createBuildCommand(
  buildCommand: string[],
  clearOutput: boolean,
  outputGlob: string[],
  reporter: Reporter
): () => Promise<ExecaReturns | void> {
  return async (): Promise<ExecaReturns | void> => {
    const parsedBuildCommand = buildCommand.join(" ");

    if (!parsedBuildCommand) {
      throw new Error("Command not provided");
    }

    if (clearOutput) {
      const filesToClear = fg.sync(outputGlob);
      await Promise.all(filesToClear.map(async file => await fs.remove(file)));
    }

    // Set up runner
    const tracer = reporter.reportBuilder.setTime("buildTime");
    const runner = execa(parsedBuildCommand, {
      shell: true,
      ...(process.env.NODE_ENV !== "test" ? { stdio: "inherit" } : {})
    });

    return (
      runner
        // Add build time to the performance logger
        .then(() => {
          tracer.stop();
        })
        // Catch to pretty-print the command that failed and re-throw
        .catch(err => {
          if (process.env.NODE_ENV !== "test") {
            reporter.error(`Failed while running: "${parsedBuildCommand}"`);
          }
          throw err;
        })
    );
  };
}
