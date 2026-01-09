/**
 * Read from a stream and call onText for each chunk
 */
export async function readStream(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reader: ReadableStreamDefaultReader<any>,
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
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", command], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}
