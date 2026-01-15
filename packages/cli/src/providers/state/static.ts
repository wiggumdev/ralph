import type { AppState, StateProvider } from "#providers/state";

/** Static snapshot provider - renders fixed state */

export class StaticStateProvider implements StateProvider {
  private readonly state: AppState;

  constructor(state: AppState) {
    this.state = state;
  }

  getInitialState(): AppState {
    return this.state;
  }

  subscribe(): () => void {
    return () => {};
  }

  start(): void {}
  stop(): void {}
}
