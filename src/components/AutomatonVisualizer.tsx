
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Automaton, TestResult } from "@/types/types";
import { ReactFlow, Controls, MiniMap, Background, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { createAutomatonNodes } from "./automaton/AutomatonNodes";
import { createAutomatonEdges } from "./automaton/AutomatonEdges";

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

    // Generate nodes and edges
    const graphNodes = createAutomatonNodes({ automaton, testResult });
    const graphEdges = createAutomatonEdges({ automaton, testResult });

    // Debug transitions and edge creation
    console.log('Transitions:', automaton.transitions);
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
