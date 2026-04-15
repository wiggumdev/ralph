import type { AudioBlock as AudioBlockType } from "#parsers/message-types";

export interface AudioBlockProps {
  block: AudioBlockType;
}

export function AudioBlock(props: AudioBlockProps) {
  const sizeKb = () => Math.round((props.block.data.length * 3) / 4 / 1024);

  return (
    <box style={{ paddingLeft: 2 }}>
      <text>
        <span style={{ fg: "#56b6c2" }}>~ </span>
        <span style={{ fg: "#808080" }}>Audio</span>
        <span style={{ fg: "#606060" }}>
          {" "}
          ({props.block.mimeType}, ~{sizeKb()}KB)
        </span>
      </text>
    </box>
  );
}
