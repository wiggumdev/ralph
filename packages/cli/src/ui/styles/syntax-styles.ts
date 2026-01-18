import { RGBA, SyntaxStyle } from "@opentui/core";

export const defaultSyntaxStyle = SyntaxStyle.fromStyles({
  keyword: { fg: RGBA.fromHex("#C792EA"), bold: true },
  string: { fg: RGBA.fromHex("#C3E88D") },
  comment: { fg: RGBA.fromHex("#546E7A"), italic: true },
  number: { fg: RGBA.fromHex("#F78C6C") },
  function: { fg: RGBA.fromHex("#82AAFF") },
  type: { fg: RGBA.fromHex("#FFCB6B") },
  operator: { fg: RGBA.fromHex("#89DDFF") },
  variable: { fg: RGBA.fromHex("#EEFFFF") },
  default: { fg: RGBA.fromHex("#A6ACCD") },
});
