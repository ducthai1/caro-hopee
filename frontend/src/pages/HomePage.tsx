import React from 'react';
import { Typography, Box } from '@mui/material';
import MainLayout from '../layouts/MainLayout';

const HomePage: React.FC = () => {
  return (
    <MainLayout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Home
        </Typography>
        <Typography variant="body1">
          Welcome to the internship project!
        </Typography>
      </Box>
    </MainLayout>
  );
};

export default HomePage;
