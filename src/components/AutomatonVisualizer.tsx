import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Automaton, TestResult } from "@/types/types";
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Edge,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";

interface AutomatonVisualizerProps {
  automaton: Automaton | null;
  testResult: TestResult | null;
}

const makeEdge = (
  id: string,
  source: string,
  target: string,
  label: string,
  selfLoop: boolean,
  idx: number,
  total: number,
  highlighted = false,
  highlightColor = "#4ade80"
): Edge => {
  const isEpsilon = label === "ε";
  const strokeColor = highlighted ? highlightColor : isEpsilon ? "#9E86ED" : "#F97316";
  const baseStyle = {
    stroke: strokeColor,
    strokeWidth: isEpsilon ? 1.5 : 3,
    strokeDasharray: isEpsilon ? "5,5" : "none",
  };
  const labelStyle = {
    fill: isEpsilon ? "#6E59A5" : "#333",
    fontSize: 14,
    fontWeight: "bold",
    background: "#fff",
    padding: "2px 5px",
  };
  const labelBgStyle = { fill: "#F1F0FB", fillOpacity: 0.9, borderRadius: 8 };
  const markerEnd = { type: MarkerType.ArrowClosed, color: strokeColor, width: 15, height: 15 };

  if (selfLoop) {
    return {
      id,
      source,
      target,
      label,
      style: baseStyle,
      animated: highlighted,
      labelStyle,
      labelBgStyle,
      markerEnd,
      type: "default",
      data: { loopAngle: (idx * 90) % 360, loopDistance: 100 + idx * 30 },
    };
  }

  const labelPos = 0.3 + 0.4 * (idx % 2);
  const curve = 0.5 * (idx % 2 === 0 ? 1 : -1);
  const labelOffset = (idx % 2 === 0 ? 1 : -1) * 20 * Math.ceil(idx / 2);

  return {
    id,
    source,
    target,
    label,
    style: baseStyle,
    animated: highlighted || isEpsilon,
    labelStyle: { ...labelStyle, transform: `translateY(${labelOffset}px)` },
    labelBgStyle,
    markerEnd,
    type: "smoothstep",
    data: { curve, labelPosition: labelPos },
  };
};

const AutomatonVisualizer = ({ automaton, testResult }: AutomatonVisualizerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!automaton) return;

    const stateIdMap = new Map(automaton.states.map((s, i) => [s.id, `q${i}`]));
    const nodeCount = automaton.states.length;
    const width = Math.max(800, nodeCount * 150);

    // Calculate node positions and styles
    const graphNodes: Node[] = automaton.states.map((state, i) => {
      const newId = stateIdMap.get(state.id)!;
      const isStart = state.isStart;
      const isAccept = state.isAccept;

      let depth = 0;
      if (isStart) depth = 0;
      else if (isAccept) depth = nodeCount - 1;
      else {
        const incoming = automaton.transitions.filter(t => t.to === state.id);
        if (incoming.length > 0) {
          const maxSourceIdx = Math.max(
            ...incoming.map(t => automaton.states.findIndex(s => s.id === t.from)).filter(idx => idx >= 0)
          );
          depth = Math.min(maxSourceIdx + 1, nodeCount - 2);
        } else {
          const idNum = parseInt(state.id.replace(/\D/g, "")) || 0;
          depth = Math.min(Math.max(1, idNum), nodeCount - 2);
        }
      }

      const horizontalSpace = width / (nodeCount + 1);
      const x = 100 + depth * horizontalSpace;
      const y = 200 + (i % 3) * 100;

      return {
        id: newId,
        type: "default",
        data: { label: newId, isStart, isAccept },
        position: { x, y },
        style: {
          background: isAccept ? "#F2FCE2" : isStart ? "#D3E4FD" : "#FFFFFF",
          borderColor: isAccept ? "#4ade80" : isStart ? "#0EA5E9" : "#6E59A5",
          borderWidth: isAccept ? 3 : isStart ? 2 : 1,
          boxShadow: isAccept
            ? "0 0 0 2px white, 0 0 0 4px #4ade80"
            : isStart
            ? "0 0 5px rgba(14, 165, 233, 0.5)"
            : "none",
          borderStyle: "solid",
          padding: 10,
          width: 70,
          height: 70,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Group edges by source-target pair for parallel edges
    const parallelEdges = new Map<
      string,
      (Automaton["transitions"][0] & { from: string; to: string; id: string })[]
    >();

    automaton.transitions.forEach(t => {
      const from = stateIdMap.get(t.from)!;
      const to = stateIdMap.get(t.to)!;
      const key = `${from}-${to}`;
      if (!parallelEdges.has(key)) parallelEdges.set(key, []);
      parallelEdges.get(key)!.push({ ...t, from, to, id: `${from}-${to}-${t.symbol}` });
    });

    const graphEdges: Edge[] = [];

    // Add edges: epsilon first, then others
    parallelEdges.forEach(transitions => {
      transitions
        .filter(t => t.symbol === "ε")
        .forEach((t, i) =>
          graphEdges.push(makeEdge(t.id, t.from, t.to, t.symbol, t.from === t.to, i, transitions.length, false, "#4ade80"))
        );

      transitions
        .filter(t => t.symbol !== "ε")
        .forEach((t, i) => {
          const isSelfLoop = t.from === t.to;
          let highlighted = false,
            color = "#4ade80";

          if (testResult?.path.length) {
            const mappedPath = testResult.path.map(id => stateIdMap.get(id) || id);
            for (let j = 0; j < mappedPath.length - 1; j++) {
              if (t.from === mappedPath[j] && t.to === mappedPath[j + 1]) {
                highlighted = true;
                color = testResult.accepted ? "#4ade80" : "#f87171";
                break;
              }
            }
          }

          graphEdges.push(makeEdge(t.id, t.from, t.to, t.symbol, isSelfLoop, i, transitions.length, highlighted, color));
        });
    });

    // Add start arrow node and edge
    const startState = automaton.states.find(s => s.isStart);
    if (startState) {
      const startId = "start-arrow";
      const startNodeId = stateIdMap.get(startState.id)!;
      const startNode = graphNodes.find(n => n.id === startNodeId);

      if (startNode) {
        graphNodes.push({
          id: startId,
          type: "default",
          data: { label: "" },
          position: { x: startNode.position.x - 100, y: startNode.position.y },
          style: { opacity: 0, width: 1, height: 1 },
          selectable: false,
          draggable: false,
        });
        graphEdges.push({
          id: "e-start",
          source: startId,
          target: startNodeId,
          label: "Start",
          style: { stroke: "#0EA5E9", strokeWidth: 2 },
          labelStyle: { fill: "#0EA5E9", fontSize: 14, fontWeight: "bold" },
          labelBgStyle: { fill: "#F1F0FB", borderRadius: 8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#0EA5E9", width: 15, height: 15 },
          type: "smoothstep",
        });
      }
    }

    // Highlight nodes on the testResult path
    if (testResult?.path.length) {
      const mappedPath = testResult.path.map(id => stateIdMap.get(id) || id);
      graphNodes.forEach(node => {
        if (mappedPath.includes(node.id)) {
          node.style = {
            ...node.style,
            boxShadow: `0 0 10px ${testResult.accepted ? "rgba(74, 222, 128, 0.8)" : "rgba(248, 113, 113, 0.8)"}`,
            borderColor: testResult.accepted ? "#4ade80" : "#f87171",
            borderWidth: 3,
          };
        }
      });
    }

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [automaton, testResult, setNodes, setEdges]);

  return (
    <Card className="w-full min-h-[500px] shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-xl font-bold tracking-tight text-primary-foreground">
          Automaton Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[500px] p-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          attributionPosition="bottom-left"
          defaultEdgeOptions={{ animated: true, style: { strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed } }}
        >
          <MiniMap
            nodeStrokeColor={n =>
              n.data.isAccept ? "#4ade80" : n.data.isStart ? "#0ea5e9" : "#6E59A5"
            }
            nodeColor={n => (n.data.isAccept ? "#ecfdf5" : n.data.isStart ? "#d0e7fb" : "#ffffff")}
            nodeBorderRadius={10}
          />
          <Controls />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </CardContent>
    </Card>
  );
};

export default AutomatonVisualizer;
