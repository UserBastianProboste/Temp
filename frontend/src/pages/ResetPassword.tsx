import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { establishRecoverySession, RecoveryFlowError } from '../utils/recoverySession';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [linkValid, setLinkValid] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const location = useLocation();
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Validar el enlace de recuperación y asegurarnos de que la sesión esté lista
  useEffect(() => {
    let isMounted = true;

    const verifyLink = async () => {
      setCheckingLink(true);
      setError('');

      try {
        const { cleanUrl } = await establishRecoverySession();

        if (!isMounted) return;

        window.history.replaceState({}, document.title, cleanUrl);
        setLinkValid(true);
      } catch (err) {
        if (!isMounted) return;

        console.error(err);
        const message = err instanceof RecoveryFlowError ? err.message : 'Enlace inválido o expirado';
        setError(message);
        setLinkValid(false);
      } finally {
        if (isMounted) {
          setCheckingLink(false);
        }
      }
    };

    void verifyLink();

    return () => {
      isMounted = false;
    };
  }, [location.key, location.search, location.hash]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkValid) return;

    if (!password || !confirmPassword) {
      setError('Complete todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError('Error al actualizar contraseña: ' + error.message);
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      console.error(err);
      setError('Error inesperado al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (checkingLink) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>Validando enlace…</Typography>
            <CircularProgress />
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!linkValid && !success) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Container maxWidth="sm">
          <Paper sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom>Enlace inválido</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Solicita nuevamente la recuperación de contraseña.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/forgot-password')}>
              Recuperar nuevamente
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (success) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <LockIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>¡Contraseña actualizada!</Typography>
            <Typography variant="body2" color="text.secondary">
              Serás redirigido al login en unos segundos...
            </Typography>
            <Button sx={{ mt: 3 }} variant="contained" onClick={() => navigate('/login')}>
              Ir al login ahora
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <LockIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>Nueva Contraseña</Typography>
            <Typography variant="body2" color="text.secondary">
              Ingresa tu nueva contraseña
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Nueva contraseña"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              inputProps={{ minLength: 8 }}
              helperText={
                password && password.length < 8
                  ? 'Debe tener al menos 8 caracteres'
                  : 'Mínimo 8 caracteres'
              }
            />
            <TextField
              fullWidth
              label="Confirmar contraseña"
              type="password"
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Actualizar contraseña'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;