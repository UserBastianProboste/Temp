import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Email from '@mui/icons-material/Email';
import Person from '@mui/icons-material/Person';
import Phone from '@mui/icons-material/Phone';
import School from '@mui/icons-material/School';
import { useAuth } from '../hooks/useAuth';
import { estudianteService } from '../services/estudianteService';
import { debugSession } from '../services/supabaseClient';

interface RegisterFormData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  carrera: string;
}

const carreras = [
  'Ingeniería Civil Informática',
  'Ingeniería Civil Industrial',
  'Ingeniería Comercial',
  'Ingeniería Civil Eléctrica',
  'Ingeniería en Construcción',
  'Ingeniería en Prevención de Riesgos y Medio Ambiente',
];

const RegisterEstudiantes: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
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
  const { signUp } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (formData.password.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log('=== INICIANDO REGISTRO ===');
      console.log('Datos del formulario:', formData);

      const email = formData.email.trim();
      const password = formData.password;
      const fullName = `${formData.nombre} ${formData.apellido}`.trim();
      const options = {
        data: {
          full_name: fullName,
          role: 'estudiante',
        },
      } as const;

      let signUpData: Awaited<ReturnType<typeof signUp>>['data'] | null = null;
      let signUpError: Awaited<ReturnType<typeof signUp>>['error'] | null = null;

      try {
        const result = await signUp({ email, password, options });
        signUpData = result.data;
        signUpError = result.error;
        console.log('Resultado Auth:', result);
      } catch (signUpException) {
        console.error('signUp threw:', signUpException);
        try {
          await debugSession();
        } catch (sessionError) {
          console.debug('debugSession falló', sessionError);
        }
        setError('Error al registrar usuario. Revise la consola para más detalles.');
        return;
      }

      if (signUpError) {
        console.error('Error en autenticación:', signUpError);
        try {
          await debugSession();
        } catch (sessionError) {
          console.debug('debugSession falló', sessionError);
        }
        const message = signUpError.message || String(signUpError);
        setError(message);
        return;
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        console.warn('signUp no devolvió usuario; puede requerir confirmación por correo.');
        setError('Registro iniciado. Revisa tu correo para confirmar tu cuenta antes de ingresar.');
        navigate('/login');
        return;
      }

      try {
        const { error: estudianteError } = await estudianteService.create({
          user_id: userId,
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email,
          telefono: formData.telefono.trim(),
          carrera: formData.carrera,
        });

        if (estudianteError) {
          console.error('Error al crear perfil de estudiante:', estudianteError);
          setError(`Error al crear el perfil de estudiante: ${estudianteError.message}`);
          return;
        }
      } catch (studentException) {
        console.error('Excepción al crear estudiante:', studentException);
        setError('Error inesperado al crear el perfil de estudiante.');
        return;
      }

      console.log('=== REGISTRO EXITOSO ===');
      navigate('/login');
    } catch (error) {
      console.error('Error inesperado durante el registro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado durante el registro';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight:'100vh'

      }}

    >
      <Container maxWidth="md"
                  sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
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

          <Box component="form" onSubmit={handleRegister} noValidate>
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
                  select
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <School color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  {carreras.map(carrera => (
                    <MenuItem key={carrera} value={carrera}>
                      {carrera}
                    </MenuItem>
                  ))}
                </TextField>
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