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
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

interface AutomatonVisualizerProps {
  automaton: Automaton | null;
  testResult: TestResult | null;
}

// Custom Edge Component with positioned labels
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: data?.curve || 0.25,
  });

  // Calculate label position along the path
  const labelPosition = data?.labelPosition || 0.5;
  const labelX = sourceX + (targetX - sourceX) * labelPosition;
  const labelY = sourceY + (targetY - sourceY) * labelPosition + (data?.labelOffset || 0);

  return (
    <>
      <path
        id={id}
        style={data?.style || {}}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={data?.markerEnd ? `url(#${data.markerEnd.type})` : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 14,
            fontWeight: 'bold',
            background: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            pointerEvents: 'all',
            zIndex: 1000,
            ...data?.labelStyle,
          }}
          className="nodrag nopan"
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const makeEdge = (
  id: string,
  source: string,
  target: string,
  label: string,
  selfLoop: boolean,
  idx: number,
  total: number
): Edge => {
  const isEpsilon = label === "ε";
  const strokeColor = isEpsilon ? "#9E86ED" : "#F97316";
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
    color: isEpsilon ? "#6E59A5" : "#333",
  };
  const markerEnd = { type: MarkerType.ArrowClosed, color: strokeColor, width: 15, height: 15 };

  if (selfLoop) {
    return {
      id,
      source,
      target,
      type: "default",
      style: baseStyle,
      animated: isEpsilon, // Only epsilon transitions are animated
      label,
      labelStyle,
      markerEnd,
      data: { loopAngle: (idx * 90) % 360, loopDistance: 100 + idx * 30 },
    };
  }

  // Calculate label position to avoid overlap
  const labelPosition = idx % 2 === 0 ? 0.3 : 0.7;
  const curve = total > 1 ? 0.4 * (idx % 2 === 0 ? 1 : -1) : 0.25;
  const labelOffset = (idx % 2 === 0 ? -1 : 1) * 15 * Math.ceil((idx + 1) / 2);

  return {
    id,
    source,
    target,
    type: "custom",
    style: baseStyle,
    animated: isEpsilon, // Only epsilon transitions are animated
    data: {
      label,
      labelPosition,
      labelOffset,
      curve,
      style: baseStyle,
      labelStyle,
      markerEnd,
    },
  };
};

const edgeTypes = {
  custom: CustomEdge,
};

// Helper function to calculate optimal layout positions
const calculateOptimalLayout = (states, transitions) => {
  const nodeCount = states.length;
  
  // Enhanced spacing calculations
  const MIN_HORIZONTAL_SPACING = 200;
  const MIN_VERTICAL_SPACING = 150;
  const LAYER_HEIGHT = 120;
  
  // Build adjacency list for better layout
  const adjList = new Map();
  states.forEach(state => adjList.set(state.id, []));
  transitions.forEach(t => {
    if (!adjList.get(t.from)) adjList.set(t.from, []);
    adjList.get(t.from).push(t.to);
  });
  
  // Find start state and create layers
  const startState = states.find(s => s.isStart);
  const visited = new Set();
  const layers = [];
  
  if (startState) {
    const queue = [startState.id];
    let currentLayer = 0;
    layers[currentLayer] = [];
    
    while (queue.length > 0) {
      const currentLevelSize = queue.length;
      
      for (let i = 0; i < currentLevelSize; i++) {
        const currentStateId = queue.shift();
        
        if (!visited.has(currentStateId)) {
          visited.add(currentStateId);
          if (!layers[currentLayer]) layers[currentLayer] = [];
          layers[currentLayer].push(currentStateId);
          
          // Add children to next layer
          const children = adjList.get(currentStateId) || [];
          children.forEach(childId => {
            if (!visited.has(childId)) {
              queue.push(childId);
            }
          });
        }
      }
      
      if (queue.length > 0) {
        currentLayer++;
        layers[currentLayer] = [];
      }
    }
  }
  
  // Place unvisited states (disconnected components)
  states.forEach(state => {
    if (!visited.has(state.id)) {
      if (!layers[layers.length - 1]) layers.push([]);
      layers[layers.length - 1].push(state.id);
    }
  });
  
  // Calculate positions based on layers
  const positions = new Map();
  const totalWidth = Math.max(1200, layers.length * MIN_HORIZONTAL_SPACING);
  
  layers.forEach((layer, layerIndex) => {
    const layerWidth = totalWidth / layers.length;
    const x = 150 + layerIndex * layerWidth;
    
    layer.forEach((stateId, stateIndex) => {
      const nodesInLayer = layer.length;
      const totalLayerHeight = Math.max(300, nodesInLayer * MIN_VERTICAL_SPACING);
      const startY = 100;
      
      let y;
      if (nodesInLayer === 1) {
        y = startY + totalLayerHeight / 2;
      } else {
        y = startY + (stateIndex * totalLayerHeight) / (nodesInLayer - 1);
      }
      
      // Add some randomization to avoid perfect alignment
      y += (Math.random() - 0.5) * 40;
      
      positions.set(stateId, { x, y });
    });
  });
  
  return positions;
};

const AutomatonVisualizer = ({ automaton, testResult }: AutomatonVisualizerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!automaton) return;

    const stateIdMap = new Map(automaton.states.map((s, i) => [s.id, `q${i}`]));
    
    // Calculate optimal positions
    const positions = calculateOptimalLayout(automaton.states, automaton.transitions);

    // Create nodes with static styling (no test result highlighting)
    const graphNodes: Node[] = automaton.states.map((state, i) => {
      const newId = stateIdMap.get(state.id)!;
      const isStart = state.isStart;
      const isAccept = state.isAccept;
      
      // Get position from optimal layout
      const pos = positions.get(state.id) || { x: 200 + i * 200, y: 200 };

      return {
        id: newId,
        type: "default",
        data: { label: newId, isStart, isAccept },
        position: pos,
        style: {
          background: isAccept ? "#F2FCE2" : isStart ? "#D3E4FD" : "#FFFFFF",
          borderColor: isAccept ? "#4ade80" : isStart ? "#0EA5E9" : "#6E59A5",
          borderWidth: isAccept ? 3 : isStart ? 2 : 1,
          boxShadow: isAccept
            ? "0 0 0 2px white, 0 0 0 4px #4ade80"
            : isStart
            ? "0 0 5px rgba(14, 165, 233, 0.5)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
          borderStyle: "solid",
          padding: 10,
          width: 80,
          height: 80,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 16,
          transition: "all 0.2s ease",
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

    // Add edges with static styling (no test result highlighting)
    parallelEdges.forEach(transitions => {
      // Handle epsilon transitions
      transitions
        .filter(t => t.symbol === "ε")
        .forEach((t, i) =>
          graphEdges.push(makeEdge(t.id, t.from, t.to, t.symbol, t.from === t.to, i, transitions.length))
        );

      // Handle regular transitions
      transitions
        .filter(t => t.symbol !== "ε")
        .forEach((t, i) => {
          const isSelfLoop = t.from === t.to;
          graphEdges.push(makeEdge(t.id, t.from, t.to, t.symbol, isSelfLoop, i, transitions.length));
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
          position: { x: startNode.position.x - 120, y: startNode.position.y },
          style: { opacity: 0, width: 1, height: 1 },
          selectable: false,
          draggable: false,
        });
        graphEdges.push({
          id: "e-start",
          source: startId,
          target: startNodeId,
          label: "Start",
          style: { stroke: "#0EA5E9", strokeWidth: 3 },
          labelStyle: { 
            fill: "#0EA5E9", 
            fontSize: 14, 
            fontWeight: "bold",
            background: "#fff",
            padding: "2px 6px",
            borderRadius: "4px"
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#0EA5E9", width: 15, height: 15 },
          type: "smoothstep",
        });
      }
    }

    // Note: Removed all testResult highlighting code to keep states static

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [automaton, setNodes, setEdges]); // Removed testResult from dependencies

  return (
    <Card className="w-full min-h-[600px] shadow-lg border-0 bg-gradient-to-br from-slate-50 to-blue-50">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="text-center text-2xl font-bold tracking-tight">
          NFA Diagram Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[600px] p-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.1, maxZoom: 1.5 }}
          minZoom={0.1}
          maxZoom={2.5}
          attributionPosition="bottom-left"
          defaultEdgeOptions={{ 
            animated: false, 
            style: { strokeWidth: 3 }, 
            markerEnd: { type: MarkerType.ArrowClosed } 
          }}
          panOnScroll={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={true}
        >
          <MiniMap
            nodeStrokeColor={n =>
              n.data.isAccept ? "#4ade80" : n.data.isStart ? "#0ea5e9" : "#6E59A5"
            }
            nodeColor={n => (n.data.isAccept ? "#ecfdf5" : n.data.isStart ? "#d0e7fb" : "#ffffff")}
            nodeBorderRadius={50}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          />
          <Controls 
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          />
          <Background color="#e2e8f0" gap={20} size={1} />
        </ReactFlow>
      </CardContent>
    </Card>
  );
};

export default AutomatonVisualizer;