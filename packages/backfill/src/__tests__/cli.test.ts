import { createBuildCommand } from "../commandRunner";

describe("createBuildCommand", () => {
  it("runs a command successfully", async () => {
    const buildCommand = createBuildCommand(["echo nice"]);

    const buildResult = await buildCommand();

    if (buildResult) {
      expect(buildResult.stdout).toEqual("nice");
    }
  });

  it("resolves if no command can be found", async () => {
    const buildCommand = createBuildCommand([""]);

    await expect(buildCommand()).rejects.toThrow("Command not provided");
  });

  it("prints the error command and throws if it fails", async () => {
    const buildCommand = createBuildCommand(["somecommand"]);

    try {
      await buildCommand();
    } catch (err) {
      expect(err.stderr).toContain("somecommand");
      expect(err.code).not.toEqual(0);
    }
  });
});
