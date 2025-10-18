import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DashboardTemplate from '../components/DashboardTemplate';
import { useAuth } from '../hooks/useAuth';
import { fetchProfile, getAvatarSignedUrl, upsertProfile, uploadAvatar } from '../services/profileService';
import type { ProfileRecord } from '../services/profileService';

interface ProfileForm {
  full_name: string;
  phone: string;
  alternate_email: string;
}

const emptyForm: ProfileForm = {
  full_name: '',
  phone: '',
  alternate_email: '',
};

export default function ProfileSettings() {
  const { currentUser, sendPasswordReset, updatePassword } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userId = currentUser?.id ?? null;
  const userEmail = currentUser?.email ?? '';

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const data = await fetchProfile(userId);
        if (!isMounted) return;
        setProfile(data);
        setForm({
          full_name: data?.full_name ?? currentUser?.user_metadata?.full_name ?? '',
          phone: data?.phone ?? '',
          alternate_email: data?.alternate_email ?? '',
        });
        if (data?.avatar_path) {
          try {
            const url = await getAvatarSignedUrl(data.avatar_path);
            if (isMounted) {
              setAvatarUrl(url);
            }
          } catch (avatarError) {
            console.warn('No se pudo obtener la imagen de perfil', avatarError);
          }
        }
      } catch (error) {
        console.error('Error loading profile', error);
        if (isMounted) {
          setFeedback({ type: 'error', message: 'No se pudo cargar tu información de perfil.' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userId, currentUser?.user_metadata?.full_name]);

  const handleFieldChange = (field: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const trimmed: ProfileForm = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      alternate_email: form.alternate_email.trim(),
    };
    if (!trimmed.full_name) {
      setFeedback({ type: 'error', message: 'El nombre completo es obligatorio.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const updated = await upsertProfile(userId, trimmed);
      setProfile(updated);
      setForm(trimmed);
      setFeedback({ type: 'success', message: 'Tu información se guardó correctamente.' });
    } catch (error) {
      console.error('Error saving profile', error);
      setFeedback({ type: 'error', message: 'Ocurrió un error al guardar tu información.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !userId) return;
    const file = event.target.files[0];

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Elige una imagen de hasta 2 MB.' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Selecciona un archivo de imagen válido.' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setAvatarUploading(true);
    setFeedback(null);
    try {
      const { avatarUrl: newUrl, avatarPath } = await uploadAvatar(userId, file);
      setAvatarUrl(newUrl);
      setProfile(prev => (prev ? { ...prev, avatar_path: avatarPath } : prev));
      setFeedback({ type: 'success', message: 'Tu foto de perfil se actualizó.' });
    } catch (error) {
      console.error('Error uploading avatar', error);
      setFeedback({ type: 'error', message: 'No se pudo actualizar la foto de perfil.' });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    setPasswordValues({ newPassword: '', confirmPassword: '' });
    setPasswordFeedback(null);
  };

  const canSave = useMemo(() => {
    if (!profile) return true;
    return (
      profile.full_name !== form.full_name ||
      (profile.phone ?? '') !== form.phone ||
      (profile.alternate_email ?? '') !== form.alternate_email
    );
  }, [profile, form.full_name, form.phone, form.alternate_email]);

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordValues.newPassword || passwordValues.newPassword !== passwordValues.confirmPassword) {
      setPasswordFeedback('Las contraseñas deben coincidir.');
      return;
    }
    if (passwordValues.newPassword.length < 8) {
      setPasswordFeedback('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setPasswordSubmitting(true);
    setPasswordFeedback(null);
    try {
      const { error } = await updatePassword(passwordValues.newPassword);
      if (error) {
        throw error;
      }
      setPasswordFeedback('Tu contraseña se actualizó correctamente.');
      setPasswordValues({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password', error);
      setPasswordFeedback('No se pudo actualizar la contraseña. Inténtalo nuevamente.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!userEmail) return;
    setFeedback(null);
    try {
      const { error } = await sendPasswordReset(userEmail);
      if (error) {
        throw error;
      }
      setFeedback({ type: 'success', message: 'Te enviamos un correo para restablecer tu contraseña.' });
    } catch (error) {
      console.error('Error sending password reset email', error);
      setFeedback({ type: 'error', message: 'No se pudo enviar el correo de restablecimiento.' });
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <DashboardTemplate title="Configuración de perfil">
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {feedback && (
            <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
              {feedback.message}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title="Tu foto" subheader="Personaliza tu perfil con una imagen" />
                <CardContent>
                  <Stack spacing={2} alignItems="center">
                    <Avatar
                      src={avatarUrl ?? undefined}
                      alt={form.full_name || currentUser.email || 'Usuario'}
                      sx={{ width: 120, height: 120, fontSize: 40 }}
                    >
                      {(form.full_name || currentUser.email || 'U')[0]?.toUpperCase() ?? 'U'}
                    </Avatar>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      hidden
                      onChange={handleAvatarChange}
                    />
                    <Button variant="outlined" onClick={handleAvatarClick} disabled={avatarUploading}>
                      {avatarUploading ? 'Actualizando…' : 'Cambiar foto'}
                    </Button>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Se admiten imágenes en formato JPG o PNG de hasta 2 MB.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Card component="form" onSubmit={handleSave}>
                <CardHeader title="Datos personales" subheader="Revisa y actualiza la información básica de tu cuenta" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Nombre completo"
                        value={form.full_name}
                        onChange={handleFieldChange('full_name')}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Teléfono de contacto"
                        value={form.phone}
                        onChange={handleFieldChange('phone')}
                        placeholder="Ej: +56 9 1234 5678"
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Correo alternativo"
                        type="email"
                        value={form.alternate_email}
                        onChange={handleFieldChange('alternate_email')}
                        placeholder="tu-correo@ejemplo.cl"
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </CardContent>
                <Box display="flex" justifyContent="flex-end" px={3} pb={3}>
                  <Button type="submit" variant="contained" disabled={saving || !canSave}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </Box>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardHeader title="Seguridad de la cuenta" subheader="Accesos rápidos para mantener tu cuenta protegida" />
            <CardContent>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Contraseña
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Button variant="outlined" onClick={() => setPasswordDialogOpen(true)}>
                      Cambiar contraseña
                    </Button>
                    <Button variant="text" onClick={handleSendResetEmail}>
                      Enviar enlace de restablecimiento
                    </Button>
                  </Stack>
                </Box>

                <Divider flexItem />

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Sesiones y dispositivos
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Revisa y cierra sesiones activas desde tu panel de seguridad en Supabase Auth.
                  </Typography>
                  <Button
                    variant="text"
                    href="https://app.supabase.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir panel de seguridad
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Dialog open={passwordDialogOpen} onClose={handlePasswordDialogClose} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handlePasswordSubmit}>
          <DialogTitle>Actualiza tu contraseña</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Nueva contraseña"
                type="password"
                value={passwordValues.newPassword}
                onChange={event => setPasswordValues(prev => ({ ...prev, newPassword: event.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Confirma tu contraseña"
                type="password"
                value={passwordValues.confirmPassword}
                onChange={event => setPasswordValues(prev => ({ ...prev, confirmPassword: event.target.value }))}
                required
                fullWidth
              />
              {passwordFeedback && (
                <Alert severity={passwordFeedback.startsWith('Tu contraseña') ? 'success' : 'error'}>
                  {passwordFeedback}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePasswordDialogClose}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={passwordSubmitting}>
              {passwordSubmitting ? 'Actualizando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </DashboardTemplate>
  );
}
