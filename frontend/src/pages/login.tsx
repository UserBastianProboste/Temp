import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { Email, Lock } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser, signIn, role, roleLoading, loading: authLoading } = useAuth();

  // Redirigir automáticamente si ya está autenticado
  React.useEffect(() => {
    if (!authLoading && currentUser && role) {
      console.log('🔄 [Login] Usuario ya autenticado, redirigiendo...');
      if (role === 'coordinador') {
        navigate('/coordinador/dashboard', { replace: true });
      } else if (role === 'estudiante') {
        navigate('/estudiante/dashboard', { replace: true });
      }
    }
  }, [authLoading, currentUser, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 [Login] Iniciando sesión...');
      const { data, error } = await signIn({ email, password });
      
      if (error) {
        console.error('❌ [Login] Error de autenticación:', error);
        setError(error.message);
        return;
      }

      console.log('✅ [Login] Autenticación exitosa:', data?.user?.email);

      // Prefer the user returned by signIn, fall back to currentUser
      const signedUser = data?.user ?? currentUser;

      // Wait for roleLoading to finish but with a timeout to avoid UI hang
      const waitForRoleResolution = () => new Promise<void>(resolve => {
        const maxMs = 5000;
        const start = Date.now();
        console.log('⏳ [Login] Esperando resolución de rol...');
        
        const check = () => {
          if (!roleLoading) {
            console.log('✅ [Login] Rol cargado');
            return resolve();
          }
          if (Date.now() - start >= maxMs) {
            console.warn('⚠️ [Login] Timeout esperando rol');
            return resolve();
          }
          setTimeout(check, 100);
        };
        check();
      });

      await waitForRoleResolution();

      // Esperar un tick adicional para asegurar que AuthProvider actualizó el estado
      await new Promise(resolve => setTimeout(resolve, 200));

      const resolvedRole = role ?? (signedUser as any)?.role;
      console.log('👤 [Login] Rol resuelto:', resolvedRole);
      
      if (resolvedRole === 'coordinador') {
        console.log('🎯 [Login] Navegando a dashboard coordinador');
        navigate('/coordinador/dashboard', { replace: true });
      } else if (resolvedRole === 'estudiante') {
        console.log('🎯 [Login] Navegando a dashboard estudiante');
        navigate('/estudiante/dashboard', { replace: true });
      } else {
        console.warn('⚠️ [Login] Rol no reconocido, navegando por defecto');
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('❌ [Login] Error inesperado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado durante el login';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras verifica si ya hay sesión
  if (authLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'white'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Iniciar Sesión
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Accede a tu cuenta de consultoría
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} noValidate>
            <TextField
              type="email"
              label="Correo Electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              type="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Button
                  variant="text"
                  onClick={() => navigate('/forgot-password')}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                Recuperar contraseña
              </Button>
            </Box>
            <Button
              type="submit"
              disabled={loading}
              size="large"
              sx={{ mt: 3, py: 1.5 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                ¿No tienes una cuenta?{' '}
                <Button
                  variant="text"
                  onClick={() => navigate('/register')}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  Regístrate aquí
                </Button>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;