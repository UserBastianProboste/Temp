import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  InputAdornment,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PeopleIcon from '@mui/icons-material/People';
import DashboardTemplate from '../components/DashboardTemplate';
import type { EstadoConvenio } from '../data/empresas';
import { EMPRESAS, ESTADO_LABELS } from '../data/empresas';

type EstadoFilter = EstadoConvenio | 'todos';

type EstadoStyles = {
  background: string;
  border: string;
};

const getEstadoStyles = (
  estado: EstadoConvenio,
  palette: ReturnType<typeof useTheme>['palette'],
): EstadoStyles => {
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

const EstudianteEmpresas = () => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todos');

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredEmpresas = useMemo(() => {
    return EMPRESAS.filter((empresa) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [empresa.nombre, empresa.ubicacion].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      const matchesEstado =
        estadoFilter === 'todos' ? true : empresa.estadoConvenio === estadoFilter;

      return matchesSearch && matchesEstado;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [estadoFilter, normalizedSearch]);

  const handleEstadoChange = (_event: React.MouseEvent<HTMLElement>, value: EstadoFilter | null) => {
    if (value !== null) {
      setEstadoFilter(value);
    }
  };

  return (
    <DashboardTemplate title="Empresas disponibles">
      <Stack spacing={4} sx={{ py: 6 }}>
        <Box textAlign="center">
          <Typography variant="h4" component="h1" gutterBottom>
            Explora empresas colaboradoras
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Consulta el estado de los convenios, revisa la disponibilidad de cupos y
            encuentra oportunidades acordes a tus intereses.
          </Typography>
        </Box>

        <Stack spacing={2}>
          <TextField
            label="Buscar"
            placeholder="Busca por nombre o ubicación"
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

          <ToggleButtonGroup
            color="primary"
            exclusive
            value={estadoFilter}
            onChange={handleEstadoChange}
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            <ToggleButton value="todos">Todos</ToggleButton>
            <ToggleButton value="activo">Activas</ToggleButton>
            <ToggleButton value="en_negociacion">En negociación</ToggleButton>
            <ToggleButton value="vencido">Vencidas</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Typography variant="subtitle1" color="text.secondary">
          {filteredEmpresas.length === EMPRESAS.length
            ? `Mostrando todas las ${filteredEmpresas.length} empresas registradas`
            : `Mostrando ${filteredEmpresas.length} de ${EMPRESAS.length} empresas`}
        </Typography>

        {filteredEmpresas.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
            No hay empresas que coincidan con tu búsqueda.
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredEmpresas.map((empresa) => {
              const estadoStyles = getEstadoStyles(empresa.estadoConvenio, theme.palette);
              return (
                <Grid key={empresa.id} item xs={12} sm={6} lg={4}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      borderRadius: 2,
                      borderLeft: `6px solid ${estadoStyles.border}`,
                      backgroundColor: estadoStyles.background,
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <BusinessIcon color="primary" />
                          <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                            {empresa.nombre}
                          </Typography>
                        </Stack>

                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {empresa.ubicacion}
                            </Typography>
                          </Stack>
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
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PeopleIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Cupos disponibles:
                            </Typography>
                            <Chip
                              label={empresa.cuposDisponibles}
                              color={empresa.cuposDisponibles > 0 ? 'primary' : 'default'}
                              size="small"
                            />
                          </Stack>
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          Último contacto: {empresa.ultimoContacto}
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
};

export default EstudianteEmpresas;
