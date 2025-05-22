
/**
 * Helper utilities for automaton visualization
 */

/**
 * Identify if there are multiple transitions between the same source and target nodes
 */
export const getParallelEdgesMap = (transitions: any[]) => {
  const parallelEdgesMap = new Map();
  
  transitions.forEach((transition) => {
    const edgeKey = `${transition.from}-${transition.to}`;
    if (!parallelEdgesMap.has(edgeKey)) {
      parallelEdgesMap.set(edgeKey, []);
    }
    parallelEdgesMap.get(edgeKey).push(transition);
  });

  return parallelEdgesMap;
};
