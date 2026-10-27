import { spawn, spawnSync, type SpawnOptions } from "node:child_process";

export type TestProcessOptions = Pick<SpawnOptions, "cwd" | "env"> & {
  timeout: number;
};

interface TestProcessResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

/**
 * Own the complete subprocess tree, not only a package-manager launcher.
 * POSIX (CI/Linux and macOS): a fresh session/group; Windows: taskkill /T.
 * Commands must not deliberately detach descendants into unrelated sessions.
 */
export function runTestProcess(
  command: string,
  args: string[],
  { timeout, ...options }: TestProcessOptions,
): Promise<TestProcessResult> {
  if (!Number.isFinite(timeout) || timeout <= 0) {
    return Promise.reject(new Error("A positive process timeout is required"));
  }
  // Git hooks export repository/index paths that override a child's cwd.
  // Fixture subprocesses must discover their own repository, never the caller's.
  const env = { ...(options.env ?? process.env) };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_")) delete env[key];
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let failure: Error | undefined;
    let treeStopRequested = false;
    const stopTree = () => {
      if (!child.pid || treeStopRequested) return;
      treeStopRequested = true;
      try {
        if (process.platform === "win32") {
          const stopped = spawnSync(
            "taskkill",
            ["/PID", String(child.pid), "/T", "/F"],
            {
              env,
              encoding: "utf8",
              timeout: 1000,
              killSignal: "SIGKILL",
            },
          );
          if (stopped.error || stopped.status !== 0) {
            child.kill("SIGKILL");
            failure ??=
              stopped.error ??
              new Error(`Unable to stop owned process tree: ${stopped.stderr}`);
          }
        } else {
          // Only signal the fresh group created by this invocation. Bun and
          // its Node/CLI descendants inherit it unless they explicitly detach.
          process.kill(-child.pid, "SIGKILL");
        }
      } catch (error) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ESRCH"
        )) {
          failure ??= error instanceof Error ? error : new Error(String(error));
        }
      }
    };
    const timer = setTimeout(() => {
      failure = Object.assign(
        new Error(`Process timed out after ${timeout}ms: ${command}`),
        { code: "ETIMEDOUT" },
      );
      stopTree();
    }, timeout);
    const collect = (target: "stdout" | "stderr", chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      // Preserve the old spawnSync output bound rather than buffering forever.
      if (bytes > 1024 * 1024) {
        failure ??= Object.assign(new Error("Process output exceeded 1 MiB"), {
          code: "ENOBUFS",
        });
        stopTree();
        return;
      }
      if (target === "stdout") stdout += chunk;
      else stderr += chunk;
    };
    child.stdout
      .setEncoding("utf8")
      .on("data", (chunk: string) => collect("stdout", chunk));
    child.stderr
      .setEncoding("utf8")
      .on("data", (chunk: string) => collect("stderr", chunk));
    child.once("error", (error) => {
      failure = error;
    });
    child.once("exit", () => {
      // Also prevent a normally-exiting launcher from leaving background work.
      if (process.platform !== "win32") stopTree();
    });
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      child.stdout.removeAllListeners("data");
      child.stderr.removeAllListeners("data");
      child.removeAllListeners("error");
      child.removeAllListeners("exit");
      if (failure) reject(Object.assign(failure, { stdout, stderr }));
      else resolve({ status, signal, stdout, stderr });
    });
  });
}
