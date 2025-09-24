import React, { useEffect, useState } from 'react';
import { useNavigate,Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Email, Lock } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { login, user, role, loading: authLoading } = useAuth();

  useEffect(()=>{
    if (!user) return;
    if (role === 'coordinador') navigate('/dashboard-coordinador');
    else if (role === 'estudiante') navigate('/dashboard-estudiante');
    else navigate('/dashboard');
  },[user,role,navigate]);

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await login(email, password);
    if (error && error instanceof Error) {
      setError(error.message);
    }

    setLoading(false);
  };

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

            <Button
              type="submit"
              disabled={loading || authLoading}
              size="large"
              sx={{ mt: 3, py: 1.5 }}
            >
              {loading || authLoading ? (<><CircularProgress size={20} sx={{ mr: 1 }} />Iniciando sesión...</>) : ('Iniciar Sesión')}
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
            <Box sx={{ textAlign: 'center'}}>
            <Link to="/forgot-password" style={{ textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>
              <Typography variant="body2" color="primary">
                ¿Olvidaste tu contraseña?
              </Typography>
            </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;