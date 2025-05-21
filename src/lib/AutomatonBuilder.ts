import { Automaton, State, Transition, TestResult } from "../types/types";

// Special characters and symbols
const EPSILON = 'ε';
const CONCATENATION = '.';
const UNION = '|';
const KLEENE_STAR = '*';

export class AutomatonBuilder {
  private stateCounter = 0;

  /**
   * Convert a regular expression to a Non-deterministic Finite Automaton (NFA)
   * using Thompson's Construction algorithm
   */
  public buildNFA(regex: string): Automaton {
    // Reset state counter for each new automaton
    this.stateCounter = 0;
    
    // Add concatenation operators explicitly
    const processedRegex = this.addExplicitConcatenation(regex);
    
    // Convert to postfix notation for easier processing
    const postfix = this.convertToPostfix(processedRegex);
    
    // Build NFA using Thompson's construction
    return this.buildNFAFromPostfix(postfix);
  }

  /**
   * Add explicit concatenation operators to the regex
   */
  private addExplicitConcatenation(regex: string): string {
    let result = '';
    
    for (let i = 0; i < regex.length; i++) {
      const current = regex[i];
      result += current;
      
      // Skip if this is the last character or if current character is a special operator
      if (i === regex.length - 1 || current === '(' || current === UNION) continue;
      
      // Check if next character requires a concatenation operator
      const next = regex[i + 1];
      if (next !== UNION && next !== KLEENE_STAR && next !== ')') {
        // Don't add concatenation after opening parenthesis or union
        if (current !== '(' && current !== UNION) {
          result += CONCATENATION;
        }
      }
    }
    
    return result;
  }

  /**
   * Convert infix regex to postfix notation using Shunting-yard algorithm
   */
  private convertToPostfix(regex: string): string {
    const output: string[] = [];
    const operatorStack: string[] = [];
    
    // Operator precedence
    const precedence: Record<string, number> = {
      [KLEENE_STAR]: 3,
      [CONCATENATION]: 2,
      [UNION]: 1,
      '(': 0,
    };
    
    for (let i = 0; i < regex.length; i++) {
      const token = regex[i];
      
      switch (token) {
        case '(':
          operatorStack.push(token);
          break;
          
        case ')':
          while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
            output.push(operatorStack.pop()!);
          }
          operatorStack.pop(); // Discard the opening parenthesis
          break;
          
        case CONCATENATION:
        case UNION:
        case KLEENE_STAR:
          while (
            operatorStack.length > 0 &&
            operatorStack[operatorStack.length - 1] !== '(' &&
            precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
          ) {
            output.push(operatorStack.pop()!);
          }
          operatorStack.push(token);
          break;
          
        default:
          output.push(token); // Character is part of the alphabet
      }
    }
    
    // Pop remaining operators from the stack
    while (operatorStack.length > 0) {
      output.push(operatorStack.pop()!);
    }
    
    return output.join('');
  }

  /**
   * Build an NFA from a postfix regex expression using Thompson's construction
   */
  private buildNFAFromPostfix(postfix: string): Automaton {
    const automatonStack: Automaton[] = [];
    
    for (let i = 0; i < postfix.length; i++) {
      const token = postfix[i];
      
      switch (token) {
        case KLEENE_STAR:
          if (automatonStack.length > 0) {
            const operand = automatonStack.pop()!;
            automatonStack.push(this.applyKleeneStar(operand));
          }
          break;
          
        case CONCATENATION:
          if (automatonStack.length >= 2) {
            const right = automatonStack.pop()!;
            const left = automatonStack.pop()!;
            automatonStack.push(this.concatenate(left, right));
          }
          break;
          
        case UNION:
          if (automatonStack.length >= 2) {
            const right = automatonStack.pop()!;
            const left = automatonStack.pop()!;
            automatonStack.push(this.union(left, right));
          }
          break;
          
        default:
          // Single character - create basic NFA
          automatonStack.push(this.createBasicNFA(token));
      }
    }
    
    // Return the final automaton
    return automatonStack.length > 0 ? automatonStack[0] : this.createEmptyNFA();
  }

  /**
   * Create a basic NFA for a single character
   */
  private createBasicNFA(symbol: string): Automaton {
    const startState = this.createState("start");
    const acceptState = this.createState("accept");
    
    const states: State[] = [
      { ...startState, isStart: true, isAccept: false },
      { ...acceptState, isStart: false, isAccept: true }
    ];
    
    const transitions: Transition[] = [{
      id: `t_${this.getNextId()}`,
      from: startState.id,
      to: acceptState.id,
      symbol
    }];
    
    return {
      states,
      transitions,
      startState: startState.id,
      acceptStates: [acceptState.id]
    };
  }

  /**
   * Create an empty NFA with start and accept states
   */
  private createEmptyNFA(): Automaton {
    const startState = this.createState("start");
    
    return {
      states: [{ ...startState, isStart: true, isAccept: true }],
      transitions: [],
      startState: startState.id,
      acceptStates: [startState.id]
    };
  }

  /**
   * Apply Kleene star operation to an automaton
   */
  private applyKleeneStar(automaton: Automaton): Automaton {
    const newStartState = this.createState("start");
    const newAcceptState = this.createState("accept");
    
    // Create new states and transitions
    const states: State[] = [
      { ...newStartState, isStart: true, isAccept: false },
      ...automaton.states.map(s => ({ ...s, isStart: false, isAccept: false })),
      { ...newAcceptState, isStart: false, isAccept: true }
    ];
    
    // Build list of transitions
    const transitions: Transition[] = [
      // Epsilon transition from new start to original start
      {
        id: `t_${this.getNextId()}`,
        from: newStartState.id,
        to: automaton.startState,
        symbol: EPSILON
      },
      // Epsilon transition from new start to new accept (to handle empty string case)
      {
        id: `t_${this.getNextId()}`,
        from: newStartState.id,
        to: newAcceptState.id,
        symbol: EPSILON
      },
      // Keep all original transitions
      ...automaton.transitions,
      // Add epsilon transitions from original accept states to original start state
      ...automaton.acceptStates.map(acceptState => ({
        id: `t_${this.getNextId()}`,
        from: acceptState,
        to: automaton.startState,
        symbol: EPSILON
      })),
      // Add epsilon transitions from original accept states to new accept state
      ...automaton.acceptStates.map(acceptState => ({
        id: `t_${this.getNextId()}`,
        from: acceptState,
        to: newAcceptState.id,
        symbol: EPSILON
      }))
    ];
    
    return {
      states,
      transitions,
      startState: newStartState.id,
      acceptStates: [newAcceptState.id]
    };
  }

  /**
   * Concatenate two automata
   */
  private concatenate(left: Automaton, right: Automaton): Automaton {
    // Merge states
    const states: State[] = [
      ...left.states.map(s => ({ ...s, isAccept: false })),
      ...right.states.map(s => ({ ...s, isStart: false }))
    ];
    
    // Build list of transitions
    const transitions: Transition[] = [
      ...left.transitions,
      ...right.transitions,
      // Add epsilon transitions from left's accept states to right's start state
      ...left.acceptStates.map(acceptState => ({
        id: `t_${this.getNextId()}`,
        from: acceptState,
        to: right.startState,
        symbol: EPSILON
      }))
    ];
    
    return {
      states,
      transitions,
      startState: left.startState,
      acceptStates: right.acceptStates
    };
  }

  /**
   * Union of two automata
   */
  private union(left: Automaton, right: Automaton): Automaton {
    const newStartState = this.createState("start");
    const newAcceptState = this.createState("accept");
    
    // Create new states
    const states: State[] = [
      { ...newStartState, isStart: true, isAccept: false },
      ...left.states.map(s => ({ ...s, isStart: false, isAccept: false })),
      ...right.states.map(s => ({ ...s, isStart: false, isAccept: false })),
      { ...newAcceptState, isStart: false, isAccept: true }
    ];
    
    // Build list of transitions
    const transitions: Transition[] = [
      // Epsilon transition from new start to left's start
      {
        id: `t_${this.getNextId()}`,
        from: newStartState.id,
        to: left.startState,
        symbol: EPSILON
      },
      // Epsilon transition from new start to right's start
      {
        id: `t_${this.getNextId()}`,
        from: newStartState.id,
        to: right.startState,
        symbol: EPSILON
      },
      // Keep all original transitions
      ...left.transitions,
      ...right.transitions,
      // Add epsilon transitions from left's accept states to new accept state
      ...left.acceptStates.map(acceptState => ({
        id: `t_${this.getNextId()}`,
        from: acceptState,
        to: newAcceptState.id,
        symbol: EPSILON
      })),
      // Add epsilon transitions from right's accept states to new accept state
      ...right.acceptStates.map(acceptState => ({
        id: `t_${this.getNextId()}`,
        from: acceptState,
        to: newAcceptState.id,
        symbol: EPSILON
      }))
    ];
    
    return {
      states,
      transitions,
      startState: newStartState.id,
      acceptStates: [newAcceptState.id]
    };
  }

  /**
   * Test if a string is accepted by the automaton
   */
  public testString(automaton: Automaton, input: string): TestResult {
    // Start with the epsilon closure of the start state
    let currentStates = this.getEpsilonClosure([automaton.startState], automaton);
    
    // Path for visualization
    const path: string[] = [...currentStates];
    
    // Process each input symbol
    for (let i = 0; i < input.length; i++) {
      const symbol = input[i];
      
      // Get next states for the given symbol
      const nextStates = this.getNextStates(currentStates, symbol, automaton);
      
      // If no next states, string is rejected
      if (nextStates.length === 0) {
        return { accepted: false, path };
      }
      
      // Update current states and path
      currentStates = nextStates;
      path.push(...nextStates);
    }
    
    // Check if any of the current states is an accept state
    const accepted = currentStates.some(state => automaton.acceptStates.includes(state));
    
    return { accepted, path };
  }

  /**
   * Get epsilon closure for a set of states
   */
  private getEpsilonClosure(states: string[], automaton: Automaton): string[] {
    const visited: Set<string> = new Set(states);
    const stack = [...states];
    
    while (stack.length > 0) {
      const state = stack.pop()!;
      
      // Find all epsilon transitions from the current state
      const epsilonTransitions = automaton.transitions.filter(
        t => t.from === state && t.symbol === EPSILON
      );
      
      for (const transition of epsilonTransitions) {
        if (!visited.has(transition.to)) {
          visited.add(transition.to);
          stack.push(transition.to);
        }
      }
    }
    
    return Array.from(visited);
  }

  /**
   * Get next states given a set of current states and an input symbol
   */
  private getNextStates(currentStates: string[], symbol: string, automaton: Automaton): string[] {
    const nextStates: Set<string> = new Set();
    
    // Find all transitions from current states with the given symbol
    for (const state of currentStates) {
      const transitions = automaton.transitions.filter(
        t => t.from === state && t.symbol === symbol
      );
      
      for (const transition of transitions) {
        nextStates.add(transition.to);
      }
    }
    
    // Get epsilon closure of the next states
    return this.getEpsilonClosure(Array.from(nextStates), automaton);
  }

  /**
   * Helper to create a new state
   */
  private createState(type: string): State {
    const id = `s${this.getNextId()}`;
    return {
      id,
      label: `${type.charAt(0).toUpperCase()}${id.substring(1)}`,
      isStart: false,
      isAccept: false
    };
  }

  /**
   * Helper to get next ID
   */
  private getNextId(): number {
    return ++this.stateCounter;
  }
}
