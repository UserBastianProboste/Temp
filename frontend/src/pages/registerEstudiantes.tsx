import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Email from '@mui/icons-material/Email';
import AssignmentInd from '@mui/icons-material/AssignmentInd';
import Lock from '@mui/icons-material/Lock';
import LocationCity from '@mui/icons-material/LocationCity';
import Person from '@mui/icons-material/Person';
import Phone from '@mui/icons-material/Phone';
import School from '@mui/icons-material/School';
import Verified from '@mui/icons-material/Verified';
import { useAuth } from '../hooks/useAuth';
import { estudianteService } from '../services/estudianteService';
import { supabase } from '../services/supabaseClient';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
  nombre: string;
  apellido: string;
  rut: string;
  telefono: string;
  carrera: string;
  sede: string;
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
    confirmPassword: '',
    verificationCode: '',
    nombre: '',
    apellido: '',
    rut: '',
    telefono: '',
    carrera: '',
    sede: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [emailPhase, setEmailPhase] = useState<'input' | 'code' | 'credentials'>('input');
  const [codeDigits, setCodeDigits] = useState<string[]>(() => Array(6).fill(''));
  const OTP_EXPIRATION = 60;
  const [timer, setTimer] = useState(OTP_EXPIRATION);
  const [timerActive, setTimerActive] = useState(false);
  const [codeRequestLoading, setCodeRequestLoading] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { sendEmailOtp, verifyEmailOtp, updateUserProfile, signOut } = useAuth();

  const steps = ['Identidad', 'Seguridad', 'Programa'];

  const isStepOneComplete =
    Boolean(formData.nombre.trim() && formData.apellido.trim() && formData.rut.trim());

  const { email, password, confirmPassword, carrera, sede } = formData;

  const isStepTwoComplete = useMemo(
    () =>
      Boolean(
        otpVerified &&
          email.trim() &&
          password.length >= 8 &&
          confirmPassword &&
          password === confirmPassword,
      ),
    [confirmPassword, email, otpVerified, password],
  );

  const isStepThreeComplete = useMemo(
    () => Boolean(carrera.trim() && sede.trim()),
    [carrera, sede],
  );

  useEffect(() => {
    if (!timerActive || emailPhase !== 'code') {
      return;
    }

    if (timer === 0) {
      setTimerActive(false);
      return;
    }

    const tick = window.setTimeout(() => {
      setTimer(prev => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(tick);
  }, [timerActive, timer, emailPhase]);

  const timerExpired = timer === 0 && emailPhase === 'code';
  const formattedTimer = `00:${String(timer).padStart(2, '0')}`;

  useEffect(() => {
    if (emailPhase === 'code') {
      codeRefs.current[0]?.focus();
    }
  }, [emailPhase]);

  useEffect(() => {
    if (emailPhase === 'credentials') {
      passwordRef.current?.focus();
    }
  }, [emailPhase]);

  const handleNext = () => {
    if (activeStep === 0 && !isStepOneComplete) {
      setError('Completa tu nombre, apellido y RUT antes de continuar.');
      return;
    }

    if (activeStep === 1 && !isStepTwoComplete) {
      setError('Completa la verificación de correo y configura tu contraseña antes de continuar.');
      return;
    }

    setError('');
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError('');
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendCode = async () => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      setError('Ingresa un correo electrónico válido antes de enviar el código.');
      return;
    }

    setCodeRequestLoading(true);
    setError('');
    setOtpVerified(false);

    try {
      const { error: otpError } = await sendEmailOtp(trimmedEmail);
      if (otpError) {
        setError(otpError.message || 'No pudimos enviar el código. Intenta nuevamente.');
        return;
      }

      setEmailPhase('code');
      setTimer(OTP_EXPIRATION);
      setTimerActive(true);
      setCodeDigits(Array(6).fill(''));
      setFormData(prev => ({
        ...prev,
        email: trimmedEmail,
        verificationCode: '',
      }));

      setTimeout(() => {
        codeRefs.current[0]?.focus();
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error enviando el código.');
    } finally {
      setCodeRequestLoading(false);
    }
  };

  const handleResendCode = async () => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      return;
    }

    setCodeRequestLoading(true);
    setError('');
    setOtpVerified(false);

    try {
      const { error: otpError } = await sendEmailOtp(trimmedEmail);
      if (otpError) {
        setError(otpError.message || 'No pudimos reenviar el código. Intenta nuevamente.');
        return;
      }

      setEmailPhase('code');
      setTimer(OTP_EXPIRATION);
      setTimerActive(true);
      setCodeDigits(Array(6).fill(''));
      setFormData(prev => ({
        ...prev,
        email: trimmedEmail,
        verificationCode: '',
      }));

      setTimeout(() => {
        codeRefs.current[0]?.focus();
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reenviando el código.');
    } finally {
      setCodeRequestLoading(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setError('');
    setEmailPhase('input');
    setTimerActive(false);
    setTimer(OTP_EXPIRATION);
    setCodeDigits(Array(6).fill(''));
    setOtpVerified(false);
    setVerifyingCode(false);
    setFormData(prev => ({
      ...prev,
      verificationCode: '',
      password: '',
      confirmPassword: '',
    }));
  };

  const verifyCodeWithSupabase = async (code: string) => {
    if (verifyingCode) {
      return;
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      setError('Ingresa un correo electrónico válido antes de verificar el código.');
      return;
    }

    setVerifyingCode(true);
    setError('');

    try {
      const { error: verificationError } = await verifyEmailOtp({ email: trimmedEmail, token: code });
      if (verificationError) {
        setError(verificationError.message || 'Código inválido o expirado. Solicita uno nuevo.');
        setOtpVerified(false);
        setCodeDigits(Array(6).fill(''));
        setFormData(prev => ({
          ...prev,
          verificationCode: '',
        }));
        setTimeout(() => codeRefs.current[0]?.focus(), 0);
        return;
      }

      setOtpVerified(true);
      setEmailPhase('credentials');
      setTimerActive(false);
      setFormData(prev => ({
        ...prev,
        verificationCode: code,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos validar el código.');
      setOtpVerified(false);
    } finally {
      setVerifyingCode(false);
    }
  };

  const commitCodeDigits = (nextDigits: string[]) => {
    const joined = nextDigits.join('');
    setFormData(formPrev => ({
      ...formPrev,
      verificationCode: joined,
    }));

    if (joined.length === nextDigits.length && !nextDigits.includes('')) {
      void verifyCodeWithSupabase(joined);
    }

    return nextDigits;
  };

  const handleCodeDigitChange = (index: number, value: string) => {
    if (!/^[0-9]?$/u.test(value)) {
      return;
    }

    const digit = value.replace(/\D/u, '').slice(-1);

    setCodeDigits(prev => {
      if (verifyingCode) {
        return prev;
      }
      const next = [...prev];
      next[index] = digit;

      if (digit && index < codeRefs.current.length - 1) {
        codeRefs.current[index + 1]?.focus();
      }

      return commitCodeDigits(next);
    });
  };

  const submitRegistration = async () => {
    setError('');

    if (!isStepTwoComplete) {
      setError('Revisa los datos de contacto y tus credenciales antes de registrar.');
      setActiveStep(1);
      return;
    }
    if (!isStepThreeComplete) {
      setError('Selecciona tu carrera y especifica la sede antes de finalizar el registro.');
      setActiveStep(2);
      return;
    }
    if (formData.password.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const email = formData.email.trim();
      const password = formData.password;
      const fullName = `${formData.nombre.trim()} ${formData.apellido.trim()}`.trim();
      const metadata: Record<string, any> = {
        full_name: fullName,
        role: 'estudiante',
        rut: formData.rut.trim(),
      };

      const telefono = formData.telefono.trim();
      const carreraSeleccionada = formData.carrera.trim();
      const sedeSeleccionada = formData.sede.trim();

      if (telefono) metadata.telefono = telefono;
      if (carreraSeleccionada) metadata.carrera = carreraSeleccionada;
      if (sedeSeleccionada) metadata.sede = sedeSeleccionada;

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session || !session.user) {
        setError('Debes validar tu correo ingresando el código que enviamos.');
        setActiveStep(1);
        return;
      }

      if (!session.user.email || session.user.email.toLowerCase() !== email.toLowerCase()) {
        setError('El correo verificado no coincide con el que estás registrando. Intenta nuevamente.');
        setActiveStep(1);
        return;
      }

      const { error: updateError } = await updateUserProfile({
        password,
        data: metadata,
      });
      if (updateError) {
        setError(updateError.message || 'No pudimos completar el registro. Intenta nuevamente.');
        return;
      }

      const { error: estudianteError } = await estudianteService.create({
        user_id: session.user.id,
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        email,
        telefono: telefono || null,
        carrera: carreraSeleccionada || null,
        sede: sedeSeleccionada || null,
      });
      if (estudianteError) {
        setError(`Error al crear el perfil de estudiante: ${estudianteError.message}`);
        return;
      }

      const { error: signOutError } = await signOut();
      if (signOutError) {
        console.warn('Error al cerrar sesión tras el registro:', signOutError.message);
      }

      navigate('/login');
    } catch (err: any) {
      setError(err?.message || 'Error inesperado durante el registro');
    } finally {
      setLoading(false);
    }
  };


  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (activeStep < steps.length - 1) {
      handleNext();
      return;
    }

    void submitRegistration();
  };

  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        px: 2,
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            backgroundColor: 'white',
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Registro de Estudiante
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Completa los pasos para crear tu cuenta
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleFormSubmit}>
            <Box
              key={activeStep}
              sx={{
                animation: 'fadeInUp 400ms ease',
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(12px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              {activeStep === 0 && (
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: { xs: '100%', md: 720 },
                    mx: 'auto',
                  }}
                >
                  <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="stretch">
                    <Grid item xs={12} md={6}>
                      <Stack spacing={2} sx={{ height: '100%' }}>
                        <TextField
                          name="nombre"
                          label="Nombre"
                          value={formData.nombre}
                          onChange={handleChange}
                          fullWidth
                          required
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <TextField
                          name="rut"
                          label="RUT"
                          placeholder="12.345.678-9"
                          value={formData.rut}
                          onChange={handleChange}
                          fullWidth
                          required
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <AssignmentInd color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Stack spacing={2} sx={{ height: '100%' }}>
                        <TextField
                          name="apellido"
                          label="Apellido"
                          value={formData.apellido}
                          onChange={handleChange}
                          fullWidth
                          required
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <TextField
                          name="telefono"
                          type="tel"
                          label="Teléfono"
                          placeholder="+56 9 1234 5678"
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
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeStep === 1 && (
                <Stack spacing={3}>
                  {emailPhase === 'input' && (
                    <Stack spacing={2}>
                      <TextField
                        name="email"
                        type="email"
                        label="Correo Electrónico"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        required
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email color="action" />
                            </InputAdornment>
                          ),
                        }}
                        helperText="Usaremos este correo para enviarte un código de verificación."
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSendCode}
                          type="button"
                          sx={{ minWidth: 180 }}
                          disabled={codeRequestLoading}
                        >
                          {codeRequestLoading ? 'Enviando...' : 'Enviar código'}
                        </Button>
                      </Box>
                    </Stack>
                  )}

                  {emailPhase !== 'input' && (
                    <Stack spacing={1} alignItems="center" textAlign="center">
                      <Verified color={emailPhase === 'credentials' ? 'success' : 'primary'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">
                        {emailPhase === 'credentials' ? 'Código verificado' : 'Código enviado'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {emailPhase === 'credentials'
                          ? 'Ya validamos tu correo. Ahora crea una contraseña segura.'
                          : 'Revisa tu bandeja de entrada. Ingresa el código de 6 dígitos para continuar con la configuración de tu contraseña.'}
                      </Typography>
                      {formData.email && (
                        <Typography variant="body2" color="text.secondary">
                          Enviado a{' '}
                          <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            {formData.email}
                          </Box>
                        </Typography>
                      )}
                      {emailPhase === 'code' && (
                        <Typography
                          variant="caption"
                          color={timerExpired ? 'error.main' : 'text.secondary'}
                          sx={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                            letterSpacing: 1,
                          }}
                        >
                          {formattedTimer}
                        </Typography>
                      )}
                      {timerExpired && (
                        <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                          El código expiró. Puedes solicitar uno nuevo.
                        </Typography>
                      )}
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleUseDifferentEmail}
                        type="button"
                        sx={{ textTransform: 'none' }}
                      >
                        Usar otro correo
                      </Button>
                    </Stack>
                  )}

                  {emailPhase === 'code' && (
                    <Stack spacing={2} alignItems="center">
                      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
                        {codeDigits.map((digit, index) => (
                          <Box
                            key={index}
                            component="input"
                            value={digit}
                            onChange={event => handleCodeDigitChange(index, event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Backspace') {
                                event.preventDefault();
                                if (codeDigits[index]) {
                                  handleCodeDigitChange(index, '');
                                } else {
                                  const previousIndex = Math.max(index - 1, 0);
                                  handleCodeDigitChange(previousIndex, '');
                                  setTimeout(() => codeRefs.current[previousIndex]?.focus(), 0);
                                }
                              }
                              if (event.key === 'ArrowLeft') {
                                event.preventDefault();
                                const previousIndex = Math.max(index - 1, 0);
                                codeRefs.current[previousIndex]?.focus();
                              }
                              if (event.key === 'ArrowRight') {
                                event.preventDefault();
                                const nextIndex = Math.min(index + 1, codeRefs.current.length - 1);
                                codeRefs.current[nextIndex]?.focus();
                              }
                            }}
                            onPaste={event => {
                              event.preventDefault();
                              const pasted = event.clipboardData
                                .getData('text')
                                .replace(/\D/g, '')
                                .slice(0, codeDigits.length - index);

                              if (!pasted) {
                                return;
                              }

                              setCodeDigits(prev => {
                                const next = [...prev];
                                for (let i = 0; i < pasted.length; i += 1) {
                                  next[index + i] = pasted[i];
                                }
                                return commitCodeDigits(next);
                              });

                              const nextFocusIndex = Math.min(
                                index + pasted.length,
                                codeRefs.current.length - 1,
                              );
                              setTimeout(() => codeRefs.current[nextFocusIndex]?.focus(), 0);
                            }}
                            ref={element => {
                              codeRefs.current[index] = element;
                            }}
                            maxLength={1}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            disabled={timerExpired || verifyingCode}
                            sx={{
                              width: { xs: 48, sm: 56 },
                              height: { xs: 56, sm: 64 },
                              borderRadius: 2,
                              border: theme => `1px solid ${theme.palette.divider}`,
                              textAlign: 'center',
                              fontSize: '1.5rem',
                              fontWeight: 600,
                              color: theme => theme.palette.common.black,
                              outline: 'none',
                              transition: 'border-color 200ms ease, transform 200ms ease',
                              backgroundColor: timerExpired ? 'action.disabledBackground' : 'white',
                              '&:focus': {
                                borderColor: 'primary.main',
                                transform: 'translateY(-2px)',
                              },
                              '&:disabled': {
                                cursor: 'not-allowed',
                              },
                            }}
                          />
                        ))}
                      </Box>
                      {verifyingCode && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={18} />
                          <Typography variant="caption" color="text.secondary">
                            Validando código...
                          </Typography>
                        </Stack>
                      )}

                      {timerExpired && (
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={handleResendCode}
                          type="button"
                          sx={{
                            minWidth: 200,
                            '@keyframes pulseAccent': {
                              '0%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.4)' },
                              '70%': { boxShadow: '0 0 0 12px rgba(156, 39, 176, 0)' },
                              '100%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0)' },
                            },
                            animation: 'pulseAccent 1.6s ease-in-out infinite',
                          }}
                          disabled={codeRequestLoading}
                        >
                          {codeRequestLoading ? 'Reenviando...' : 'Reenviar código'}
                        </Button>
                      )}
                    </Stack>
                  )}

                  {emailPhase === 'credentials' && (
                    <Stack spacing={2}>
                      <Typography variant="subtitle1" color="text.secondary">
                        ¡Listo! Ahora crea una contraseña segura.
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            name="password"
                            type="password"
                            label="Contraseña"
                            value={formData.password}
                            onChange={handleChange}
                            fullWidth
                            required
                            inputProps={{ minLength: 8 }}
                            inputRef={passwordRef}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Lock color="action" />
                                </InputAdornment>
                              ),
                            }}
                            error={Boolean(formData.password && formData.password.length < 8)}
                            helperText={
                              formData.password && formData.password.length < 8
                                ? 'Debe tener al menos 8 caracteres'
                                : 'Mínimo 8 caracteres'
                            }
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            name="confirmPassword"
                            type="password"
                            label="Confirmar Contraseña"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            fullWidth
                            required
                            inputProps={{ minLength: 8 }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Lock color="action" />
                                </InputAdornment>
                              ),
                            }}
                            error={
                              Boolean(
                                formData.confirmPassword &&
                                  formData.confirmPassword !== formData.password,
                              )
                            }
                            helperText={
                              formData.confirmPassword &&
                              formData.confirmPassword !== formData.password
                                ? 'Las contraseñas deben coincidir'
                                : 'Repite la contraseña para confirmarla'
                            }
                          />
                        </Grid>
                      </Grid>
                    </Stack>
                  )}
                </Stack>
              )}

              {activeStep === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      name="carrera"
                      label="Carrera"
                      value={formData.carrera}
                      onChange={handleChange}
                      select
                      fullWidth
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <School color="action" />
                          </InputAdornment>
                        ),
                      }}
                      helperText={!formData.carrera ? 'Selecciona la carrera que estás cursando' : ' '}
                    >
                      <MenuItem value="" disabled>
                        Selecciona una carrera
                      </MenuItem>
                      {carreras.map(carrera => (
                        <MenuItem key={carrera} value={carrera}>
                          {carrera}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      name="sede"
                      label="Sede"
                      placeholder="Ej: Campus San Joaquín"
                      value={formData.sede}
                      onChange={handleChange}
                      fullWidth
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationCity color="action" />
                          </InputAdornment>
                        ),
                      }}
                      helperText={!formData.sede ? 'Indica la sede o campus donde estudias' : ' '}
                    />
                  </Grid>
                </Grid>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 4,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                color="inherit"
                disabled={activeStep === 0 || loading}
                onClick={handleBack}
                type="button"
              >
                Paso anterior
              </Button>

              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  type="button"
                  disabled={(activeStep === 0 && !isStepOneComplete) || (activeStep === 1 && !isStepTwoComplete) || loading}
                >
                  Siguiente paso
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || !isStepTwoComplete || !isStepThreeComplete}
                  sx={{ minWidth: 180 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Registrando...
                    </>
                  ) : (
                    'Finalizar registro'
                  )}
                </Button>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
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
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterEstudiantes;