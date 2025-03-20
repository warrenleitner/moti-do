'use client';

import React from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import Layout from '@/components/Layout';

export default function CalendarPage() {
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your tasks and habits in a calendar format.
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Calendar View Coming Soon
                </Typography>
                <Typography variant="body2">
                  This feature is under development. You'll soon be able to view your tasks and habits
                  in a calendar format to help you plan your schedule effectively.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Layout>
  );
} 