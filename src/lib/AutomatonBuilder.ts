import { Automaton, State, Transition, TestResult } from "../types/types";

const EPSILON = 'ε';
const CONCATENATION = '.';
const UNION = '|';
const KLEENE_STAR = '*';

export class AutomatonBuilder {
  private stateCounter = 0;

  public buildNFA(regex: string): Automaton {
    this.stateCounter = 0;
    const processed = this.addExplicitConcatenation(regex);
    const postfix = this.convertToPostfix(processed);
    return this.buildNFAFromPostfix(postfix);
  }

  private addExplicitConcatenation(regex: string): string {
    let result = '';
    for (let i = 0; i < regex.length; i++) {
      const curr = regex[i];
      result += curr;
      if (
        i === regex.length - 1 ||
        curr === '(' ||
        curr === UNION
      ) continue;
      const next = regex[i + 1];
      if (
        next !== UNION &&
        next !== KLEENE_STAR &&
        next !== ')'
      ) {
        if (curr !== '(' && curr !== UNION) result += CONCATENATION;
      }
    }
    return result;
  }

  private convertToPostfix(regex: string): string {
    const output: string[] = [];
    const stack: string[] = [];
    const prec: Record<string, number> = {
      [KLEENE_STAR]: 3,
      [CONCATENATION]: 2,
      [UNION]: 1,
      '(': 0,
    };
    for (const token of regex) {
      if (token === '(') stack.push(token);
      else if (token === ')') {
        while (stack.length && stack[stack.length - 1] !== '(')
          output.push(stack.pop()!);
        stack.pop();
      } else if (token === CONCATENATION || token === UNION || token === KLEENE_STAR) {
        while (
          stack.length &&
          stack[stack.length - 1] !== '(' &&
          prec[stack[stack.length - 1]] >= prec[token]
        ) output.push(stack.pop()!);
        stack.push(token);
      } else output.push(token);
    }
    while (stack.length) output.push(stack.pop()!);
    return output.join('');
  }

  private buildNFAFromPostfix(postfix: string): Automaton {
    const stack: Automaton[] = [];
    for (const token of postfix) {
      if (token === KLEENE_STAR) {
        const a = stack.pop()!;
        stack.push(this.applyKleeneStar(a));
      } else if (token === CONCATENATION) {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(this.concatenate(a, b));
      } else if (token === UNION) {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(this.union(a, b));
      } else {
        stack.push(this.createBasicNFA(token));
      }
    }
    return stack.length ? stack[0] : this.createEmptyNFA();
  }

  private createBasicNFA(symbol: string): Automaton {
    const start = this.createState("start");
    const accept = this.createState("accept");
    const states: State[] = [
      { ...start, isStart: true, isAccept: false },
      { ...accept, isStart: false, isAccept: true },
    ];
    const transitions: Transition[] = [{
      id: `t_${this.getNextId()}`,
      from: start.id,
      to: accept.id,
      symbol,
    }];
    return { states, transitions, startState: start.id, acceptStates: [accept.id] };
  }

  private createEmptyNFA(): Automaton {
    const start = this.createState("start");
    return {
      states: [{ ...start, isStart: true, isAccept: true }],
      transitions: [],
      startState: start.id,
      acceptStates: [start.id],
    };
  }

  private applyKleeneStar(a: Automaton): Automaton {
    const start = this.createState("start");
    const accept = this.createState("accept");
    const states: State[] = [
      { ...start, isStart: true, isAccept: false },
      ...a.states.map(s => ({ ...s, isStart: false, isAccept: false })),
      { ...accept, isStart: false, isAccept: true },
    ];
    const transitions: Transition[] = [
      { id: `t_${this.getNextId()}`, from: start.id, to: a.startState, symbol: EPSILON },
      { id: `t_${this.getNextId()}`, from: start.id, to: accept.id, symbol: EPSILON },
      ...a.transitions,
      ...a.acceptStates.map(s => ({
        id: `t_${this.getNextId()}`, from: s, to: a.startState, symbol: EPSILON
      })),
      ...a.acceptStates.map(s => ({
        id: `t_${this.getNextId()}`, from: s, to: accept.id, symbol: EPSILON
      })),
    ];
    return { states, transitions, startState: start.id, acceptStates: [accept.id] };
  }

  private concatenate(a: Automaton, b: Automaton): Automaton {
    const states: State[] = [
      ...a.states.map(s => ({ ...s, isAccept: false })),
      ...b.states.map(s => ({ ...s, isStart: false })),
    ];
    const transitions: Transition[] = [
      ...a.transitions,
      ...b.transitions,
      ...a.acceptStates.map(s => ({
        id: `t_${this.getNextId()}`, from: s, to: b.startState, symbol: EPSILON
      })),
    ];
    return { states, transitions, startState: a.startState, acceptStates: b.acceptStates };
  }

  private union(a: Automaton, b: Automaton): Automaton {
    const start = this.createState("start");
    const accept = this.createState("accept");
    const states: State[] = [
      { ...start, isStart: true, isAccept: false },
      ...a.states.map(s => ({ ...s, isStart: false, isAccept: false })),
      ...b.states.map(s => ({ ...s, isStart: false, isAccept: false })),
      { ...accept, isStart: false, isAccept: true },
    ];
    const transitions: Transition[] = [
      { id: `t_${this.getNextId()}`, from: start.id, to: a.startState, symbol: EPSILON },
      { id: `t_${this.getNextId()}`, from: start.id, to: b.startState, symbol: EPSILON },
      ...a.transitions,
      ...b.transitions,
      ...a.acceptStates.map(s => ({ id: `t_${this.getNextId()}`, from: s, to: accept.id, symbol: EPSILON })),
      ...b.acceptStates.map(s => ({ id: `t_${this.getNextId()}`, from: s, to: accept.id, symbol: EPSILON })),
    ];
    return { states, transitions, startState: start.id, acceptStates: [accept.id] };
  }

  public testString(automaton: Automaton, input: string): TestResult {
    let currentStates = this.getEpsilonClosure([automaton.startState], automaton);
    const path: string[] = [...currentStates];
    for (const symbol of input) {
      const nextStates = this.getNextStates(currentStates, symbol, automaton);
      if (!nextStates.length) return { accepted: false, path };
      currentStates = nextStates;
      path.push(...nextStates);
    }
    return { accepted: currentStates.some(s => automaton.acceptStates.includes(s)), path };
  }

  private getEpsilonClosure(states: string[], automaton: Automaton): string[] {
    const visited = new Set(states);
    const stack = [...states];
    while (stack.length) {
      const state = stack.pop()!;
      for (const t of automaton.transitions.filter(tr => tr.from === state && tr.symbol === EPSILON)) {
        if (!visited.has(t.to)) {
          visited.add(t.to);
          stack.push(t.to);
        }
      }
    }
    return Array.from(visited);
  }

  private getNextStates(currentStates: string[], symbol: string, automaton: Automaton): string[] {
    const nextStates = new Set<string>();
    for (const state of currentStates) {
      for (const t of automaton.transitions.filter(tr => tr.from === state && tr.symbol === symbol)) {
        nextStates.add(t.to);
      }
    }
    return this.getEpsilonClosure(Array.from(nextStates), automaton);
  }

  private createState(type: string): State {
    const id = `s${this.getNextId()}`;
    return { id, label: `${type.charAt(0).toUpperCase()}${id.substring(1)}`, isStart: false, isAccept: false };
  }

  private getNextId(): number {
    return this.stateCounter++;
  }
}
