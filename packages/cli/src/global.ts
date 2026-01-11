import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { xdgCache, xdgConfig, xdgData, xdgState } from "xdg-basedir";

const app = "ralph";

/** Ralph icon - clockwise closed circle arrow (U+2941) */
export const RALPH_ICON = "⥁";

// Provide fallback paths when xdg values are undefined (can happen on some systems)
const home = os.homedir();
const data = path.join(xdgData ?? path.join(home, ".local", "share"), app);
const cache = path.join(xdgCache ?? path.join(home, ".cache"), app);
const config = path.join(xdgConfig ?? path.join(home, ".config"), app);
const state = path.join(xdgState ?? path.join(home, ".local", "state"), app);

export namespace Global {
  export const Path = {
    home,
    data,
    bin: path.join(data, "bin"),
    log: path.join(data, "log"),
    cache,
    config,
    state,
  };
}

await Promise.all([
  fs.mkdir(Global.Path.config, { recursive: true }),
  fs.mkdir(Global.Path.state, { recursive: true }),
  fs.mkdir(Global.Path.log, { recursive: true }),
  fs.mkdir(Global.Path.bin, { recursive: true }),
]);

const CACHE_VERSION = "1";

const version = await Bun.file(path.join(Global.Path.cache, "version"))
  .text()
  .catch(() => "0");

if (version !== CACHE_VERSION) {
  try {
    const contents = await fs.readdir(Global.Path.cache);
    await Promise.all(
      contents.map((item) =>
        fs.rm(path.join(Global.Path.cache, item), {
          recursive: true,
          force: true,
        })
      )
    );
  } catch (_e) {}
  await Bun.file(path.join(Global.Path.cache, "version")).write(CACHE_VERSION);
}
