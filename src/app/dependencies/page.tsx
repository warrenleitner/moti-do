'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ConnectionLineType,
  MarkerType,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Typography,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  IconButton,
  CircularProgress
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Clear from '@mui/icons-material/Clear';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';

export default function DependenciesPage() {
  const tasks = useAppStore((state) => state.tasks);
  const projects = useAppStore((state) => state.projects);
  const tags = useAppStore((state) => state.tags);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Generate the graph data based on tasks and dependencies
  const generateGraph = useCallback(() => {
    setIsLoading(true);
    
    // Filter tasks based on search and filters
    const filteredTasks = tasks.filter(task => {
      // Only include tasks with dependencies or that are dependencies of other tasks
      const hasDependencies = task.dependencies.length > 0;
      const isDependency = tasks.some(t => t.dependencies.includes(task.id));
      
      if (!hasDependencies && !isDependency) {
        return false;
      }
      
      // Apply filters
      if (selectedTask && task.id !== selectedTask) {
        // If displaying the dependency tree for a specific task, we need to check if this task is in the tree
        const rootTask = tasks.find(t => t.id === selectedTask);
        if (!rootTask) return false;
        
        // Check if this task is a direct or indirect dependency of the root task
        const isInDependencyTree = (taskId: string, visited = new Set<string>()): boolean => {
          if (visited.has(taskId)) return false; // Prevent circular dependencies from causing infinite loops
          visited.add(taskId);
          
          const currTask = tasks.find(t => t.id === taskId);
          if (!currTask) return false;
          
          if (currTask.dependencies.includes(task.id)) return true;
          
          return currTask.dependencies.some(depId => isInDependencyTree(depId, new Set(visited)));
        };
        
        if (!isInDependencyTree(rootTask.id) && task.id !== rootTask.id) {
          return false;
        }
      }
      
      if (selectedProject && task.projectId !== selectedProject) {
        return false;
      }
      
      if (selectedTag && !task.tags.includes(selectedTag)) {
        return false;
      }
      
      if (searchText && !task.title.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    // Create nodes for each task
    const graphNodes: Node[] = filteredTasks.map((task, index) => {
      // Position nodes in a grid layout
      const row = Math.floor(index / 4);
      const col = index % 4;
      
      // Determine node style based on task state
      let nodeStyle = {};
      let nodeClass = '';
      
      if (task.completedAt) {
        nodeStyle = { background: '#e0e0e0', color: '#757575', borderColor: '#bdbdbd' };
        nodeClass = 'completed-node';
      } else if (task.isNext) {
        nodeStyle = { background: '#bbdefb', borderColor: '#1e88e5' };
        nodeClass = 'next-node';
      } else if (task.inProgress) {
        nodeStyle = { background: '#c8e6c9', borderColor: '#43a047' };
        nodeClass = 'inprogress-node';
      } else if (task.dueDate && new Date(task.dueDate) < new Date()) {
        nodeStyle = { background: '#ffcdd2', borderColor: '#e53935' };
        nodeClass = 'overdue-node';
      }
      
      // Add project color if available
      if (task.projectId) {
        const project = projects.find(p => p.id === task.projectId);
        if (project) {
          nodeStyle = { 
            ...nodeStyle, 
            borderLeft: `4px solid ${project.color}` 
          };
        }
      }
      
      return {
        id: task.id,
        data: { 
          label: (
            <div style={{ padding: '8px', maxWidth: '200px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', wordBreak: 'break-word' }}>
                {task.title}
              </div>
              {task.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {task.tags.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    return tag ? (
                      <span 
                        key={tag.id} 
                        style={{ 
                          backgroundColor: `${tag.color}40`,
                          color: tag.color,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px'
                        }}
                      >
                        {tag.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )
        },
        position: { x: col * 250, y: row * 150 },
        style: { 
          ...nodeStyle, 
          borderRadius: '8px', 
          padding: '0', 
          border: '1px solid #ccc' 
        },
        className: nodeClass
      };
    });
    
    // Create edges for dependencies
    const graphEdges: Edge[] = [];
    
    filteredTasks.forEach(task => {
      task.dependencies.forEach(depId => {
        // Only add edge if both nodes exist in the filtered list
        if (filteredTasks.some(t => t.id === depId)) {
          graphEdges.push({
            id: `${depId}-${task.id}`,
            source: depId,
            target: task.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed
            },
            style: { stroke: '#888' }
          });
        }
      });
    });
    
    setNodes(graphNodes);
    setEdges(graphEdges);
    setIsLoading(false);
  }, [tasks, selectedTask, selectedProject, selectedTag, searchText, projects, tags, setNodes, setEdges]);
  
  // Generate the graph when dependencies change
  useEffect(() => {
    generateGraph();
  }, [generateGraph]);
  
  const handleTaskChange = (event: SelectChangeEvent) => {
    setSelectedTask(event.target.value);
  };
  
  const handleProjectChange = (event: SelectChangeEvent) => {
    setSelectedProject(event.target.value);
  };
  
  const handleTagChange = (event: SelectChangeEvent) => {
    setSelectedTag(event.target.value);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };
  
  const handleClearFilters = () => {
    setSelectedTask(null);
    setSelectedProject(null);
    setSelectedTag(null);
    setSearchText('');
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Task Dependencies
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualize dependencies between tasks and see how they relate to each other.
        </Typography>
      </Box>
      
      <Paper sx={{ p: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="task-select-label">Task</InputLabel>
            <Select
              labelId="task-select-label"
              value={selectedTask || ''}
              label="Task"
              onChange={handleTaskChange}
              displayEmpty
            >
              <MenuItem value="">All Tasks</MenuItem>
              {tasks.filter(t => t.dependencies.length > 0 || tasks.some(task => task.dependencies.includes(t.id)))
                .map(task => (
                  <MenuItem key={task.id} value={task.id}>{task.title}</MenuItem>
                ))
              }
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="project-select-label">Project</InputLabel>
            <Select
              labelId="project-select-label"
              value={selectedProject || ''}
              label="Project"
              onChange={handleProjectChange}
              displayEmpty
            >
              <MenuItem value="">All Projects</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-block', 
                      width: 12, 
                      height: 12, 
                      bgcolor: project.color, 
                      borderRadius: '50%', 
                      mr: 1 
                    }} 
                  />
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="tag-select-label">Tag</InputLabel>
            <Select
              labelId="tag-select-label"
              value={selectedTag || ''}
              label="Tag"
              onChange={handleTagChange}
              displayEmpty
            >
              <MenuItem value="">All Tags</MenuItem>
              {tags.map(tag => (
                <MenuItem key={tag.id} value={tag.id}>
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-block', 
                      width: 12, 
                      height: 12, 
                      bgcolor: tag.color, 
                      borderRadius: '50%', 
                      mr: 1 
                    }} 
                  />
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Search"
            variant="outlined"
            value={searchText}
            onChange={handleSearchChange}
            InputProps={{
              endAdornment: searchText ? (
                <IconButton 
                  size="small" 
                  onClick={() => setSearchText('')}
                  edge="end"
                >
                  <IconButton 
                    size="small" 
                    onClick={() => setSearchText('')}
                    edge="end"
                  >
                    <Clear />
                  </IconButton>
                </IconButton>
              ) : (
                <Search />
              ),
            }}
          />
          
          <IconButton 
            color="primary" 
            onClick={handleClearFilters}
            sx={{ alignSelf: 'center' }}
          >
            <Clear />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip 
            icon={<div style={{ width: 10, height: 10, background: '#bbdefb', borderRadius: '50%' }} />}
            label="Next Task"
          />
          <Chip 
            icon={<div style={{ width: 10, height: 10, background: '#c8e6c9', borderRadius: '50%' }} />}
            label="In Progress"
          />
          <Chip 
            icon={<div style={{ width: 10, height: 10, background: '#ffcdd2', borderRadius: '50%' }} />}
            label="Overdue"
          />
          <Chip 
            icon={<div style={{ width: 10, height: 10, background: '#e0e0e0', borderRadius: '50%' }} />}
            label="Completed"
          />
        </Box>
      </Paper>
      
      <Paper sx={{ height: '70vh', mb: 4 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
          >
            <Controls />
            <Background />
            <Panel position="top-left">
              <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.8)', borderRadius: 1 }}>
                <Typography variant="body2">
                  {nodes.length} tasks • {edges.length} dependencies
                </Typography>
              </Box>
            </Panel>
          </ReactFlow>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              No dependency relationships found with the current filters.
            </Typography>
          </Box>
        )}
      </Paper>
    </Layout>
  );
} 