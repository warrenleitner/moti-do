'use client';

import React from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider
} from '@mui/material';
import Layout from '@/components/Layout';

export default function ProjectsPage() {
  // Example projects - in a real app, these would come from your store
  const exampleProjects = [
    { id: '1', name: 'Work Project A', progress: 75, color: '#f44336' },
    { id: '2', name: 'House Renovation', progress: 45, color: '#2196f3' },
    { id: '3', name: 'Learning JavaScript', progress: 60, color: '#4caf50' },
  ];

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Projects
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your projects and track their progress.
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {exampleProjects.map(project => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {project.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={project.progress} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: `${project.color}22`,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: project.color
                        }
                      }} 
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {`${project.progress}%`}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Project management functionality coming soon. You'll be able to create, edit, and delete projects,
                  as well as associate tasks with specific projects.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Layout>
  );
} 