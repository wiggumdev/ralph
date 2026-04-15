import { spawn } from "bun";

export async function copyToClipboard(text: string): Promise<boolean> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      const proc = spawn(["pbcopy"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      return proc.exitCode === 0;
    }

    if (platform === "linux") {
      // Try xclip first, then xsel
      const proc = spawn(["xclip", "-selection", "clipboard"], {
        stdin: "pipe",
      });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      if (proc.exitCode === 0) {
        return true;
      }

      // Fallback to xsel
      const proc2 = spawn(["xsel", "--clipboard", "--input"], {
        stdin: "pipe",
      });
      proc2.stdin.write(text);
      proc2.stdin.end();
      await proc2.exited;
      return proc2.exitCode === 0;
    }

    if (platform === "win32") {
      const proc = spawn(["clip"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      return proc.exitCode === 0;
    }

    return false;
  } catch {
    return false;
  }
}
