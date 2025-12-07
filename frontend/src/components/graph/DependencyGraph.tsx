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
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { AccountTree, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import type { Task } from '../../types';
import TaskNode from './TaskNode';

interface DependencyGraphProps {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}

type Direction = 'all' | 'upstream' | 'downstream';

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

      if (direction === 'upstream') {
        // Find tasks that this task depends on
        currentTask.dependencies?.forEach((depId) => {
          if (!visited.has(depId)) {
            visited.add(depId);
            queue.push(depId);
          }
        });
      }

      if (direction === 'downstream') {
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
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <AccountTree sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Dependencies
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add dependencies between tasks to see the dependency graph.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Focus on Task</InputLabel>
          <Select
            value={selectedTaskId || ''}
            label="Focus on Task"
            onChange={(e) => setSelectedTaskId(e.target.value || null)}
          >
            <MenuItem value="">All Tasks</MenuItem>
            {tasksWithDeps.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.icon} {task.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedTaskId && (
          <ToggleButtonGroup
            value={direction}
            exclusive
            onChange={(_, value) => value && setDirection(value)}
            size="small"
          >
            <ToggleButton value="all">
              All
            </ToggleButton>
            <ToggleButton value="upstream">
              <ArrowUpward fontSize="small" sx={{ mr: 0.5 }} />
              Upstream
            </ToggleButton>
            <ToggleButton value="downstream">
              <ArrowDownward fontSize="small" sx={{ mr: 0.5 }} />
              Downstream
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {selectedTaskId && (
          <Chip
            label={`Focused: ${tasks.find((t) => t.id === selectedTaskId)?.title}`}
            onDelete={() => setSelectedTaskId(null)}
            size="small"
          />
        )}
      </Box>

      {/* Graph */}
      <Paper sx={{ flex: 1 }}>
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
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        {Object.entries(priorityColors).map(([priority, color]) => (
          <Box key={priority} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
              }}
            />
            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
              {priority}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
