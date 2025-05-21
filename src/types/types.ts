
export interface State {
  id: string;
  label: string;
  isStart: boolean;
  isAccept: boolean;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  symbol: string;
}

export interface Automaton {
  states: State[];
  transitions: Transition[];
  startState: string;
  acceptStates: string[];
}

export type AutomatonType = 'NFA' | 'DFA';

export interface TestResult {
  accepted: boolean;
  path: string[];
}
