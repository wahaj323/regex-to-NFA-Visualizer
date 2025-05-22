
import { Node, Position } from "reactflow";
import { Automaton, TestResult } from "@/types/types";

interface AutomatonNodesProps {
  automaton: Automaton;
  testResult: TestResult | null;
}

export const createAutomatonNodes = ({ automaton, testResult }: AutomatonNodesProps): Node[] => {
  // Create nodes
  const graphNodes: Node[] = automaton.states.map((state) => {
    // Calculate node styles based on state type (start, accept)
    const nodeStyle = {
      background: state.isAccept ? '#F2FCE2' : state.isStart ? '#D3E4FD' : '#FFFFFF',
      borderColor: state.isAccept ? '#4ade80' : state.isStart ? '#0EA5E9' : '#6E59A5',
      borderWidth: state.isAccept ? 3 : state.isStart ? 2 : 1,
      // Double border for accept states
      boxShadow: state.isAccept ? '0 0 0 2px white, 0 0 0 4px #4ade80' : state.isStart ? '0 0 5px rgba(14, 165, 233, 0.5)' : 'none',
      borderStyle: 'solid',
      padding: '10px',
      width: 70,
      height: 70,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
    };

    // Position nodes using a force-directed layout algorithm to minimize edge crossings
    // and favor left-to-right flow for better readability
    const nodeCount = automaton.states.length;
    const width = Math.max(800, nodeCount * 150);
    
    // Calculate node depth based on distance from start state for left-to-right layout
    let depth = 0;
    if (state.isStart) {
      depth = 0;
    } else if (state.isAccept) {
      depth = nodeCount - 1;
    } else {
      // For intermediate states, try to estimate depth based on transitions
      // Find all transitions that lead to this state
      const incomingTransitions = automaton.transitions.filter(t => t.to === state.id);
      
      // Try to place the state to the right of its sources
      if (incomingTransitions.length > 0) {
        const sourceIds = incomingTransitions.map(t => t.from);
        // Find the maximum depth of all source states and add 1
        const maxSourceDepth = Math.max(...sourceIds.map(id => {
          const sourceIndex = automaton.states.findIndex(s => s.id === id);
          return sourceIndex >= 0 ? sourceIndex : 0;
        }));
        depth = Math.min(maxSourceDepth + 1, nodeCount - 2);
      } else {
        // If no incoming transitions, use node ID as a fallback
        const idNum = parseInt(state.id.replace(/\D/g, '')) || 0;
        depth = Math.min(Math.max(1, idNum), nodeCount - 2);
      }
    }
    
    // Calculate x position based on depth
    const horizontalSpace = width / (nodeCount + 1);
    const x = 100 + (depth * horizontalSpace);
    
    // Offset y position to avoid direct overlaps
    // Use modulo of node id to create different levels
    const yOffset = (parseInt(state.id.replace(/\D/g, '')) % 3) * 100;
    const y = 200 + yOffset;

    return {
      id: state.id,
      type: 'default',
      data: { 
        label: state.label,
        isStart: state.isStart,
        isAccept: state.isAccept,
      },
      position: { x, y },
      style: nodeStyle,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
  
  // Add a "Start" indicator arrow for the start state
  const startState = automaton.states.find(s => s.isStart);
  if (startState) {
    const startArrowId = 'start-arrow';
    const startNode = graphNodes.find(n => n.id === startState.id);
    
    if (startNode) {
      // Create virtual start node (invisible) to add the start arrow
      graphNodes.push({
        id: startArrowId,
        type: 'default',
        data: { label: '' },
        position: { 
          x: startNode.position.x - 100, 
          y: startNode.position.y 
        },
        style: { 
          opacity: 0, // invisible node
          width: 1,
          height: 1,
        },
        selectable: false,
        draggable: false,
      });
    }
  }
  
  // Highlight path if test result is provided
  if (testResult && testResult.path.length > 0) {
    // Highlight nodes in the path
    graphNodes.forEach((node) => {
      if (testResult.path.includes(node.id)) {
        node.style = {
          ...node.style,
          boxShadow: `0 0 10px ${testResult.accepted ? 'rgba(74, 222, 128, 0.8)' : 'rgba(248, 113, 113, 0.8)'}`,
          borderColor: testResult.accepted ? '#4ade80' : '#f87171',
          borderWidth: 3,
        };
      }
    });
  }
  
  return graphNodes;
};
