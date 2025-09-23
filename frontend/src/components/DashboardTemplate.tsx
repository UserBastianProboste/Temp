import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface DashboardTemplateProps {
  title: string;
  children: React.ReactNode;
}

export default function DashboardTemplate({ title, children }: DashboardTemplateProps) {
  const { user, role, logout, loading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuEstudiante = [
    { label: 'Dashboard', icon: <DashboardIcon />, to: '/dashboard-estudiante' },
    { label: 'Mis Prácticas', icon: <AssignmentIcon />, to: '/mis-practicas' },
    { label: 'Empresas', icon: <BusinessIcon />, to: '/empresas' }
  ];

  const menuCoordinador = [
    { label: 'Dashboard', icon: <DashboardIcon />, to: '/dashboard-coordinador' },
    { label: 'Prácticas', icon: <AssignmentIcon />, to: '/practicas' },
    { label: 'Estudiantes', icon: <GroupIcon />, to: '/estudiantes' },
    { label: 'Empresas', icon: <BusinessIcon />, to: '/empresas' }
  ];

  const items = role === 'coordinador' ? menuCoordinador : menuEstudiante;

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  if (!user) {
    return null; // ProtectedRoute se encarga de redirigir
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? 240 : 72,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerOpen ? 240 : 72,
            transition: 'width 0.2s',
            overflowX: 'hidden'
          }
        }}
      >
        <Toolbar />
        <Divider />
        <List sx={{ mt: 1 }}>
          {items.map(item => {
            const active = location.pathname === item.to;
            return (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={active}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  ...(active && {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' }
                  })
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                {drawerOpen && <ListItemText primary={item.label} />}
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="fixed" sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              onClick={() => setDrawerOpen(o => !o)}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user.user_metadata?.full_name || user.email} ({role})
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </Toolbar>
        </AppBar>
        <Toolbar />
        <Container sx={{ mt: 4, mb: 4, flexGrow: 1 }}>{children}</Container>
        <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', bgcolor: 'grey.100' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Sistema de Gestión de Prácticas Profesionales
            </Typography>
        </Box>
      </Box>
    </Box>
  );
}