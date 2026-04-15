import type { ImageBlock as ImageBlockType } from "#parsers/message-types";

export interface ImageBlockProps {
  block: ImageBlockType;
}

export function ImageBlock(props: ImageBlockProps) {
  const sizeKb = () => Math.round((props.block.data.length * 3) / 4 / 1024);

  return (
    <box style={{ paddingLeft: 2 }}>
      <text>
        <span style={{ fg: "#9d7cd8" }}>* </span>
        <span style={{ fg: "#808080" }}>Image</span>
        <span style={{ fg: "#606060" }}>
          {" "}
          ({props.block.mimeType}, ~{sizeKb()}KB)
        </span>
      </text>
    </box>
  );
}
