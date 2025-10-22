import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import DashboardTemplate from '../components/DashboardTemplate';
import type { Empresa, EstadoConvenio } from '../data/empresas';
import { EMPRESAS, ESTADO_LABELS } from '../data/empresas';

const ESTADO_FILTER_OPTIONS: Array<{ value: EstadoConvenio | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'activo', label: 'Activo' },
  { value: 'en_negociacion', label: 'En negociación' },
  { value: 'vencido', label: 'Vencido' },
];

const DISPONIBILIDAD_FILTER_OPTIONS = [
  { value: 'todos', label: 'Todas las disponibilidades' },
  { value: 'con_cupos', label: 'Con cupos disponibles' },
  { value: 'sin_cupos', label: 'Sin cupos' },
] as const;

const getEstadoStyles = (estado: EstadoConvenio, palette: ReturnType<typeof useTheme>['palette']) => {
  switch (estado) {
    case 'activo':
      return {
        background: alpha(palette.success.main, 0.12),
        border: palette.success.main,
      };
    case 'en_negociacion':
      return {
        background: alpha(palette.warning.main, 0.12),
        border: palette.warning.main,
      };
    case 'vencido':
    default:
      return {
        background: alpha(palette.error.main, 0.12),
        border: palette.error.main,
      };
  }
};

type DisponibilidadFilter = typeof DISPONIBILIDAD_FILTER_OPTIONS[number]['value'];

type EstadoFilter = EstadoConvenio | 'todos';

const CoordinadorEmpresas = () => {
  const theme = useTheme();
  const [empresas, setEmpresas] = useState<Empresa[]>(EMPRESAS);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todos');
  const [disponibilidadFilter, setDisponibilidadFilter] = useState<DisponibilidadFilter>('todos');
  const [formValues, setFormValues] = useState<Empresa | null>(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredEmpresas = useMemo(() => {
    return empresas
      .filter((empresa) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [empresa.nombre, empresa.ubicacion].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          );

        const matchesEstado =
          estadoFilter === 'todos' ? true : empresa.estadoConvenio === estadoFilter;

        const matchesDisponibilidad =
          disponibilidadFilter === 'todos'
            ? true
            : disponibilidadFilter === 'con_cupos'
              ? empresa.cuposDisponibles > 0
              : empresa.cuposDisponibles === 0;

        return matchesSearch && matchesEstado && matchesDisponibilidad;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [empresas, estadoFilter, disponibilidadFilter, normalizedSearch]);

  const handleOpenEditDialog = (empresa: Empresa) => {
    setFormValues({ ...empresa });
  };

  const handleCloseDialog = () => {
    setFormValues(null);
  };

  const handleSaveEmpresa = () => {
    if (!formValues) return;
    setEmpresas((prev) => prev.map((empresa) => (empresa.id === formValues.id ? formValues : empresa)));
    handleCloseDialog();
  };

  const handleFieldChange = <Key extends keyof Empresa>(key: Key, value: Empresa[Key]) => {
    setFormValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <DashboardTemplate title="Relación con empresas">
      <Stack spacing={4} sx={{ py: 6 }}>
        <Box textAlign="center">
          <Typography variant="h4" component="h1" gutterBottom>
            Empresas colaboradoras
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona el estado de los convenios, la disponibilidad de cupos y mantén
            actualizada la información clave para los estudiantes.
          </Typography>
        </Box>

        <Paper elevation={1} sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Buscar"
                placeholder="Buscar por nombre o ubicación"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="estadoFilterLabel">Estado del convenio</InputLabel>
                <Select
                  labelId="estadoFilterLabel"
                  label="Estado del convenio"
                  value={estadoFilter}
                  onChange={(event) => setEstadoFilter(event.target.value as EstadoFilter)}
                >
                  {ESTADO_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="disponibilidadFilterLabel">Disponibilidad</InputLabel>
                <Select
                  labelId="disponibilidadFilterLabel"
                  label="Disponibilidad"
                  value={disponibilidadFilter}
                  onChange={(event) =>
                    setDisponibilidadFilter(event.target.value as DisponibilidadFilter)
                  }
                >
                  {DISPONIBILIDAD_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Stack spacing={2}>
          <Typography variant="subtitle1" color="text.secondary">
            Mostrando {filteredEmpresas.length} de {empresas.length} empresas registradas
          </Typography>

          {filteredEmpresas.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
              No se encontraron empresas con los filtros seleccionados.
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                    <TableCell sx={{ fontWeight: 600 }}>Empresa</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ubicación</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Cupos disponibles</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Último contacto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmpresas.map((empresa) => {
                    const estadoStyles = getEstadoStyles(empresa.estadoConvenio, theme.palette);
                    return (
                      <TableRow
                        key={empresa.id}
                        sx={{
                          position: 'relative',
                          backgroundColor: estadoStyles.background,
                          '&:before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: 6,
                            backgroundColor: estadoStyles.border,
                          },
                          '&:last-of-type td, &:last-of-type th': { border: 0 },
                        }}
                      >
                        <TableCell scope="row" sx={{ pl: 3 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <BusinessIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {empresa.nombre}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.primary">
                              {empresa.ubicacion}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <HandshakeIcon fontSize="small" color="action" />
                            <Chip
                              label={ESTADO_LABELS[empresa.estadoConvenio]}
                              color={
                                empresa.estadoConvenio === 'activo'
                                  ? 'success'
                                  : empresa.estadoConvenio === 'vencido'
                                    ? 'error'
                                    : 'warning'
                              }
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PeopleIcon fontSize="small" color="action" />
                            <Chip
                              label={empresa.cuposDisponibles}
                              color={empresa.cuposDisponibles > 0 ? 'primary' : 'default'}
                              size="small"
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {empresa.ultimoContacto}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ pr: 3 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenEditDialog(empresa)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </Stack>

      <Dialog open={Boolean(formValues)} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Editar empresa</DialogTitle>
        {formValues && (
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nombre"
              value={formValues.nombre}
              onChange={(event) => handleFieldChange('nombre', event.target.value)}
              fullWidth
            />
            <TextField
              label="Ubicación"
              value={formValues.ubicacion}
              onChange={(event) => handleFieldChange('ubicacion', event.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="estadoConvenioLabel">Estado del convenio</InputLabel>
              <Select
                labelId="estadoConvenioLabel"
                label="Estado del convenio"
                value={formValues.estadoConvenio}
                onChange={(event) =>
                  handleFieldChange('estadoConvenio', event.target.value as EstadoConvenio)
                }
              >
                {ESTADO_FILTER_OPTIONS.filter((option) => option.value !== 'todos').map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Cupos disponibles"
              inputProps={{ min: 0 }}
              value={formValues.cuposDisponibles}
              onChange={(event) =>
                handleFieldChange('cuposDisponibles', Number(event.target.value) || 0)
              }
            />
            <TextField
              label="Último contacto"
              value={formValues.ultimoContacto}
              onChange={(event) => handleFieldChange('ultimoContacto', event.target.value)}
              fullWidth
            />
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleSaveEmpresa} variant="contained">
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardTemplate>
  );
};

export default CoordinadorEmpresas;
