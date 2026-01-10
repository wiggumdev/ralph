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
  verbose?: boolean;
}

export class HookExecutor {
  private readonly hooks: Hooks;
  private readonly cwd: string;
  private readonly verbose: boolean;

  constructor(options: HookExecutorOptions) {
    this.hooks = options.hooks;
    this.cwd = options.cwd;
    this.verbose = options.verbose ?? false;
  }

  private async executeHook(hookType: HookType, env: HookEnv): Promise<void> {
    const command = this.hooks[hookType];
    if (!command) {
      return;
    }

    if (this.verbose) {
      console.log(`[HOOK] Executing ${hookType}: ${command}`);
    }

    const proc = Bun.spawn(["sh", "-c", command], {
      cwd: this.cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdout: this.verbose ? "inherit" : "ignore",
      stderr: this.verbose ? "inherit" : "ignore",
    });

    const exitCode = await proc.exited;

    if (this.verbose) {
      if (exitCode !== 0) {
        console.log(`[HOOK] ${hookType} exited with code ${exitCode}`);
      } else {
        console.log(`[HOOK] ${hookType} completed successfully`);
      }
    }
  }

  async executeRalphStart(
    tasksNotPassing: number,
    maxIterations: number
  ): Promise<void> {
    const env: RalphStartEnv = {
      RALPH_CWD: this.cwd,
      RALPH_TASKS_NOT_PASSING: tasksNotPassing.toString(),
      RALPH_MAX_ITERATIONS: maxIterations.toString(),
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
