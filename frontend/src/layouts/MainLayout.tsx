import React, { ReactNode } from 'react';
import { Box, Container, AppBar, Toolbar, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            HOPEE - Internship Project
          </Typography>
          {user && (
            <Typography variant="body1">
              Welcome, {user.name || user.username}
            </Typography>
          )}
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flex: 1, py: 4 }}>
        {children}
      </Container>
      <Box
        component="footer"
        sx={{ py: 2, textAlign: 'center', bgcolor: 'grey.100' }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2025 HOPEE - Internship Project
        </Typography>
      </Box>
    </Box>
  );
};

export default MainLayout;
