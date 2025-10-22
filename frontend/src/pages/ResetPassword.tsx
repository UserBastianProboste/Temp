import React, { useState, useEffect } from 'react';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../../consultoria_informatica/frontend/src/services/supabaseClient';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [linkValid, setLinkValid] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extraer tokens (Supabase a veces los entrega en el hash #)
  useEffect(() => {
    const verifyLink = async () => {
      setCheckingLink(true);
      setError('');

      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const urlParams = url.searchParams;
        const hashParams = new URLSearchParams(hash);

        const code = urlParams.get('code') || hashParams.get('code');
        const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
        const otpToken = urlParams.get('token') || hashParams.get('token');
        const type = urlParams.get('type') || hashParams.get('type') || 'recovery';
        const email = urlParams.get('email') || hashParams.get('email') || undefined;

        let accessToken = urlParams.get('access_token') || hashParams.get('access_token') || searchParams.get('access_token');
        let refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token') || searchParams.get('refresh_token');

        const hasAuthParams = Boolean(
          code || tokenHash || otpToken || accessToken || refreshToken
        );

        if (!hasAuthParams) {
          throw new Error('Enlace inválido o expirado');
        }

        let valid = false;

        try {
          const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (!error && data.session) {
            valid = true;
          }
        } catch (getSessionError) {
          console.debug('getSessionFromUrl error', getSessionError);
        }

        if (!valid && code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          valid = true;
        }

        if (!valid && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) throw error;
          valid = true;
        }

        if (!valid && otpToken && email) {
          const { error } = await supabase.auth.verifyOtp({
            token: otpToken,
            type: type as any,
            email,
          });
          if (error) throw error;
          valid = true;
        }

        if (!valid) {
          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            if (error) throw error;
            valid = true;
          }
        }

        if (!valid) {
          throw new Error('Enlace inválido o expirado');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No se pudo establecer la sesión para restablecer la contraseña.');
        }

        const cleanUrl = `${url.origin}${url.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);

        setLinkValid(true);
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Enlace inválido o expirado';
        setError(message);
        setLinkValid(false);
      } finally {
        setCheckingLink(false);
      }
    };

    void verifyLink();
  }, [searchParams]);

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
      setTimeout(() => navigate('/login'), 2500);
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