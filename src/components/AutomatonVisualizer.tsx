
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Automaton, TestResult } from "@/types/types";
import { ReactFlow, Controls, MiniMap, Background, Node, Edge, Position, useNodesState, useEdgesState, MarkerType } from "reactflow";
import "reactflow/dist/style.css";

interface AutomatonVisualizerProps {
  automaton: Automaton | null;
  testResult: TestResult | null;
}

const AutomatonVisualizer = ({ automaton, testResult }: AutomatonVisualizerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Generate nodes and edges from automaton
  useEffect(() => {
    if (!automaton) return;

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

    // Create edges with directional arrows - enhanced to better display character transitions
    const graphEdges: Edge[] = automaton.transitions.map((transition) => {
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
      
      // Create unique ID for each edge
      return {
        id: transition.id,
        source: transition.from,
        target: transition.to,
        label: transition.symbol, // Always show transition symbol
        style: edgeStyle,
        animated: isEpsilon, // animate only epsilon transitions
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
          rx: 8,
          ry: 8,
        },
        // Add directional arrowhead marker to all transitions
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isEpsilon ? '#9E86ED' : '#F97316', // Match edge color
          width: isEpsilon ? 12 : 18, // Larger arrowhead for character transitions
          height: isEpsilon ? 12 : 18,
        },
        // Use different edge types for better visualization
        type: 'default', // Default for all edges, then customize below
        // Configure self-loops with appropriate styling
        ...(isSelfLoop && {
          type: 'default',
          animated: false, // Don't animate self-loops
          style: {
            ...edgeStyle,
            curvature: 0.8, // Increase curvature for self-loops for better visibility
          },
          // Add specific settings for self-loops
          sourceHandle: null,
          targetHandle: null,
        }),
        // Configure regular transitions
        ...(!isSelfLoop && {
          type: 'smoothstep',
          curvature: 0.3,
        }),
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
          labelBgStyle: { fill: '#F1F0FB' },
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

      // Highlight edges in the path
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

    // Debug transitions
    console.log('Transitions:', automaton.transitions);

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
