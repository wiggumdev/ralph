import fs from "node:fs/promises";
import path from "node:path";
import z from "zod";
import { Global } from "./global";

export namespace Log {
  export const Level = z
    .enum(["DEBUG", "INFO", "WARN", "ERROR"])
    .meta({ ref: "LogLevel", description: "Log level" });
  export type Level = z.infer<typeof Level>;

  const levelPriority: Record<Level, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  let level: Level = "INFO";

  function shouldLog(input: Level): boolean {
    return levelPriority[input] >= levelPriority[level];
  }

  export interface Logger {
    debug(message?: any, extra?: Record<string, any>): void;
    info(message?: any, extra?: Record<string, any>): void;
    error(message?: any, extra?: Record<string, any>): void;
    warn(message?: any, extra?: Record<string, any>): void;
    tag(key: string, value: string): Logger;
    clone(): Logger;
    time(
      message: string,
      extra?: Record<string, any>
    ): {
      stop(): void;
      [Symbol.dispose](): void;
    };
  }

  const loggers = new Map<string, Logger>();

  export const Default = create({ service: "default" });

  export interface Options {
    print: boolean;
    dev?: boolean;
    level?: Level;
    logPath?: string;
  }

  let logpath = "";
  export function file() {
    return logpath;
  }
  let write = (msg: any) => {
    process.stderr.write(msg);
    return msg.length;
  };

  export async function init(options: Options) {
    if (options.level) {
      level = options.level;
    }
    if (!options.logPath) {
      await cleanup(Global.Path.log);
    }
    if (options.print) {
      write = (msg: any) => {
        process.stderr.write(msg);
        return msg.length;
      };
      return;
    }
    logpath = options.logPath
      ? options.logPath
      : path.join(
          Global.Path.log,
          options.dev
            ? "dev.log"
            : `${new Date().toISOString().split(".")[0]!.replace(/:/g, "")}.log`
        );
    const logfile = Bun.file(logpath);
    await fs.truncate(logpath).catch((err) => {
      // File may not exist yet - this is expected on first run
      if (options.dev) {
        process.stderr.write(`DEBUG: Could not truncate ${logpath}: ${err}\n`);
      }
    });
    const writer = logfile.writer();
    write = async (msg: any) => {
      const num = writer.write(msg);
      writer.flush();
      return num;
    };
  }

  async function cleanup(dir: string) {
    const glob = new Bun.Glob("????-??-??T??????.log");
    const files = await Array.fromAsync(
      glob.scan({
        cwd: dir,
        absolute: true,
      })
    );
    if (files.length <= 5) {
      return;
    }

    // Sort by filename (timestamp-based) to ensure oldest files are deleted
    files.sort();
    const filesToDelete = files.slice(0, -10);
    await Promise.all(
      filesToDelete.map((file) =>
        fs.unlink(file).catch((err) => {
          // File may have been deleted by another process - log in debug mode
          if (level === "DEBUG") {
            process.stderr.write(
              `DEBUG: Could not delete log file ${file}: ${err}\n`
            );
          }
        })
      )
    );
  }

  function formatError(error: Error, depth = 0): string {
    const result = error.message;
    return error.cause instanceof Error && depth < 10
      ? `${result} Caused by: ${formatError(error.cause, depth + 1)}`
      : result;
  }

  let last = Date.now();
  export function create(tags?: Record<string, any>) {
    tags = tags || {};

    const service = tags.service;
    if (service && typeof service === "string") {
      const cached = loggers.get(service);
      if (cached) {
        return cached;
      }
    }

    function build(message: any, extra?: Record<string, any>) {
      const prefix = Object.entries({
        ...tags,
        ...extra,
      })
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          const prefix = `${key}=`;
          if (value instanceof Error) {
            return prefix + formatError(value);
          }
          if (typeof value === "object") {
            return prefix + JSON.stringify(value);
          }
          return prefix + value;
        })
        .join(" ");
      const next = new Date();
      const diff = next.getTime() - last;
      last = next.getTime();
      return `${[
        next.toISOString().split(".")[0],
        `+${diff}ms`,
        prefix,
        message,
      ]
        .filter(Boolean)
        .join(" ")}\n`;
    }
    const result: Logger = {
      debug(message?: any, extra?: Record<string, any>) {
        if (shouldLog("DEBUG")) {
          write(`DEBUG ${build(message, extra)}`);
        }
      },
      info(message?: any, extra?: Record<string, any>) {
        if (shouldLog("INFO")) {
          write(`INFO  ${build(message, extra)}`);
        }
      },
      error(message?: any, extra?: Record<string, any>) {
        if (shouldLog("ERROR")) {
          write(`ERROR ${build(message, extra)}`);
        }
      },
      warn(message?: any, extra?: Record<string, any>) {
        if (shouldLog("WARN")) {
          write(`WARN  ${build(message, extra)}`);
        }
      },
      tag(key: string, value: string) {
        if (tags) {
          tags[key] = value;
        }
        return result;
      },
      clone() {
        const { service: _, ...rest } = tags || {};
        return Log.create(rest);
      },
      time(message: string, extra?: Record<string, any>) {
        const now = Date.now();
        result.info(message, { status: "started", ...extra });
        function stop() {
          result.info(message, {
            status: "completed",
            duration: Date.now() - now,
            ...extra,
          });
        }
        return {
          stop,
          [Symbol.dispose]() {
            stop();
          },
        };
      },
    };

    if (service && typeof service === "string") {
      loggers.set(service, result);
    }

    return result;
  }
}
