
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

      // Position nodes in a horizontal layout favoring left to right for better readability
      const nodeCount = automaton.states.length;
      const width = Math.max(800, nodeCount * 120);
      const horizontalSpace = width / (nodeCount + 1);
      
      // Get an approximation of how "deep" this node is in the automaton
      // Start state is leftmost (depth 0)
      // Accept states are rightmost (maximum depth)
      let depth = 0;
      if (state.isStart) {
        depth = 0;
      } else if (state.isAccept) {
        depth = nodeCount - 1;
      } else {
        // Try to estimate depth based on node ID number
        const idNum = parseInt(state.id.replace(/\D/g, '')) || 0;
        depth = Math.min(Math.max(1, idNum), nodeCount - 2);
      }
      
      const x = 100 + (depth * horizontalSpace);
      // Offset y position slightly based on node ID to avoid direct overlaps
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

    // Create edges with directional arrows
    const graphEdges: Edge[] = automaton.transitions.map((transition) => {
      // Style edges based on symbol type (epsilon vs. character)
      const isEpsilon = transition.symbol === 'ε';
      
      const edgeStyle = {
        stroke: isEpsilon ? '#9E86ED' : '#6E59A5',
        strokeWidth: 1.5,
      };

      // Create unique ID for each edge
      return {
        id: transition.id,
        source: transition.from,
        target: transition.to,
        label: transition.symbol,
        style: edgeStyle,
        animated: isEpsilon, // animate epsilon transitions
        labelStyle: { 
          fill: '#333', 
          fontSize: 12,
          fontWeight: isEpsilon ? 'normal' : 'bold',
        },
        labelBgStyle: { fill: '#F1F0FB' },
        // Add directional arrowhead marker to all transitions
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isEpsilon ? '#9E86ED' : '#6E59A5',
          width: 15,
          height: 15,
        },
        // Use smoother edges for better visualization
        type: 'smoothstep',
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
            fontSize: 12,
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
