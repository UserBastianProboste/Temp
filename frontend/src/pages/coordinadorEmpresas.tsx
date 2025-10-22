import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardTemplate from '../components/DashboardTemplate';
import { estadoLabels, useEmpresas } from '../hooks/useEmpresas';
import type { ConvenioEstado } from '../hooks/useEmpresas';
import { empresaService } from '../services/empresaService';

const ESTADO_FILTERS: (ConvenioEstado | 'todos')[] = ['todos', 'activo', 'en_negociacion', 'vencido'];
const DISPONIBILIDAD_FILTERS = [
  { value: 'todos', label: 'Todos los cupos' },
  { value: 'con_cupos', label: 'Con cupos disponibles' },
  { value: 'sin_cupos', label: 'Sin cupos' },
] as const;

type DisponibilidadFilter = (typeof DISPONIBILIDAD_FILTERS)[number]['value'];

interface EditFormState {
  razon_social: string;
  direccion: string;
  estado_convenio: ConvenioEstado;
  ubicacion: string;
  cupos_disponibles: string;
  jefe_directo: string;
  cargo_jefe: string;
  telefono: string;
  email: string;
  ultimo_contacto: string;
}

const buildEstadoVisuals = (estado: ConvenioEstado, theme: ReturnType<typeof useTheme>) => {
  switch (estado) {
    case 'activo':
      return {
        background: alpha(theme.palette.success.light, 0.25),
        border: alpha(theme.palette.success.main, 0.6),
        chipColor: 'success' as const,
      };
    case 'en_negociacion':
      return {
        background: alpha(theme.palette.warning.light, 0.25),
        border: alpha(theme.palette.warning.main, 0.6),
        chipColor: 'warning' as const,
      };
    case 'vencido':
    default:
      return {
        background: alpha(theme.palette.error.light, 0.25),
        border: alpha(theme.palette.error.main, 0.6),
        chipColor: 'error' as const,
      };
  }
};

const normalizeText = (value?: string | null) => value?.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') ?? '';

const buildFormState = (empresa: ReturnType<typeof useEmpresas>['empresas'][number]): EditFormState => ({
  razon_social: empresa.razon_social ?? '',
  direccion: empresa.direccion ?? '',
  estado_convenio: (empresa.estado_convenio ?? 'activo') as ConvenioEstado,
  ubicacion: empresa.ubicacion ?? '',
  cupos_disponibles: empresa.cupos_disponibles?.toString() ?? '',
  jefe_directo: empresa.jefe_directo ?? '',
  cargo_jefe: empresa.cargo_jefe ?? '',
  telefono: empresa.telefono ?? '',
  email: empresa.email ?? '',
  ultimo_contacto: empresa.ultimo_contacto ?? '',
});

const parseNumberOrNull = (value: string) => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStringOrNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const CoordinadorEmpresas = () => {
  const theme = useTheme();
  const { empresas, loading, error, refresh } = useEmpresas();
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<(ConvenioEstado | 'todos')>('todos');
  const [ubicacionFilter, setUbicacionFilter] = useState('todas');
  const [disponibilidadFilter, setDisponibilidadFilter] = useState<DisponibilidadFilter>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const ubicaciones = useMemo(() => {
    const options = new Set<string>();
    empresas.forEach((empresa) => {
      if (empresa.ubicacion) {
        options.add(empresa.ubicacion);
      }
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [empresas]);

  const filteredEmpresas = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    return empresas.filter((empresa) => {
      const matchesSearch = normalizedQuery.length === 0
        || normalizeText(empresa.razon_social).includes(normalizedQuery)
        || normalizeText(empresa.ubicacion ?? '').includes(normalizedQuery)
        || normalizeText(empresa.jefe_directo ?? '').includes(normalizedQuery);

      const matchesEstado = estadoFilter === 'todos'
        || (empresa.estado_convenio ?? 'activo') === estadoFilter;

      const matchesUbicacion = ubicacionFilter === 'todas'
        || (empresa.ubicacion ?? '') === ubicacionFilter;

      const matchesDisponibilidad = disponibilidadFilter === 'todos'
        || (disponibilidadFilter === 'con_cupos'
          ? (empresa.cupos_disponibles ?? 0) > 0
          : (empresa.cupos_disponibles ?? 0) === 0);

      return matchesSearch && matchesEstado && matchesUbicacion && matchesDisponibilidad;
    });
  }, [empresas, disponibilidadFilter, estadoFilter, searchQuery, ubicacionFilter]);

  const handleOpenEdit = (empresaId: string) => {
    const target = empresas.find((empresa) => empresa.id === empresaId);
    if (!target) return;
    setEditingId(target.id);
    setFormState(buildFormState(target));
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setEditingId(null);
    setFormState(null);
    setSaving(false);
    setSaveError(null);
  };

  const handleFieldChange = <Key extends keyof EditFormState>(field: Key, value: EditFormState[Key]) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!editingId || !formState) return;
    setSaving(true);
    setSaveError(null);

    const payload = {
      razon_social: formState.razon_social.trim(),
      direccion: formState.direccion.trim(),
      estado_convenio: formState.estado_convenio,
      ubicacion: parseStringOrNull(formState.ubicacion),
      cupos_disponibles: parseNumberOrNull(formState.cupos_disponibles),
      jefe_directo: formState.jefe_directo.trim(),
      cargo_jefe: formState.cargo_jefe.trim(),
      telefono: formState.telefono.trim(),
      email: formState.email.trim(),
      ultimo_contacto: parseStringOrNull(formState.ultimo_contacto),
    } as const;

    const { error: updateError } = await empresaService.update(editingId, payload);

    if (updateError) {
      setSaveError(updateError.message ?? 'No fue posible actualizar la empresa.');
      setSaving(false);
      return;
    }

    await refresh();
    handleCloseEdit();
  };

  return (
    <DashboardTemplate title="Gestión de empresas colaboradoras">
      <Stack spacing={4} sx={{ py: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Empresas colaboradoras
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona la información de las empresas asociadas, actualiza sus datos y monitorea
            el estado de los convenios y disponibilidad de cupos.
          </Typography>
        </Box>

        <Stack spacing={2} direction={{ xs: 'column', lg: 'row' }} alignItems={{ xs: 'stretch', lg: 'center' }}>
          <TextField
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por empresa, ubicación o contacto"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {ESTADO_FILTERS.map((estado) => (
              <Chip
                key={estado}
                label={estado === 'todos' ? 'Todos' : estadoLabels[estado]}
                clickable
                color={estadoFilter === estado && estado !== 'todos' ? buildEstadoVisuals(estado, theme).chipColor : 'default'}
                onClick={() => setEstadoFilter(estado)}
                variant={estadoFilter === estado ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="ubicacion-filter-label">Ubicación</InputLabel>
            <Select
              labelId="ubicacion-filter-label"
              label="Ubicación"
              value={ubicacionFilter}
              onChange={(event) => setUbicacionFilter(event.target.value)}
            >
              <MenuItem value="todas">Todas</MenuItem>
              {ubicaciones.map((ubicacion) => (
                <MenuItem key={ubicacion} value={ubicacion}>
                  {ubicacion}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="disponibilidad-filter-label">Disponibilidad</InputLabel>
            <Select
              labelId="disponibilidad-filter-label"
              label="Disponibilidad"
              value={disponibilidadFilter}
              onChange={(event) => setDisponibilidadFilter(event.target.value as DisponibilidadFilter)}
            >
              {DISPONIBILIDAD_FILTERS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Actualizar listado">
            <span>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  void refresh();
                }}
                disabled={loading}
              >
                Actualizar
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Cargando empresas...
            </Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredEmpresas.length === 0 ? (
          <Alert severity="info">No se encontraron empresas con los filtros seleccionados.</Alert>
        ) : (
          <List sx={{ width: '100%', bgcolor: 'transparent' }}>
            {filteredEmpresas.map((empresa) => {
              const estado = (empresa.estado_convenio ?? 'activo') as ConvenioEstado;
              const visuals = buildEstadoVisuals(estado, theme);
              const cuposDisponibles = empresa.cupos_disponibles ?? 0;

              return (
                <ListItem
                  key={empresa.id}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    bgcolor: visuals.background,
                    border: `1px solid ${visuals.border}`,
                    alignItems: 'flex-start',
                    px: 3,
                    py: 2,
                  }}
                  secondaryAction={
                    <Tooltip title="Editar empresa">
                      <IconButton edge="end" onClick={() => handleOpenEdit(empresa.id)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemAvatar>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BusinessIcon color="primary" />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                        <Typography variant="h6">{empresa.razon_social}</Typography>
                        <Chip label={estadoLabels[estado]} color={visuals.chipColor} size="small" sx={{ fontWeight: 600 }} />
                      </Stack>
                    }
                    secondary={
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={4}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {empresa.ubicacion ?? 'Ubicación no registrada'}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <HandshakeIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Contacto: {empresa.jefe_directo || 'No informado'}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PeopleAltIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Cupos disponibles: {cuposDisponibles}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" color="text.secondary">
                            Último contacto: {empresa.ultimo_contacto ?? 'No informado'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" color="text.secondary">
                            Teléfono: {empresa.telefono || 'No registrado'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" color="text.secondary">
                            Correo: {empresa.email || 'No registrado'}
                          </Typography>
                        </Grid>
                      </Grid>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Stack>

      <Dialog open={Boolean(editingId && formState)} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>Editar empresa</DialogTitle>
        <DialogContent>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Razón social"
              value={formState?.razon_social ?? ''}
              onChange={(event) => handleFieldChange('razon_social', event.target.value)}
            />
            <TextField
              label="Dirección"
              value={formState?.direccion ?? ''}
              onChange={(event) => handleFieldChange('direccion', event.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel id="estado-select-label">Estado del convenio</InputLabel>
              <Select
                labelId="estado-select-label"
                label="Estado del convenio"
                value={formState?.estado_convenio ?? 'activo'}
                onChange={(event) => handleFieldChange('estado_convenio', event.target.value as ConvenioEstado)}
              >
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="en_negociacion">En negociación</MenuItem>
                <MenuItem value="vencido">Vencido</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ubicación"
              value={formState?.ubicacion ?? ''}
              onChange={(event) => handleFieldChange('ubicacion', event.target.value)}
            />
            <TextField
              label="Cupos disponibles"
              type="number"
              value={formState?.cupos_disponibles ?? ''}
              onChange={(event) => handleFieldChange('cupos_disponibles', event.target.value)}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Contacto principal"
              value={formState?.jefe_directo ?? ''}
              onChange={(event) => handleFieldChange('jefe_directo', event.target.value)}
            />
            <TextField
              label="Cargo del contacto"
              value={formState?.cargo_jefe ?? ''}
              onChange={(event) => handleFieldChange('cargo_jefe', event.target.value)}
            />
            <TextField
              label="Teléfono"
              value={formState?.telefono ?? ''}
              onChange={(event) => handleFieldChange('telefono', event.target.value)}
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={formState?.email ?? ''}
              onChange={(event) => handleFieldChange('email', event.target.value)}
            />
            <TextField
              label="Último contacto"
              value={formState?.ultimo_contacto ?? ''}
              onChange={(event) => handleFieldChange('ultimo_contacto', event.target.value)}
              helperText="Puedes indicar una fecha o una nota breve"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardTemplate>
  );
};

export default CoordinadorEmpresas;
