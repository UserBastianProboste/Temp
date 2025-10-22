import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import {
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from '@mui/icons-material';
import DashboardTemplate from '../components/DashboardTemplate';
import { empresaService } from '../services/empresaService';
import type { Empresa } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface EmpresaFormState {
  razon_social: string;
  direccion: string;
  jefe_directo: string;
  cargo_jefe: string;
  telefono: string;
  email: string;
}

type EmpresaFormErrors = Partial<Record<keyof EmpresaFormState, string>>;

const emptyFormState: EmpresaFormState = {
  razon_social: '',
  direccion: '',
  jefe_directo: '',
  cargo_jefe: '',
  telefono: '',
  email: '',
};

const estimateCardWeight = (empresa: Empresa) => {
  const baseWeight = 220;
  const textFields = [
    empresa.razon_social,
    empresa.direccion,
    empresa.jefe_directo,
    empresa.cargo_jefe,
    empresa.telefono,
    empresa.email,
  ];

  const textContribution = textFields.reduce((total, value) => total + (value?.length ?? 0), 0);

  return baseWeight + textContribution;
};

const buildBalancedColumns = (items: Empresa[], columnCount: number) => {
  if (columnCount <= 1) {
    return [items];
  }

  const columns: Empresa[][] = Array.from({ length: columnCount }, () => []);
  const weights = new Array(columnCount).fill(0);

  items.forEach((item) => {
    let targetColumn = 0;
    weights.forEach((weight, index) => {
      if (weight < weights[targetColumn]) {
        targetColumn = index;
      }
    });

    columns[targetColumn].push(item);
    weights[targetColumn] += estimateCardWeight(item);
  });

  const populatedColumns = columns.filter((column) => column.length > 0);

  return populatedColumns.length > 0 ? populatedColumns : [items];
};

const EmpresasPage = () => {
  const { role } = useAuth();
  const isCoordinator = role === 'coordinador';

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Empresa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [formValues, setFormValues] = useState<EmpresaFormState>(emptyFormState);
  const [formErrors, setFormErrors] = useState<EmpresaFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>(
    { open: false, message: '', severity: 'success' },
  );

  const loadEmpresas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await empresaService.getAll();
      if (fetchError) {
        throw new Error(fetchError.message ?? 'No se pudo obtener el listado de empresas.');
      }
      setEmpresas(data ?? []);
    } catch (err) {
      console.error('Error al cargar empresas', err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error al cargar las empresas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmpresas();
  }, [loadEmpresas]);

  const selectedEmpresa = useMemo(
    () => empresas.find((empresa) => empresa.id === selectedEmpresaId) ?? null,
    [empresas, selectedEmpresaId],
  );

  const columnCount = useMemo(() => {
    if (isSmallScreen) {
      return 1;
    }
    if (isMediumScreen) {
      return 2;
    }
    return 3;
  }, [isSmallScreen, isMediumScreen]);

  const masonryColumns = useMemo(
    () => buildBalancedColumns(empresas, columnCount),
    [empresas, columnCount],
  );

  const handleSelect = (empresaId: string) => {
    setSelectedEmpresaId((current) => (current === empresaId ? null : empresaId));
  };

  const handleEditOpen = (empresa: Empresa) => {
    setEditTarget(empresa);
    setFormValues({
      razon_social: empresa.razon_social ?? '',
      direccion: empresa.direccion ?? '',
      jefe_directo: empresa.jefe_directo ?? '',
      cargo_jefe: empresa.cargo_jefe ?? '',
      telefono: empresa.telefono ?? '',
      email: empresa.email ?? '',
    });
    setFormErrors({});
  };

  const handleEditClose = () => {
    if (saving) return;
    setEditTarget(null);
    setFormValues(emptyFormState);
    setFormErrors({});
  };

  const handleDeleteOpen = (empresa: Empresa) => {
    setDeleteTarget(empresa);
  };

  const handleDeleteClose = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleFormChange = (field: keyof EmpresaFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: EmpresaFormErrors = {};

    (Object.keys(formValues) as Array<keyof EmpresaFormState>).forEach((field) => {
      if (!formValues[field]?.trim()) {
        errors[field] = 'Campo obligatorio';
      }
    });

    if (formValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      errors.email = 'Correo electrónico inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showSnackbar = (message: string, severity: AlertColor) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleEditSave = async () => {
    if (!editTarget || !validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const { data, error: updateError } = await empresaService.update(editTarget.id, {
        ...formValues,
      });

      if (updateError) {
        throw new Error(updateError.message ?? 'No se pudo actualizar la empresa.');
      }

      if (data) {
        setEmpresas((prev) => prev.map((empresa) => (empresa.id === data.id ? data : empresa)));
      } else {
        await loadEmpresas();
      }

      showSnackbar('Empresa actualizada correctamente.', 'success');
      setEditTarget(null);
      setFormValues(emptyFormState);
    } catch (err) {
      console.error('Error al actualizar empresa', err);
      showSnackbar(
        err instanceof Error ? err.message : 'Ocurrió un error al actualizar la empresa.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error: deleteError } = await empresaService.delete(deleteTarget.id);
      if (deleteError) {
        throw new Error(deleteError.message ?? 'No se pudo eliminar la empresa.');
      }

      setEmpresas((prev) => prev.filter((empresa) => empresa.id !== deleteTarget.id));
      setSelectedEmpresaId((current) => (current === deleteTarget.id ? null : current));
      showSnackbar('Empresa eliminada correctamente.', 'success');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error al eliminar empresa', err);
      showSnackbar(
        err instanceof Error ? err.message : 'Ocurrió un error al eliminar la empresa.',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseSnackbar = (_event?: unknown, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <DashboardTemplate title="Relación con empresas">
      <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Box textAlign="center">
            <Typography variant="h4" component="h1" gutterBottom>
              Empresas colaboradoras
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mx: 'auto' }}>
              Consulta el listado actualizado de organizaciones disponibles para prácticas. {isCoordinator
                ? 'Como coordinador puedes mantener la información al día.'
                : 'Como estudiante selecciona la opción que se ajuste a tus intereses.'}
            </Typography>
          </Box>

          {selectedEmpresa && (
            <Alert
              icon={<CheckCircleOutlineIcon fontSize="inherit" />}
              severity="info"
              sx={{ borderRadius: 2 }}
              action={(
                <Button color="inherit" size="small" onClick={() => setSelectedEmpresaId(null)}>
                  Quitar selección
                </Button>
              )}
            >
              Has seleccionado <strong>{selectedEmpresa.razon_social}</strong> como referencia.
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              action={(
                <Button color="inherit" size="small" onClick={() => void loadEmpresas()}>
                  Reintentar
                </Button>
              )}
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !error && empresas.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Aún no hay empresas registradas. {isCoordinator
                ? 'Cuando registres una nueva empresa aparecerá aquí.'
                : 'Consulta más tarde o comunica a tu coordinador.'}
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: masonryColumns.length === 1 ? 'column' : 'row',
                gap: 3,
              }}
            >
              {masonryColumns.map((column, columnIndex) => (
                <Stack key={columnIndex} spacing={3} sx={{ flex: 1 }}>
                  {column.map((empresa) => {
                    const isSelected = selectedEmpresaId === empresa.id;
                    return (
                      <Card
                        key={empresa.id}
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          boxShadow: isSelected ? 8 : 3,
                          transform: isSelected ? 'translateY(-4px)' : 'none',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: 8,
                            transform: 'translateY(-4px)',
                          },
                        }}
                      >
                        <CardHeader
                          avatar={(
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <BusinessIcon />
                            </Avatar>
                          )}
                          title={
                            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                              {empresa.razon_social}
                            </Typography>
                          }
                          subheader={empresa.cargo_jefe ? `Contacto: ${empresa.cargo_jefe}` : undefined}
                        />

                        <CardContent sx={{ flexGrow: 1 }}>
                          <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <LocationOnIcon color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                {empresa.direccion || 'Dirección no registrada'}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <PersonIcon color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                {empresa.jefe_directo || 'Sin jefe directo asignado'}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <WorkIcon color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                {empresa.cargo_jefe || 'Sin cargo informado'}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <PhoneIcon color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                {empresa.telefono || 'Sin teléfono registrado'}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <EmailIcon color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                {empresa.email || 'Sin correo registrado'}
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>

                        <CardActions sx={{ px: 3, pb: 3, pt: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                            <Button
                              fullWidth
                              variant={isSelected ? 'contained' : 'outlined'}
                              onClick={() => handleSelect(empresa.id)}
                            >
                              {isSelected ? 'Seleccionada' : 'Seleccionar'}
                            </Button>

                            {isCoordinator && (
                              <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
                                <Tooltip title="Editar">
                                  <IconButton color="primary" onClick={() => handleEditOpen(empresa)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <IconButton color="error" onClick={() => handleDeleteOpen(empresa)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
                          </Stack>
                        </CardActions>
                      </Card>
                    );
                  })}
                </Stack>
              ))}
            </Box>
          )}
        </Stack>
      </Box>

      <Dialog open={Boolean(editTarget)} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle>Editar empresa</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Razón social"
              value={formValues.razon_social}
              onChange={handleFormChange('razon_social')}
              error={Boolean(formErrors.razon_social)}
              helperText={formErrors.razon_social}
              required
              fullWidth
            />
            <TextField
              label="Dirección"
              value={formValues.direccion}
              onChange={handleFormChange('direccion')}
              error={Boolean(formErrors.direccion)}
              helperText={formErrors.direccion}
              required
              fullWidth
            />
            <TextField
              label="Jefe directo"
              value={formValues.jefe_directo}
              onChange={handleFormChange('jefe_directo')}
              error={Boolean(formErrors.jefe_directo)}
              helperText={formErrors.jefe_directo}
              required
              fullWidth
            />
            <TextField
              label="Cargo del jefe"
              value={formValues.cargo_jefe}
              onChange={handleFormChange('cargo_jefe')}
              error={Boolean(formErrors.cargo_jefe)}
              helperText={formErrors.cargo_jefe}
              required
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={formValues.telefono}
              onChange={handleFormChange('telefono')}
              error={Boolean(formErrors.telefono)}
              helperText={formErrors.telefono}
              required
              fullWidth
            />
            <TextField
              label="Correo electrónico"
              value={formValues.email}
              onChange={handleFormChange('email')}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
              required
              fullWidth
              type="email"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleEditSave()} variant="contained" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={handleDeleteClose} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar empresa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Deseas eliminar la empresa «{deleteTarget?.razon_social}»? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleDeleteConfirm()}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardTemplate>
  );
};

export default EmpresasPage;
