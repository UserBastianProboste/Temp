import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Email, Person, Phone, School } from '@mui/icons-material';

import { authService } from '../services/authService';
import { estudianteService } from '../services/estudianteService';

const RegisterEstudiantes: React.FC = () => {
  // === Estado local ===
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    carrera: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // === Manejadores de eventos ===
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    try {
      console.log('=== INICIANDO REGISTRO ===');
      console.log('Datos del formulario:', formData);

      // === Paso 1: Registrar usuario en Supabase Auth ===
      console.log('Paso 1: Registrando usuario en Auth...');
      const { data: authData, error: authError } = await authService.signUp(
        formData.email,
        formData.password,
        {
          full_name: `${formData.nombre} ${formData.apellido}`,
          role: 'estudiante'
        }
      );

      console.log('Resultado Auth:', { authData, authError });

      if (authError) {
        console.error('Error en autenticación:', authError);
        setError(authError.message);
        return;
      }

      if (authData.user) {
        console.log('Paso 2: Usuario creado, creando perfil...');
        console.log('User ID:', authData.user.id);

        // === Paso 2: Crear perfil de estudiante ===
        const { data: estudianteData, error: estudianteError } =
          await estudianteService.create({
            user_id: authData.user.id,
            nombre: formData.nombre,
            apellido: formData.apellido,
            email: formData.email,
            telefono: formData.telefono,
            carrera: formData.carrera,
          });

        console.log('Resultado Estudiante:', { estudianteData, estudianteError });

        if (estudianteError) {
          console.error('Error al crear perfil de estudiante:', estudianteError);
          setError(`Error al crear el perfil de estudiante: ${estudianteError.message}`);
          return;
        }

        console.log('=== REGISTRO EXITOSO ===');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error en catch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado durante el registro';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        alignItems: 'center',
        backgroundColor: 'background.default',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'white',
            margin: '0 auto',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Registro de Estudiante
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Completa el formulario para crear tu cuenta
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleRegister}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="nombre"
                  label="Nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="apellido"
                  label="Apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  name="email"
                  type="email"
                  label="Correo Electrónico"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  name="password"
                  type="password"
                  label="Contraseña"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  fullWidth
                  inputProps={{ minLength: 8 }}
                  error={!!error && error.toLowerCase().includes('contraseña')}
                  helperText={
                    formData.password && formData.password.length < 8
                      ? 'Debe tener al menos 8 caracteres'
                      : 'Mínimo 8 caracteres'
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="telefono"
                  type="tel"
                  label="Teléfono"
                  value={formData.telefono}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="carrera"
                  label="Carrera"
                  value={formData.carrera}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <School color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.email ||
                    !formData.nombre ||
                    !formData.apellido ||
                    formData.password.length < 8
                  }
                  size="large"
                  fullWidth
                  sx={{ mt: 2, py: 1.5 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Registrando...
                    </>
                  ) : (
                    'Registrar Estudiante'
                  )}
                </Button>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    ¿Ya tienes una cuenta?{' '}
                    <Button
                      variant="text"
                      onClick={() => navigate('/login')}
                      sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                    >
                      Inicia sesión aquí
                    </Button>
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterEstudiantes;