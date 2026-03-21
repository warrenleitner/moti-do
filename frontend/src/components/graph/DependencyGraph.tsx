import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Text, Select, Group, SegmentedControl, Center } from '../../ui';
import { DataBadge } from '../ui';
import { IconBinaryTree2, IconChevronUp, IconChevronDown, IconEye } from '../../ui/icons';
import type { Task } from '../../types';
import TaskNode from './TaskNode';

interface DependencyGraphProps {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}

type Direction = 'all' | 'upstream' | 'downstream' | 'isolated';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  task: TaskNode,
};

// Kinetic Console priority colors for nodes
const priorityColors: Record<string, string> = {
  'Defcon One': '#FF007F',
  'High': '#FFC775',
  'Medium': '#00E5FF',
  'Low': '#3B494C',
  'Trivial': '#32343F',
};

// Build graph nodes and edges from tasks
function buildGraph(
  tasks: Task[],
  selectedTaskId: string | null,
  direction: Direction
): { nodes: Node[]; edges: Edge[] } {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const includedTasks = new Set<string>();

  // If a task is selected, filter based on direction
  if (selectedTaskId && direction !== 'all') {
    const visited = new Set<string>();
    const queue = [selectedTaskId];
    visited.add(selectedTaskId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      includedTasks.add(currentId);
      const currentTask = taskMap.get(currentId);

      if (!currentTask) continue;

      if (direction === 'upstream' || direction === 'isolated') {
        // Find tasks that this task depends on
        currentTask.dependencies?.forEach((depId) => {
          if (!visited.has(depId)) {
            visited.add(depId);
            queue.push(depId);
          }
        });
      }

      if (direction === 'downstream' || direction === 'isolated') {
        // Find tasks that depend on this task
        tasks.forEach((t) => {
          if (t.dependencies?.includes(currentId) && !visited.has(t.id)) {
            visited.add(t.id);
            queue.push(t.id);
          }
        });
      }
    }
  } else {
    // Include all tasks with dependencies
    tasks.forEach((t) => {
      if (t.dependencies?.length || tasks.some((other) => other.dependencies?.includes(t.id))) {
        includedTasks.add(t.id);
      }
    });
  }

  // Position nodes using a simple layered layout
  const layers = new Map<string, number>();

  // Calculate layers (based on dependency depth)
  function calculateLayer(taskId: string, visited: Set<string> = new Set()): number {
    if (layers.has(taskId)) return layers.get(taskId)!;
    if (visited.has(taskId)) return 0; // Cycle detection
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task || !task.dependencies?.length) {
      layers.set(taskId, 0);
      return 0;
    }

    const maxDepLayer = Math.max(
      ...task.dependencies.map((depId) => calculateLayer(depId, visited) + 1)
    );
    layers.set(taskId, maxDepLayer);
    return maxDepLayer;
  }

  includedTasks.forEach((taskId) => calculateLayer(taskId));

  // Group by layer
  const layerGroups = new Map<number, string[]>();
  includedTasks.forEach((taskId) => {
    const layer = layers.get(taskId) || 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(taskId);
  });

  // Position nodes
  const nodeSpacingX = 250;
  const nodeSpacingY = 120;

  layerGroups.forEach((taskIds, layer) => {
    taskIds.forEach((taskId, index) => {
      const task = taskMap.get(taskId);
      if (!task) return;

      const yOffset = (taskIds.length - 1) * nodeSpacingY / 2;
      nodes.push({
        id: task.id,
        type: 'task',
        position: {
          x: layer * nodeSpacingX,
          y: index * nodeSpacingY - yOffset + 200,
        },
        data: {
          task,
          isSelected: task.id === selectedTaskId,
          color: priorityColors[task.priority] || '#00E5FF',
        },
      });
    });
  });

  // Create edges
  includedTasks.forEach((taskId) => {
    const task = taskMap.get(taskId);
    if (!task?.dependencies) return;

    task.dependencies.forEach((depId) => {
      if (includedTasks.has(depId)) {
        const depTask = taskMap.get(depId);
        const isCriticalPath = task.priority === 'Defcon One' || task.priority === 'High';
        const edgeColor = isCriticalPath ? '#00E5FF' : '#3B494C';

        edges.push({
          id: `${depId}-${taskId}`,
          source: depId,
          target: taskId,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: edgeColor,
          },
          style: {
            stroke: edgeColor,
            strokeWidth: isCriticalPath ? 2.5 : 1.5,
          },
          animated: depTask?.is_complete === false,
        });
      }
    });
  });

  return { nodes, edges };
}

// React Flow component - tested via integration tests
/* v8 ignore start */
export default function DependencyGraph({ tasks, onSelectTask }: DependencyGraphProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>('all');

  // Filter to tasks with dependencies
  const tasksWithDeps = useMemo(
    () => tasks.filter((t) => !t.is_habit && (t.dependencies?.length || tasks.some((other) => other.dependencies?.includes(t.id)))),
    [tasks]
  );

  // Build initial graph
  const initialGraph = useMemo(
    () => buildGraph(tasks, selectedTaskId, direction),
    [tasks, selectedTaskId, direction]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);

  // Update graph when selection changes
  useEffect(() => {
    const graph = buildGraph(tasks, selectedTaskId, direction);
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [tasks, selectedTaskId, direction, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const task = tasks.find((t) => t.id === node.id);
      if (task) {
        setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
        onSelectTask?.(task);
      }
    },
    [tasks, onSelectTask]
  );

  const getNodeColor = useCallback((node: Node): string => {
    const data = node.data as { color?: string } | undefined;
    return data?.color || '#00E5FF';
  }, []);

  if (tasksWithDeps.length === 0) {
    return (
      <div
        className="ghost-border"
        style={{
          backgroundColor: '#10131C',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
        }}
      >
        <IconBinaryTree2 size={64} color="#3B494C" style={{ marginBottom: 16 }} />
        <Text
          className="font-data"
          size="sm"
          style={{ color: '#5A5E66', textTransform: 'uppercase', letterSpacing: '0.15em' }}
        >
          NO DEPENDENCIES DETECTED
        </Text>
        <Text size="xs" style={{ color: '#5A5E66', marginTop: 4 }}>
          Add dependencies between tasks to activate the dependency matrix.
        </Text>
      </div>
    );
  }

  // Generate select options (deduplicate by id to handle test data)
  const seenIds = new Set<string>();
  const taskOptions = [
    { value: '', label: 'All Tasks' },
    ...tasksWithDeps.reduce<{ value: string; label: string }[]>((acc, task) => {
      if (!seenIds.has(task.id)) {
        seenIds.add(task.id);
        acc.push({
          value: task.id,
          label: `${task.icon || '▸'} ${task.title}`.trim(),
        });
      }
      return acc;
    }, []),
  ];

  // Generate direction options for SegmentedControl
  const directionData = [
    { value: 'all', label: 'All' },
    {
      value: 'isolated',
      label: (
        <Center style={{ gap: 4 }}>
          <IconEye size={14} />
          <span>Isolated</span>
        </Center>
      ),
    },
    {
      value: 'upstream',
      label: (
        <Center style={{ gap: 4 }}>
          <IconChevronUp size={14} />
          <span>Upstream</span>
        </Center>
      ),
    },
    {
      value: 'downstream',
      label: (
        <Center style={{ gap: 4 }}>
          <IconChevronDown size={14} />
          <span>Downstream</span>
        </Center>
      ),
    },
  ];

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <Group gap="md" mb="md" align="flex-end" wrap="wrap">
        <Select
          label="Focus on Task"
          value={selectedTaskId || ''}
          onChange={(v) => setSelectedTaskId(v || null)}
          data={taskOptions}
          size="sm"
          w={200}
        />

        {selectedTaskId && (
          <SegmentedControl
            value={direction}
            onChange={(value) => setDirection(value as Direction)}
            data={directionData}
            size="sm"
          />
        )}

        {selectedTaskId && (
          <DataBadge
            value={`FOCUS: ${tasks.find((t) => t.id === selectedTaskId)?.title || ''}`}
            color="cyan"
            size="md"
          />
        )}
      </Group>

      {/* Graph */}
      <div
        className="kc-graph ghost-border"
        style={{
          flex: 1,
          backgroundColor: '#0B0E17',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
          minHeight: 400,
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Controls
            style={{
              borderRadius: 0,
              boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
            }}
          />
          <MiniMap
            nodeColor={getNodeColor}
            maskColor="rgba(0, 0, 0, 0.3)"
            style={{
              backgroundColor: '#10131C',
              border: '1px solid rgba(59, 73, 76, 0.15)',
              borderRadius: 0,
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#272A34" />
        </ReactFlow>
      </div>

      {/* Legend */}
      <Group gap="md" mt="md" wrap="wrap">
        {Object.entries(priorityColors).map(([priority, color]) => (
          <Group key={priority} gap={4} align="center">
            <Box
              style={{
                width: 12,
                height: 12,
                backgroundColor: `${color}33`,
                borderLeft: `3px solid ${color}`,
              }}
            />
            <Text
              size="xs"
              className="font-data"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#8A8F98',
              }}
            >
              {priority}
            </Text>
          </Group>
        ))}
      </Group>
    </Box>
  );
}
/* v8 ignore stop */
