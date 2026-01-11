/**
 * Read from a stream and call onText for each chunk
 */
export async function readStream(
  reader: { read(): Promise<{ done: boolean; value?: Uint8Array }> },
  onText: (text: string) => void
): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let fullOutput = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const text = decoder.decode(value, { stream: true });
    fullOutput += text;
    onText(text);
  }

  return fullOutput;
}

/**
 * Check if a command is available on the system
 * Uses 'where' on Windows, 'which' on Unix-like systems
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const isWindows = process.platform === "win32";
    const checkCommand = isWindows ? "where" : "which";

    const proc = Bun.spawn([checkCommand, command], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}
