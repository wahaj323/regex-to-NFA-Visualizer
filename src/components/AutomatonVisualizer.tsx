
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Automaton, TestResult } from "@/types/types";
import { ReactFlow, Controls, MiniMap, Background, Node, Edge, Position, useNodesState, useEdgesState } from "reactflow";
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
        borderColor: '#6E59A5',
        borderWidth: state.isAccept ? 2 : 1,
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

      // Position nodes in a circle layout
      const nodeCount = automaton.states.length;
      const radius = Math.max(200, nodeCount * 30);
      const angle = (2 * Math.PI * parseInt(state.id.replace(/\D/g, ''))) / nodeCount;
      const x = radius * Math.cos(angle) + 300;
      const y = radius * Math.sin(angle) + 200;

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

    // Create edges
    const graphEdges: Edge[] = automaton.transitions.map((transition) => {
      const edgeStyle = {
        stroke: '#6E59A5',
        strokeWidth: 1.5,
      };

      // Create unique ID for each edge
      return {
        id: transition.id,
        source: transition.from,
        target: transition.to,
        label: transition.symbol,
        style: edgeStyle,
        animated: false,
        labelStyle: { fill: '#333', fontSize: 12 },
        labelBgStyle: { fill: '#F1F0FB' },
      };
    });

    // Highlight path if test result is provided
    if (testResult && testResult.path.length > 0) {
      // Highlight nodes in the path
      graphNodes.forEach((node) => {
        if (testResult.path.includes(node.id)) {
          node.style = {
            ...node.style,
            boxShadow: '0 0 10px rgba(110, 89, 165, 0.5)',
            borderColor: testResult.accepted ? '#4ade80' : '#f87171',
            borderWidth: 2,
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
              strokeWidth: 2,
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
              <MiniMap />
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
