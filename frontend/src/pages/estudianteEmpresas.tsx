import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { alpha, useTheme } from '@mui/material/styles';
import DashboardTemplate from '../components/DashboardTemplate';
import { estadoLabels, useEmpresas } from '../hooks/useEmpresas';
import type { ConvenioEstado, EmpresaWithMetadata } from '../hooks/useEmpresas';

const ESTADO_FILTERS: (ConvenioEstado | 'todos')[] = ['todos', 'activo', 'en_negociacion', 'vencido'];

type EstadoVisuals = {
  background: string;
  border: string;
  chipColor: 'success' | 'warning' | 'error';
};

const buildEstadoVisuals = (estado: ConvenioEstado, theme: ReturnType<typeof useTheme>): EstadoVisuals => {
  switch (estado) {
    case 'activo':
      return {
        background: alpha(theme.palette.success.light, 0.25),
        border: alpha(theme.palette.success.main, 0.6),
        chipColor: 'success',
      };
    case 'en_negociacion':
      return {
        background: alpha(theme.palette.warning.light, 0.25),
        border: alpha(theme.palette.warning.main, 0.6),
        chipColor: 'warning',
      };
    case 'vencido':
    default:
      return {
        background: alpha(theme.palette.error.light, 0.25),
        border: alpha(theme.palette.error.main, 0.6),
        chipColor: 'error',
      };
  }
};

const normalizeText = (value?: string | null) => value?.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') ?? '';

const getUbicacionLabel = (empresa: EmpresaWithMetadata) => empresa.ubicacion ?? 'Ubicación no registrada';

export default function EstudianteEmpresas() {
  const theme = useTheme();
  const { empresas, loading, error } = useEmpresas();
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<(ConvenioEstado | 'todos')>('todos');
  const [ubicacionFilter, setUbicacionFilter] = useState('todas');

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

      return matchesSearch && matchesEstado && matchesUbicacion;
    });
  }, [empresas, estadoFilter, searchQuery, ubicacionFilter]);

  return (
    <DashboardTemplate title="Empresas colaboradoras">
      <Stack spacing={4} sx={{ py: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Empresas disponibles para práctica
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Explora las empresas con convenio activo o en gestión. Puedes buscar por nombre,
            ubicación o persona de contacto.
          </Typography>
        </Box>

        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre, ubicación o contacto"
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

          <FormControl sx={{ minWidth: 200 }}>
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
          <Alert severity="info">No se encontraron empresas que coincidan con tu búsqueda.</Alert>
        ) : (
          <Grid container spacing={3}>
            {filteredEmpresas.map((empresa) => {
              const estado = (empresa.estado_convenio ?? 'activo') as ConvenioEstado;
              const visuals = buildEstadoVisuals(estado, theme);

              return (
                <Grid item xs={12} md={6} lg={4} key={empresa.id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${visuals.border}`,
                      backgroundColor: visuals.background,
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <BusinessIcon color="primary" />
                          <Typography variant="h6">{empresa.razon_social}</Typography>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <LocationOnIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {getUbicacionLabel(empresa)}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <HandshakeIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            Estado convenio:
                          </Typography>
                          <Chip label={estadoLabels[estado]} color={visuals.chipColor} size="small" sx={{ fontWeight: 600 }} />
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <PeopleAltIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            Cupos disponibles:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {empresa.cupos_disponibles ?? 'Por confirmar'}
                          </Typography>
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          Último contacto: {empresa.ultimo_contacto ?? 'No informado'}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Stack>
    </DashboardTemplate>
  );
}
