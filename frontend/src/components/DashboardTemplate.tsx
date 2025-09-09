import {
 AppBar, Toolbar, Typography, Button, Box, Container, Drawer, List,
  ListItem,ListItemButton, ListItemText, IconButton
} from "@mui/material";
import type { ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
// Necesitarás importar iconos, por ejemplo:
// import DashboardIcon from '@mui/icons-material/Dashboard';
// import AssignmentIcon from '@mui/icons-material/Assignment';
// import BusinessIcon from '@mui/icons-material/Business';
// import MenuIcon from '@mui/icons-material/Menu';

interface DashboardTemplateProps {
  title: string;
  children: ReactNode;
}

export default function DashboardTemplate({ title, children }: DashboardTemplateProps) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const username = localStorage.getItem('username') || 'Usuario';
  const userRole = localStorage.getItem('rol');

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Verifica autenticación
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('token en dashboard:',token)
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Menú lateral */}
      <Drawer
        variant="permanent"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? 240 : 70,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerOpen ? 240 : 70,
            transition: 'width 0.2s',
            overflowX: 'hidden'
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            <ListItem disablePadding>
                <ListItemButton component={Link} to="/dashboard-estudiante">
                {/* <ListItemIcon><DashboardIcon /></ListItemIcon> */}
                <ListItemText primary="Dashboard" />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton component={Link} to="/fichas-practicas">
                {/* <ListItemIcon><AssignmentIcon /></ListItemIcon> */}
                <ListItemText primary="Mis Prácticas" />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton component={Link} to="/empresas">
                {/* <ListItemIcon><BusinessIcon /></ListItemIcon> */}
                <ListItemText primary="Empresas" />
                </ListItemButton>
            </ListItem>
            </List>
        </Box>
      </Drawer>

      {/* Contenido principal */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              onClick={toggleDrawer}
              edge="start"
              sx={{ mr: 2 }}
            >
              {/* <MenuIcon /> */}
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            
            {/* Indicador de usuario actual */}
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {username} ({userRole})
            </Typography>
            
            <Button color="inherit" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </Toolbar>
        </AppBar>
        <Toolbar /> {/* Espaciador para compensar la AppBar fija */}
        
        <Container sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
          {children}
        </Container>
        
        {/* Footer */}
        <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', bgcolor: '#f0f0f0' }}>
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Sistema de Gestión de Prácticas Profesionales
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}