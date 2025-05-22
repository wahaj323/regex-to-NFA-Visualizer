
import { Edge, MarkerType } from "reactflow";
import { Automaton, TestResult, Transition } from "@/types/types";
import { getParallelEdgesMap } from "@/utils/automaton-utils";

interface AutomatonEdgesProps {
  automaton: Automaton;
  testResult: TestResult | null;
}

export const createAutomatonEdges = ({ automaton, testResult }: AutomatonEdgesProps): Edge[] => {
  const graphEdges: Edge[] = [];
  
  // Track parallel edges to handle multiple transitions between the same nodes
  const parallelEdgesMap = getParallelEdgesMap(automaton.transitions);

  // Create edges with directional arrows
  parallelEdgesMap.forEach((transitions: Transition[], edgeKey: string) => {
    // Sort transitions by symbol type to ensure consistent rendering
    // Character transitions first, then epsilon
    transitions.sort((a, b) => {
      if (a.symbol === 'ε' && b.symbol !== 'ε') return 1;
      if (a.symbol !== 'ε' && b.symbol === 'ε') return -1;
      return a.symbol.localeCompare(b.symbol);
    });
    
    // Calculate curvature based on number of parallel edges
    const transitionCount = transitions.length;
    
    transitions.forEach((transition, index) => {
      // Style edges based on symbol type (epsilon vs. character)
      const isEpsilon = transition.symbol === 'ε';
      
      // Create distinct styling for character vs epsilon transitions
      const edgeStyle = {
        stroke: isEpsilon ? '#9E86ED' : '#F97316', // Changed character transitions to bright orange for visibility
        strokeWidth: isEpsilon ? 1.5 : 3, // Make character transitions thicker
        strokeDasharray: isEpsilon ? '5,5' : 'none', // Dashed lines for epsilon transitions
      };

      // For self-loops, enhance the visualization
      const isSelfLoop = transition.from === transition.to;
      
      // Calculate offset for parallel edges
      let curvature = 0.3; // Default curvature
      let labelOffset = 0;
      
      if (transitionCount > 1 && !isSelfLoop) {
        // For multiple edges between same nodes, increase curvature and alternate direction
        // Distribute curvature evenly among parallel transitions
        const baseCurvature = 0.2;
        const curvatureStep = 0.2;
        const alternateDirection = index % 2 === 0 ? 1 : -1; // Alternate curve direction
        const offsetIndex = Math.ceil((index + 1) / 2); // 0,1,2,3 -> 1,1,2,2
        
        curvature = baseCurvature + (offsetIndex * curvatureStep);
        curvature *= alternateDirection;
        
        // Position label offset based on curve direction
        labelOffset = alternateDirection * (10 * offsetIndex);
      }
      
      // For self-loops with multiple transitions, vary the angle
      if (isSelfLoop && transitionCount > 1) {
        // Calculate different angles for self-loops based on index
        const baseLoopDistance = 80;
        const angleOffset = (index * 45) % 360; // Distribute around the circle
        
        // Create unique ID for each edge
        graphEdges.push({
          id: transition.id,
          source: transition.from,
          target: transition.to,
          label: transition.symbol,
          style: edgeStyle,
          animated: isEpsilon,
          labelStyle: { 
            fill: isEpsilon ? '#6E59A5' : '#333', 
            fontSize: isEpsilon ? 13 : 16, // Larger font for character transitions
            fontWeight: isEpsilon ? 'normal' : 'bold',
            background: '#fff',
            padding: '3px 6px',
          },
          labelBgStyle: { 
            fill: '#F1F0FB',
            fillOpacity: 0.9, // Increased opacity for better visibility
            borderRadius: 8, 
          },
          // Add directional arrowhead marker to all transitions
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isEpsilon ? '#9E86ED' : '#F97316', // Match edge color
            width: isEpsilon ? 12 : 18, // Larger arrowhead for character transitions
            height: isEpsilon ? 12 : 18,
          },
          type: 'default',
          style: {
            ...edgeStyle,
          },
          sourceHandle: null,
          targetHandle: null,
          // Control loop positioning for self-loops
          data: {
            loopAngle: angleOffset,
            loopDistance: baseLoopDistance + (index * 10),
            curve: 0.8 + (index * 0.1)
          }
        });
      } else if (!isSelfLoop) {
        // For regular edges between different nodes
        graphEdges.push({
          id: transition.id,
          source: transition.from,
          target: transition.to,
          label: transition.symbol,
          style: edgeStyle,
          animated: isEpsilon,
          labelStyle: { 
            fill: isEpsilon ? '#6E59A5' : '#333', 
            fontSize: isEpsilon ? 13 : 16,
            fontWeight: isEpsilon ? 'normal' : 'bold',
            background: '#fff',
            padding: '3px 6px',
            transform: `translateY(${labelOffset}px)`, // Offset labels for parallel edges
          },
          labelBgStyle: { 
            fill: '#F1F0FB',
            fillOpacity: 0.9, 
            borderRadius: 8,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isEpsilon ? '#9E86ED' : '#F97316',
            width: isEpsilon ? 12 : 18,
            height: isEpsilon ? 12 : 18,
          },
          type: 'smoothstep',
          data: {
            curve: curvature
          },
        });
      }
    });
  });
  
  // Add a "Start" indicator arrow for the start state
  const startState = automaton.states.find(s => s.isStart);
  if (startState) {
    const startArrowId = 'start-arrow';
    
    // Add start arrow edge
    graphEdges.push({
      id: 'e-start',
      source: startArrowId,
      target: startState.id,
      label: 'Start',
      style: {
        stroke: '#0EA5E9',
        strokeWidth: 2,
      },
      labelStyle: { 
        fill: '#0EA5E9', 
        fontSize: 14,
        fontWeight: 'bold',
      },
      labelBgStyle: { fill: '#F1F0FB', borderRadius: 8 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#0EA5E9',
        width: 15,
        height: 15,
      },
      type: 'smoothstep',
    });
  }
  
  // Highlight edges in the path if test result is provided
  if (testResult && testResult.path.length > 0) {
    for (let i = 0; i < testResult.path.length - 1; i++) {
      const source = testResult.path[i];
      const target = testResult.path[i + 1];
      
      graphEdges.forEach((edge) => {
        if (edge.source === source && edge.target === target) {
          edge.animated = true;
          edge.style = {
            ...edge.style,
            stroke: testResult.accepted ? '#4ade80' : '#f87171',
            strokeWidth: 2.5,
          };
        }
      });
    }
  }
  
  return graphEdges;
};
