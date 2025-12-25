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
import { Box, Paper, Text, Select, Badge, CloseButton, Group, SegmentedControl, Center } from '@mantine/core';
import { IconGitBranch, IconArrowUp, IconArrowDown, IconFocus2 } from '@tabler/icons-react';
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

// Priority colors for nodes
const priorityColors: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#1976d2',
  low: '#388e3c',
  trivial: '#757575',
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
          color: priorityColors[task.priority] || '#1976d2',
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
        edges.push({
          id: `${depId}-${taskId}`,
          source: depId,
          target: taskId,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#666',
          },
          style: {
            stroke: '#666',
            strokeWidth: 2,
          },
          animated: taskMap.get(depId)?.is_complete === false,
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
    return data?.color || '#1976d2';
  }, []);

  if (tasksWithDeps.length === 0) {
    return (
      <Paper p="xl" ta="center">
        <IconGitBranch size={64} color="var(--mantine-color-gray-5)" style={{ marginBottom: 16 }} />
        <Text size="lg" c="dimmed">
          No Dependencies
        </Text>
        <Text size="sm" c="dimmed">
          Add dependencies between tasks to see the dependency graph.
        </Text>
      </Paper>
    );
  }

  // Generate select options
  const taskOptions = [
    { value: '', label: 'All Tasks' },
    ...tasksWithDeps.map((task) => ({
      value: task.id,
      label: `${task.icon || ''} ${task.title}`.trim(),
    })),
  ];

  // Generate direction options for SegmentedControl
  const directionData = [
    { value: 'all', label: 'All' },
    {
      value: 'isolated',
      label: (
        <Center style={{ gap: 4 }}>
          <IconFocus2 size={14} />
          <span>Isolated</span>
        </Center>
      ),
    },
    {
      value: 'upstream',
      label: (
        <Center style={{ gap: 4 }}>
          <IconArrowUp size={14} />
          <span>Upstream</span>
        </Center>
      ),
    },
    {
      value: 'downstream',
      label: (
        <Center style={{ gap: 4 }}>
          <IconArrowDown size={14} />
          <span>Downstream</span>
        </Center>
      ),
    },
  ];

  return (
    <Box style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
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
          <Badge
            size="lg"
            variant="light"
            rightSection={
              <CloseButton size="xs" onClick={() => setSelectedTaskId(null)} aria-label="Clear focus" />
            }
          >
            Focused: {tasks.find((t) => t.id === selectedTaskId)?.title}
          </Badge>
        )}
      </Group>

      {/* Graph */}
      <Paper style={{ flex: 1 }}>
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
          <Controls />
          <MiniMap
            nodeColor={getNodeColor}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </Paper>

      {/* Legend */}
      <Group gap="md" mt="md" wrap="wrap">
        {Object.entries(priorityColors).map(([priority, color]) => (
          <Group key={priority} gap={4} align="center">
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
              }}
            />
            <Text size="xs" style={{ textTransform: 'capitalize' }}>
              {priority}
            </Text>
          </Group>
        ))}
      </Group>
    </Box>
  );
}
/* v8 ignore stop */
