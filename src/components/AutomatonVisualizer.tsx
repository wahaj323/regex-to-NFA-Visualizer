
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Automaton, TestResult } from "@/types/types";
import { ReactFlow, Controls, MiniMap, Background, Node, Edge, Position, useNodesState, useEdgesState, MarkerType } from "reactflow";
import "reactflow/dist/style.css";

interface AutomatonVisualizerProps {
  automaton: Automaton | null;
  testResult: TestResult | null;
}

// Helper function to create an edge with proper styling and positioning
const makeEdge = (
  transitionId: string, 
  sourceId: string, 
  targetId: string, 
  symbol: string, 
  isSelfLoop: boolean,
  parallelIndex: number, 
  totalParallel: number,
  isHighlighted: boolean = false,
  highlightColor: string = '#4ade80'
): Edge => {
  const isEpsilon = symbol === 'ε';
  
  // Create distinct styling for character vs epsilon transitions
  const edgeStyle = {
    stroke: isHighlighted ? highlightColor : (isEpsilon ? '#9E86ED' : '#F97316'),
    strokeWidth: isEpsilon ? 1.5 : 3,
    strokeDasharray: isEpsilon ? '5,5' : 'none',
    zIndex: isEpsilon ? 0 : 10 + parallelIndex, // Higher z-index for character transitions
  };

  let curvature = 0.3; // Default curvature
  let labelOffset = 0;
  
  if (isSelfLoop) {
    // For self-loops with multiple transitions, vary the angle
    const baseLoopDistance = 80;
    const angleOffset = (parallelIndex * 45) % 360; // Distribute around the circle
    
    return {
      id: transitionId,
      source: sourceId,
      target: targetId,
      label: symbol,
      style: edgeStyle,
      animated: isHighlighted || isEpsilon,
      labelStyle: { 
        fill: isEpsilon ? '#6E59A5' : '#333', 
        fontSize: isEpsilon ? 13 : 16,
        fontWeight: isEpsilon ? 'normal' : 'bold',
        background: '#fff',
        padding: '3px 6px',
      },
      labelBgStyle: { 
        fill: '#F1F0FB',
        fillOpacity: 0.9,
        borderRadius: 8, 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isHighlighted ? highlightColor : (isEpsilon ? '#9E86ED' : '#F97316'),
        width: isEpsilon ? 12 : 18,
        height: isEpsilon ? 12 : 18,
      },
      type: 'default',
      data: {
        loopAngle: angleOffset,
        loopDistance: baseLoopDistance + (parallelIndex * 10),
      }
    };
  } else {
    // For regular transitions between different nodes
    if (totalParallel > 1) {
      // For multiple edges between same nodes, increase curvature and alternate direction
      const baseCurvature = 0.2;
      const curvatureStep = 0.15;
      
      // Alternate curve direction: even indices above, odd indices below
      const alternateDirection = parallelIndex % 2 === 0 ? 1 : -1; 
      
      // Spread multiple transitions more evenly
      const offsetIndex = Math.floor((parallelIndex + 1) / 2);
      
      curvature = baseCurvature + (offsetIndex * curvatureStep);
      curvature *= alternateDirection;
      
      // Position label offset to avoid overlap
      labelOffset = alternateDirection * (15 * (offsetIndex + 1));
    }
    
    return {
      id: transitionId,
      source: sourceId,
      target: targetId,
      label: symbol,
      style: edgeStyle,
      animated: isHighlighted || isEpsilon,
      labelStyle: { 
        fill: isEpsilon ? '#6E59A5' : '#333', 
        fontSize: isEpsilon ? 13 : 16,
        fontWeight: isEpsilon ? 'normal' : 'bold',
        background: '#fff',
        padding: '3px 6px',
        transform: `translateY(${labelOffset}px)`,
      },
      labelBgStyle: { 
        fill: '#F1F0FB',
        fillOpacity: 0.9,
        borderRadius: 8,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isHighlighted ? highlightColor : (isEpsilon ? '#9E86ED' : '#F97316'),
        width: isEpsilon ? 12 : 18,
        height: isEpsilon ? 12 : 18,
      },
      type: 'smoothstep',
      data: { curve: curvature }
    };
  }
};

const AutomatonVisualizer = ({ automaton, testResult }: AutomatonVisualizerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Generate nodes and edges from automaton
  useEffect(() => {
    if (!automaton) return;

    // Create a mapping of old state IDs to new q-format IDs
    const stateIdMap = new Map();
    automaton.states.forEach((state, index) => {
      stateIdMap.set(state.id, `q${index}`);
    });

    // Create nodes with renamed state IDs
    const graphNodes: Node[] = automaton.states.map((state, index) => {
      const newStateId = stateIdMap.get(state.id);
      
      // Calculate node styles based on state type (start, accept)
      const nodeStyle = {
        background: state.isAccept ? '#F2FCE2' : state.isStart ? '#D3E4FD' : '#FFFFFF',
        borderColor: state.isAccept ? '#4ade80' : state.isStart ? '#0EA5E9' : '#6E59A5',
        borderWidth: state.isAccept ? 3 : state.isStart ? 2 : 1,
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
      const yOffset = (index % 3) * 100;
      const y = 200 + yOffset;

      return {
        id: newStateId,
        type: 'default',
        data: { 
          label: newStateId,
          isStart: state.isStart,
          isAccept: state.isAccept,
        },
        position: { x, y },
        style: nodeStyle,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Track parallel edges to handle multiple transitions between the same nodes
    const parallelEdgesMap = new Map();

    // First pass: Identify parallel edges (same source and target)
    automaton.transitions.forEach((transition) => {
      const sourceId = stateIdMap.get(transition.from);
      const targetId = stateIdMap.get(transition.to);
      const edgeKey = `${sourceId}-${targetId}`;
      
      if (!parallelEdgesMap.has(edgeKey)) {
        parallelEdgesMap.set(edgeKey, []);
      }
      
      // Store the transition with the new source/target IDs
      parallelEdgesMap.get(edgeKey).push({
        ...transition,
        from: sourceId,
        to: targetId,
        id: `${sourceId}-${targetId}-${transition.symbol}`
      });
    });

    // Create edges with directional arrows - enhanced to better display character transitions
    const graphEdges: Edge[] = [];
    
    // Second pass: Create edges with proper offsets for parallel edges
    parallelEdgesMap.forEach((transitions, edgeKey) => {
      // Sort transitions to ensure consistent rendering
      // Epsilon transitions first, then character transitions for better z-ordering
      transitions.sort((a, b) => {
        if (a.symbol === 'ε' && b.symbol !== 'ε') return -1; // Epsilon below
        if (a.symbol !== 'ε' && b.symbol === 'ε') return 1;
        return a.symbol.localeCompare(b.symbol);
      });
      
      const transitionCount = transitions.length;
      
      transitions.forEach((transition, index) => {
        // Determine if this is a self-loop
        const isSelfLoop = transition.from === transition.to;
        
        // Check if this transition is part of the highlighted test path
        let isHighlighted = false;
        let highlightColor = '#4ade80'; // default green for accepted
        
        if (testResult && testResult.path.length > 0) {
          // Map old state IDs in the path to new q-format IDs
          const mappedPath = testResult.path.map(oldId => stateIdMap.get(oldId) || oldId);
          
          // Check if this transition is part of the highlighted path
          for (let i = 0; i < mappedPath.length - 1; i++) {
            const pathSource = mappedPath[i];
            const pathTarget = mappedPath[i + 1];
            
            if (transition.from === pathSource && transition.to === pathTarget) {
              isHighlighted = true;
              highlightColor = testResult.accepted ? '#4ade80' : '#f87171';
              break;
            }
          }
        }
        
        // Create the edge using our helper function
        const edge = makeEdge(
          transition.id,
          transition.from,
          transition.to,
          transition.symbol,
          isSelfLoop,
          index,
          transitionCount,
          isHighlighted,
          highlightColor
        );
        
        graphEdges.push(edge);
      });
    });

    // Add a "Start" indicator arrow for the start state
    const startState = automaton.states.find(s => s.isStart);
    if (startState) {
      const startArrowId = 'start-arrow';
      const startNodeId = stateIdMap.get(startState.id);
      const startNode = graphNodes.find(n => n.id === startNodeId);
      
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
        
        // Add start arrow edge
        graphEdges.push({
          id: 'e-start',
          source: startArrowId,
          target: startNodeId,
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
    }

    // Highlight path if test result is provided
    if (testResult && testResult.path.length > 0) {
      // Map old state IDs in the path to new q-format IDs
      const mappedPath = testResult.path.map(oldId => stateIdMap.get(oldId) || oldId);
      
      // Highlight nodes in the path
      graphNodes.forEach((node) => {
        if (mappedPath.includes(node.id)) {
          node.style = {
            ...node.style,
            boxShadow: `0 0 10px ${testResult.accepted ? 'rgba(74, 222, 128, 0.8)' : 'rgba(248, 113, 113, 0.8)'}`,
            borderColor: testResult.accepted ? '#4ade80' : '#f87171',
            borderWidth: 3,
          };
        }
      });
    }

    // Debug output for development
    console.log('State ID Map:', Array.from(stateIdMap.entries()));
    console.log('Generated edges:', graphEdges);

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [automaton, testResult, setNodes, setEdges]);

  return (
    <Card className="w-full min-h-[500px] shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-automaton-primary">
          Automaton Visualization
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[450px]">
        {automaton ? (
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#f8f8f8" gap={16} />
              <Controls />
              <MiniMap 
                nodeColor={(node) => {
                  if (node.data?.isStart) return '#D3E4FD';
                  if (node.data?.isAccept) return '#F2FCE2';
                  return '#ffffff';
                }}
              />
            </ReactFlow>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Enter a regular expression and click "Convert" to visualize the automaton
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutomatonVisualizer;
