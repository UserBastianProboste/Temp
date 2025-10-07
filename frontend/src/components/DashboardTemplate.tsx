import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
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
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  ListItemAvatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  FeedbackSharp as FeedbackIcon,
  DriveFolderUploadRounded as UploadIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface DashboardTemplateProps {
  title: string;
  children: React.ReactNode;
}

export default function DashboardTemplate({ title, children }: DashboardTemplateProps) {
  const { currentUser, signOut, loading, role, roleLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorElUser(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const askLogout = () => {
    handleCloseUserMenu();
    setConfirmOpen(true);
  };

  const handleCancelLogout = () => setConfirmOpen(false);
  const handleLogoutConfirm = async () => {
    setConfirmOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  const menuEstudiante = [
    { label: 'Inicio', icon: <DashboardIcon />, to: '/estudiante/dashboard' },
    { label: 'Autoevaluación', icon: <AssignmentIcon />, to: '/estudiante/autoevaluacion' },
    { label: 'Ficha de práctica', icon: <DescriptionIcon />, to: '/estudiante/fichapractica' },
    { label: 'Adjuntar informes', icon: <UploadIcon />, to: '/estudiante/adjuntar_informes' },
    { label: 'Retroalimentacion', icon: <FeedbackIcon />, to: '/estudiante/retroalimentacion' },
    { label: 'Historial de solicitudes', icon: <DescriptionIcon />, to: '/historial_solicitudes' }
  ];

  const menuCoordinador = [
    { label: 'Panel', icon: <DashboardIcon />, to: '/coordinador/dashboard' },
    { label: 'Prácticas', icon: <AssignmentIcon />, to: '/coordinador/practicas' },
    { label: 'Estudiantes', icon: <GroupIcon />, to: '/coordinador/estudiantes' },
    { label: 'Empresas', icon: <BusinessIcon />, to: '/coordinador/empresas' },
    { label: 'Historial de solicitudes', icon: <DescriptionIcon />, to: '/historial_solicitudes' }
  ];

  const claimedRole = currentUser && 'role' in currentUser
    ? (currentUser as User & { role?: string | null }).role ?? null
    : null;
  const resolvedRole = role ?? claimedRole ?? null;
  const items = resolvedRole === 'coordinador' ? menuCoordinador : menuEstudiante;

  if (loading || roleLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return null; // ProtectedRoute se encarga de redirigir
  }

  const fullName = (currentUser.user_metadata?.full_name as string) || currentUser.email || '';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U';
  const roleLabel = resolvedRole ?? 'usuario';

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
            transition: 'width 0.25s',
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
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" lineHeight={1.15}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Panel de {roleLabel}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title="Cuenta">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 38, height: 38, fontSize: 16 }} alt={fullName}>
                  {initials}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
            >
              <MenuItem disabled sx={{ opacity: 1 }}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {fullName}
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {roleLabel}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem
                onClick={() => {
                  handleCloseUserMenu();
                  const homePath = resolvedRole === 'coordinador' ? '/coordinador/dashboard' : '/estudiante/dashboard';
                  navigate(homePath);
                }}
              >
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Perfil</ListItemText>
              </MenuItem>
              <MenuItem onClick={askLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Cerrar sesión</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Dialog open={confirmOpen} onClose={handleCancelLogout} maxWidth="xs" fullWidth>
          <DialogTitle>Cerrar sesión</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ¿Seguro que deseas cerrar la sesión ahora?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelLogout} variant="text">Cancelar</Button>
            <Button onClick={handleLogoutConfirm} variant="contained" color="error">
              Cerrar sesión
            </Button>
          </DialogActions>
        </Dialog>

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
