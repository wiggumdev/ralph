/**
 * Minimal fake ACP agent used by adapter tests.
 *
 * Behaviour is driven by CLI flags so a single script can stand in for agents
 * with different capabilities:
 *
 * - --modes=none|advertise   whether session/new advertises modes
 * - --set-mode=missing|ok    whether session/set_mode is implemented
 * - --noise                  emit a non-object JSON line before replying
 */

const flags = process.argv.slice(2);

function flag(name: string, fallback: string): string {
  const match = flags.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
}

const modesMode = flag("modes", "none");
const setModeMode = flag("set-mode", "missing");
const noise = flags.includes("--noise");

function send(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id: unknown, value: unknown): void {
  send({ jsonrpc: "2.0", id, result: value });
}

function methodNotFound(id: unknown, method: string): void {
  send({
    jsonrpc: "2.0",
    id,
    error: { code: -32_601, message: `Method '${method}' not found` },
  });
}

function handle(message: {
  id?: unknown;
  method?: string;
  params?: unknown;
}): void {
  const { id, method } = message;
  if (method === "initialize") {
    result(id, {
      protocolVersion: 1,
      agentCapabilities: { loadSession: false },
      agentInfo: { name: "fake-agent", version: "0.0.0" },
    });
    return;
  }
  if (method === "session/new") {
    result(
      id,
      modesMode === "advertise"
        ? {
            sessionId: "fake-session",
            modes: {
              currentModeId: "default",
              availableModes: [
                { id: "default", name: "Default" },
                { id: "acceptEdits", name: "Accept Edits" },
              ],
            },
          }
        : { sessionId: "fake-session" }
    );
    return;
  }
  if (method === "session/set_mode") {
    if (setModeMode === "ok") {
      const modeId = (message.params as { modeId?: string } | undefined)
        ?.modeId;
      // Echo the accepted mode back so tests can assert it was applied.
      send({
        jsonrpc: "2.0",
        method: "session/update",
        params: {
          sessionId: "fake-session",
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: `set_mode:${modeId}` },
          },
        },
      });
      result(id, null);
    } else {
      methodNotFound(id, "session/set_mode");
    }
    return;
  }
  if (method === "session/prompt") {
    if (noise) {
      // Agents sometimes print bare JSON scalars (log lines, banners) on
      // stdout. These parse fine but are not JSON-RPC messages.
      process.stdout.write('"warning: something happened"\n');
    }
    result(id, { stopReason: "end_turn" });
    return;
  }
  if (id !== undefined) {
    methodNotFound(id, method ?? "unknown");
  }
}

let buffer = "";
process.stdin.on("data", (chunk: Buffer) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      handle(JSON.parse(trimmed));
    }
  }
});
