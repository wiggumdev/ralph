import { Show } from "solid-js";
import type { EmbeddedResourceBlock as EmbeddedResourceBlockType } from "#parsers/message-types";

export interface EmbeddedResourceBlockProps {
  block: EmbeddedResourceBlockType;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}...`;
}

export function EmbeddedResourceBlock(props: EmbeddedResourceBlockProps) {
  const resource = () => props.block.resource;
  const isText = () => resource().type === "text";
  const fileName = () => {
    const uri = resource().uri;
    return uri.split("/").pop() || uri;
  };

  return (
    <box flexDirection="column" style={{ paddingLeft: 2 }}>
      <text>
        <span style={{ fg: "#7fd88f" }}>@ </span>
        <span style={{ fg: "#808080" }}>{fileName()}</span>
        <span style={{ fg: "#606060" }}>
          {" "}
          ({resource().mimeType || "text"})
        </span>
      </text>
      <Show when={isText() && "text" in resource()}>
        <box style={{ marginLeft: 4 }}>
          <text>
            <span style={{ fg: "#888888" }}>
              {truncateText(
                (resource() as { type: "text"; text: string }).text,
                100
              )}
            </span>
          </text>
        </box>
      </Show>
    </box>
  );
}
