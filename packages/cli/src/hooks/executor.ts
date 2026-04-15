import type { Hooks } from "#config/schema";

export type HookType =
  | "ralph_start"
  | "ralph_loop_start"
  | "ralph_loop_end"
  | "ralph_complete"
  | "ralph_max_iterations";

export interface RalphStartEnv {
  RALPH_CWD: string;
  RALPH_TASKS_NOT_PASSING: string;
  RALPH_MAX_ITERATIONS: string;
}

export interface RalphLoopStartEnv {
  RALPH_CWD: string;
  RALPH_LOOP_ITERATION: string;
}

export interface RalphLoopEndEnv {
  RALPH_CWD: string;
  RALPH_LOOP_ITERATION: string;
}

export interface RalphCompleteEnv {
  RALPH_CWD: string;
  RALPH_TOTAL_ITERATIONS: string;
}

export interface RalphMaxIterationsEnv {
  RALPH_CWD: string;
  RALPH_TOTAL_ITERATIONS: string;
}

export type HookEnv =
  | RalphStartEnv
  | RalphLoopStartEnv
  | RalphLoopEndEnv
  | RalphCompleteEnv
  | RalphMaxIterationsEnv;

export interface HookExecutorOptions {
  hooks: Hooks;
  cwd: string;
  debug?: boolean;
  timeout?: number;
  logger?: {
    info(message: string, extra?: Record<string, any>): void;
    warn(message: string, extra?: Record<string, any>): void;
    error(message: string, extra?: Record<string, any>): void;
    debug(message: string, extra?: Record<string, any>): void;
  };
}

export class HookExecutor {
  private readonly hooks: Hooks;
  private readonly cwd: string;
  private readonly debug: boolean;
  private readonly timeout?: number;
  private readonly logger?: {
    info(message: string, extra?: Record<string, any>): void;
    warn(message: string, extra?: Record<string, any>): void;
    error(message: string, extra?: Record<string, any>): void;
    debug(message: string, extra?: Record<string, any>): void;
  };

  constructor(options: HookExecutorOptions) {
    this.hooks = options.hooks;
    this.cwd = options.cwd;
    this.debug = options.debug ?? false;
    this.timeout = options.timeout;
    this.logger = options.logger;
  }

  private async executeHook(hookType: HookType, env: HookEnv): Promise<void> {
    const command = this.hooks[hookType];
    if (!command) {
      return;
    }

    this.logger?.debug(`Executing hook ${hookType}`, { command });

    const proc = Bun.spawn(["sh", "-c", command], {
      cwd: this.cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdout: "ignore",
      stderr: "ignore",
    });

    let exitCode: number;
    let timedOut = false;

    if (this.timeout) {
      // Race between process completion and timeout
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          proc.kill();
          resolve();
        }, this.timeout);
      });

      await Promise.race([proc.exited, timeoutPromise]);
      exitCode = proc.exitCode ?? -1;
    } else {
      exitCode = await proc.exited;
    }

    // Log results to logger
    if (timedOut) {
      const message = `Hook ${hookType} timed out after ${this.timeout}ms`;
      this.logger?.warn(message, { hookType, timeout: this.timeout });
    } else if (exitCode !== 0) {
      const message = `Hook ${hookType} failed with exit code ${exitCode}`;
      this.logger?.error(message, { hookType, exitCode, command });
    } else {
      this.logger?.info(`Hook ${hookType} completed successfully`, {
        hookType,
        exitCode,
      });
    }
  }

  async executeRalphStart(
    tasksNotPassing: number,
    maxIterations: number | undefined
  ): Promise<void> {
    const env: RalphStartEnv = {
      RALPH_CWD: this.cwd,
      RALPH_TASKS_NOT_PASSING: tasksNotPassing.toString(),
      RALPH_MAX_ITERATIONS: maxIterations?.toString() ?? "unlimited",
    };
    await this.executeHook("ralph_start", env);
  }

  async executeRalphLoopStart(iteration: number): Promise<void> {
    const env: RalphLoopStartEnv = {
      RALPH_CWD: this.cwd,
      RALPH_LOOP_ITERATION: iteration.toString(),
    };
    await this.executeHook("ralph_loop_start", env);
  }

  async executeRalphLoopEnd(iteration: number): Promise<void> {
    const env: RalphLoopEndEnv = {
      RALPH_CWD: this.cwd,
      RALPH_LOOP_ITERATION: iteration.toString(),
    };
    await this.executeHook("ralph_loop_end", env);
  }

  async executeRalphComplete(totalIterations: number): Promise<void> {
    const env: RalphCompleteEnv = {
      RALPH_CWD: this.cwd,
      RALPH_TOTAL_ITERATIONS: totalIterations.toString(),
    };
    await this.executeHook("ralph_complete", env);
  }

  async executeRalphMaxIterations(totalIterations: number): Promise<void> {
    const env: RalphMaxIterationsEnv = {
      RALPH_CWD: this.cwd,
      RALPH_TOTAL_ITERATIONS: totalIterations.toString(),
    };
    await this.executeHook("ralph_max_iterations", env);
  }
}

export function createHookExecutor(options: HookExecutorOptions): HookExecutor {
  return new HookExecutor(options);
}
