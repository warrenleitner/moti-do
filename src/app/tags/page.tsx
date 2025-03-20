'use client';

import React from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import Layout from '@/components/Layout';

export default function TagsPage() {
  // Example tags - in a real app, these would come from your store
  const exampleTags = [
    { id: '1', name: 'Work', color: '#f44336' },
    { id: '2', name: 'Personal', color: '#2196f3' },
    { id: '3', name: 'Health', color: '#4caf50' },
    { id: '4', name: 'Learning', color: '#ff9800' },
    { id: '5', name: 'Finance', color: '#9c27b0' }
  ];

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tags
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and organize your tags for tasks and habits.
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Your Tags
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
          {exampleTags.map(tag => (
            <Chip 
              key={tag.id}
              label={tag.name}
              sx={{ 
                bgcolor: tag.color,
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          ))}
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Tag management functionality coming soon. You'll be able to create, edit, and delete tags,
          as well as assign them to tasks and habits.
        </Typography>
      </Paper>
    </Layout>
  );
} 