import React, { useEffect, useMemo, useState } from 'react';
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
  DialogActions,
  useMediaQuery
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
  DriveFolderUploadRounded as UploadIcon,
  HelpOutline as HelpIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@mui/material/styles';

interface DashboardTemplateProps {
  title?: string;
  children: React.ReactNode;
}

export default function DashboardTemplate({ title, children }: DashboardTemplateProps) {
  const { currentUser, signOut, loading, role, roleLoading } = useAuth();
  const theme = useTheme();
  const isWide = useMediaQuery('(min-aspect-ratio: 4/3)');
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(isWide);
  }, [isWide]);

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

  const menuEstudiante = useMemo(() => ([
    { label: 'Inicio', icon: <DashboardIcon />, to: '/estudiante/dashboard' },
    { label: 'Autoevaluación', icon: <AssignmentIcon />, to: '/estudiante/autoevaluacion' },
    { label: 'Ficha de práctica', icon: <DescriptionIcon />, to: '/estudiante/fichapractica' },
    { label: 'Adjuntar informes', icon: <UploadIcon />, to: '/estudiante/adjuntar_informes' },
    { label: 'Retroalimentación', icon: <FeedbackIcon />, to: '/estudiante/retroalimentacion' },
    { label: 'Historial de solicitudes', icon: <DescriptionIcon />, to: '/historial_solicitudes' }
  ]), []);

  const menuCoordinador = useMemo(() => ([
    { label: 'Panel', icon: <DashboardIcon />, to: '/coordinador/dashboard' },
    { label: 'Prácticas', icon: <AssignmentIcon />, to: '/coordinador/practicas' },
    { label: 'Estudiantes', icon: <GroupIcon />, to: '/coordinador/estudiantes' },
    { label: 'Empresas', icon: <BusinessIcon />, to: '/coordinador/empresas' },
    { label: 'Historial de solicitudes', icon: <DescriptionIcon />, to: '/historial_solicitudes' }
  ]), []);

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
  const defaultTitle = resolvedRole === 'coordinador' ? 'Panel de coordinación' : 'Panel de estudiante';
  const headerTitle = title && title.trim().length > 0 ? title : defaultTitle;
  const showSubtitle = headerTitle.trim().toLowerCase() !== defaultTitle.toLowerCase();

  const isActivePath = (path: string) => {
    if (location.pathname === path) return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  const renderMenuItems = (
    <List sx={{ mt: 1 }}>
      {items.map(item => {
        const active = isActivePath(item.to);
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
              color: '#f3f3f3',
              '& .MuiListItemIcon-root': {
                color: '#d0d0d0'
              },
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.08)'
              },
              ...(active && {
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': { bgcolor: theme.palette.primary.dark },
                '& .MuiListItemIcon-root': { color: theme.palette.primary.contrastText }
              })
            }}
            onClick={() => {
              if (!isWide) {
                setDrawerOpen(false);
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            {drawerOpen && isWide && <ListItemText primary={item.label} />}
            {!isWide && <ListItemText primary={item.label} />}
          </ListItemButton>
        );
      })}
    </List>
  );

  const faqButton = (
    <Box sx={{ p: 2 }}>
      <Button
        fullWidth
        variant="contained"
        sx={{
          bgcolor: '#575756',
          color: '#fff',
          '&:hover': { bgcolor: '#4a4a49' }
        }}
        startIcon={<HelpIcon />}
        component={RouterLink}
        to="/estudiante/preguntas-frecuentes"
        onClick={() => {
          if (!isWide) {
            setDrawerOpen(false);
          }
        }}
      >
        Preguntas frecuentes
      </Button>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isWide ? (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: 260,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 260,
              display: 'flex',
              flexDirection: 'column',
              borderRight: 'none',
              boxShadow: 3,
              bgcolor: '#3f3f3e',
              color: '#f3f3f3'
            }
          }}
        >
          <Toolbar sx={{ justifyContent: 'center', py: 3 }}>
            <Box
              component="img"
              src="/PractiK.png"
              alt="PractiK"
              sx={{ maxWidth: 180, width: '100%', objectFit: 'contain' }}
            />
          </Toolbar>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
          {renderMenuItems}
          <Box sx={{ flexGrow: 1 }} />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
          {faqButton}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
              bgcolor: '#3f3f3e',
              color: '#f3f3f3',
              top: isWide ? 0 : isSmallScreen ? 56 : 64,
              height: isWide ? '100%' : `calc(100% - ${isSmallScreen ? 56 : 64}px)`
            }
          }}
        >
          <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
            <Box
              component="img"
              src="/PractiK.png"
              alt="PractiK"
              sx={{ maxWidth: 160, width: '100%', objectFit: 'contain' }}
            />
          </Toolbar>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
          {renderMenuItems}
          <Box sx={{ flexGrow: 1 }} />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
          {faqButton}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="fixed"
          color="inherit"
          elevation={1}
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            ml: isWide ? '260px' : 0,
            width: isWide ? 'calc(100% - 260px)' : '100%',
            bgcolor: '#ffffff'
          }}
        >
          <Toolbar>
            {!isWide && (
              <IconButton
                color="inherit"
                aria-label="toggle drawer"
                onClick={() => setDrawerOpen(o => !o)}
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 52,
                  height: 52,
                  mr: 2,
                  borderRadius: '14px',
                  bgcolor: '#ffffff',
                  p: 1,
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)'
                }}
              >
                <Box
                  component="img"
                  src="/UA.svg"
                  alt="UA"
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" lineHeight={1.15} fontWeight={600}>
                  {headerTitle}
                </Typography>
                {showSubtitle && (
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    Panel de {roleLabel}
                  </Typography>
                )}
              </Box>
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
