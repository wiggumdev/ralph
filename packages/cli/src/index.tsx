import { TextAttributes } from "@opentui/core";
import { render } from "@opentui/solid";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
  .scriptName("ralph")
  .usage("$0 [command]")
  .help("help", "h")
  .version(false)
  .parseSync();

render(() => (
  <box alignItems="center" flexGrow={1} justifyContent="center">
    <box alignItems="flex-end" justifyContent="center">
      <ascii_font font="tiny" text="OpenTUI" />
      <text attributes={TextAttributes.DIM}>What will you build?</text>
    </box>
  </box>
));
