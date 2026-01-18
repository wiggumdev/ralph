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

// Markdown colors
const MD_HEADING = RGBA.fromHex("#C792EA");
const MD_STRONG = RGBA.fromHex("#F78C6C");
const MD_EMPH = RGBA.fromHex("#FFCB6B");
const MD_CODE = RGBA.fromHex("#7fd88f");
const MD_LINK = RGBA.fromHex("#82AAFF");
const MD_LINK_TEXT = RGBA.fromHex("#5c9cf5");
const MD_QUOTE = RGBA.fromHex("#fab283");
const MD_LIST = RGBA.fromHex("#9d7cd8");
const MD_TEXT = RGBA.fromHex("#cccccc");

export const markdownSyntaxStyle = SyntaxStyle.fromTheme([
  { scope: ["markup.heading"], style: { foreground: MD_HEADING, bold: true } },
  {
    scope: ["markup.bold", "markup.strong"],
    style: { foreground: MD_STRONG, bold: true },
  },
  { scope: ["markup.italic"], style: { foreground: MD_EMPH, italic: true } },
  {
    scope: ["markup.raw", "markup.raw.block", "markup.raw.inline"],
    style: { foreground: MD_CODE },
  },
  { scope: ["markup.link"], style: { foreground: MD_LINK, underline: true } },
  {
    scope: ["markup.link.label"],
    style: { foreground: MD_LINK_TEXT, underline: true },
  },
  {
    scope: ["markup.link.url"],
    style: { foreground: MD_LINK, underline: true },
  },
  { scope: ["markup.quote"], style: { foreground: MD_QUOTE, italic: true } },
  { scope: ["markup.list"], style: { foreground: MD_LIST } },
  { scope: ["text"], style: { foreground: MD_TEXT } },
]);
