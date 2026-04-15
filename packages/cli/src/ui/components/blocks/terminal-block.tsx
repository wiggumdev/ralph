import { Show } from "solid-js";
import type { TerminalBlock as TerminalBlockType } from "#parsers/message-types";
import "opentui-spinner/solid";
import { defaultSyntaxStyle } from "#ui/styles/syntax-styles";

export interface TerminalBlockProps {
  block: TerminalBlockType;
  showOutput?: boolean;
}

export function TerminalBlock(props: TerminalBlockProps) {
  const isRunning = () => props.block.status === "running";

  const statusColor = () => {
    if (props.block.status === "running") {
      return "#f5a742";
    }
    if (props.block.status === "completed" && props.block.exitCode === 0) {
      return "#7fd88f";
    }
    return "#ff6666";
  };

  const lineCount = () => {
    if (!props.block.output) {
      return 0;
    }
    return props.block.output.split("\n").length;
  };

  const exitInfo = () => {
    if (props.block.exitCode !== undefined && props.block.exitCode !== null) {
      return ` exit ${props.block.exitCode}`;
    }
    if (props.block.signal) {
      return ` ${props.block.signal}`;
    }
    return "";
  };

  const summary = () => {
    const lines = lineCount();
    const truncatedNote = props.block.truncated ? " (truncated)" : "";

    if (props.block.status === "running") {
      return `${lines} line${lines !== 1 ? "s" : ""}${truncatedNote}`;
    }

    return `${lines} line${lines !== 1 ? "s" : ""}${exitInfo()}${truncatedNote}`;
  };

  return (
    <box flexDirection="column">
      <Show when={props.block.output || props.block.status !== "running"}>
        <box alignItems="center" flexDirection="row">
          <Show
            fallback={
              <text>
                <span style={{ fg: statusColor() }}>⠿</span>
              </text>
            }
            when={isRunning()}
          >
            <spinner color={statusColor()} name="dots" />
          </Show>
          <text>
            <span style={{ fg: "#666666" }}> {summary()}</span>
          </text>
        </box>
      </Show>
      <Show when={props.showOutput && props.block.output}>
        <box style={{ marginLeft: 2, marginTop: 1 }}>
          <code
            content={props.block.output ?? ""}
            filetype="bash"
            syntaxStyle={defaultSyntaxStyle}
          />
        </box>
      </Show>
    </box>
  );
}
