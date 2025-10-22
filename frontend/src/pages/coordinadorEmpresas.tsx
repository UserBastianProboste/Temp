import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DashboardTemplate from '../components/DashboardTemplate';

type Empresa = {
  nombre: string;
  ubicacion: string;
  estadoConvenio: 'activo' | 'en_negociacion' | 'vencido';
  cuposDisponibles: number;
  ultimoContacto: string;
};

const EMPRESAS: Empresa[] = [
  {
    nombre: 'InnovaTech Solutions',
    ubicacion: 'Santiago, Región Metropolitana',
    estadoConvenio: 'activo',
    cuposDisponibles: 6,
    ultimoContacto: 'Hace 3 días',
  },
  {
    nombre: 'BioAndes Research',
    ubicacion: 'Talca, Región del Maule',
    estadoConvenio: 'en_negociacion',
    cuposDisponibles: 2,
    ultimoContacto: 'Hace 1 semana',
  },
  {
    nombre: 'Patagonia Logistics',
    ubicacion: 'Puerto Montt, Región de Los Lagos',
    estadoConvenio: 'vencido',
    cuposDisponibles: 0,
    ultimoContacto: 'Hace 2 meses',
  },
  {
    nombre: 'NorteMin Mining',
    ubicacion: 'Calama, Región de Antofagasta',
    estadoConvenio: 'activo',
    cuposDisponibles: 4,
    ultimoContacto: 'Hace 5 días',
  },
  {
    nombre: 'Solaris Energy',
    ubicacion: 'La Serena, Región de Coquimbo',
    estadoConvenio: 'en_negociacion',
    cuposDisponibles: 3,
    ultimoContacto: 'Hace 2 semanas',
  },
  {
    nombre: 'AndesSoft',
    ubicacion: 'Temuco, Región de La Araucanía',
    estadoConvenio: 'activo',
    cuposDisponibles: 5,
    ultimoContacto: 'Ayer',
  },
  {
    nombre: 'GreenFields Agro',
    ubicacion: 'Curicó, Región del Maule',
    estadoConvenio: 'vencido',
    cuposDisponibles: 0,
    ultimoContacto: 'Hace 3 meses',
  },
  {
    nombre: 'Andes Health',
    ubicacion: 'Rancagua, Región de O’Higgins',
    estadoConvenio: 'activo',
    cuposDisponibles: 2,
    ultimoContacto: 'Hace 4 días',
  },
  {
    nombre: 'Pacífico Digital',
    ubicacion: 'Iquique, Región de Tarapacá',
    estadoConvenio: 'en_negociacion',
    cuposDisponibles: 1,
    ultimoContacto: 'Hace 2 semanas',
  },
];

const getEstadoColor = (estado: Empresa['estadoConvenio']) => {
  switch (estado) {
    case 'activo':
      return 'success';
    case 'en_negociacion':
      return 'warning';
    case 'vencido':
      return 'error';
    default:
      return 'default';
  }
};

const buildBalancedColumns = (items: Empresa[], columnCount: number) => {
  if (columnCount <= 0) {
    return [items];
  }

  const baseSize = Math.floor(items.length / columnCount);
  const remainder = items.length % columnCount;

  const columns: Empresa[][] = [];
  let startIndex = 0;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const extra = columnIndex < remainder ? 1 : 0;
    const endIndex = startIndex + baseSize + extra;
    columns.push(items.slice(startIndex, endIndex));
    startIndex = endIndex;
  }

  return columns.filter((column) => column.length > 0);
};

const CoordinadorEmpresas = () => {
  const columns = useMemo(() => buildBalancedColumns(EMPRESAS, 3), []);

  return (
    <DashboardTemplate title="Relación con empresas">
      <Stack spacing={4} sx={{ py: 6 }}>
        <Box textAlign="center">
          <Typography variant="h4" component="h1" gutterBottom>
            Empresas colaboradoras
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visualiza el estado de los convenios y la disponibilidad de cupos para
            nuevas prácticas profesionales.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {columns.map((column, columnIndex) => (
            <Grid item xs={12} md={4} key={`col-${columnIndex}`}>
              <Stack spacing={3}>
                {column.map((empresa) => (
                  <Card key={empresa.nombre} elevation={2}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <BusinessIcon color="primary" />
                          <Typography variant="h6">{empresa.nombre}</Typography>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <LocationOnIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {empresa.ubicacion}
                          </Typography>
                        </Stack>

                        <Divider />

                        <Stack direction="row" spacing={1} alignItems="center">
                          <HandshakeIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            Estado convenio:
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              empresa.estadoConvenio === 'en_negociacion'
                                ? 'En negociación'
                                : empresa.estadoConvenio === 'vencido'
                                  ? 'Vencido'
                                  : 'Activo'
                            }
                            color={getEstadoColor(empresa.estadoConvenio)}
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Cupos disponibles:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {empresa.cuposDisponibles}
                          </Typography>
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          Último contacto: {empresa.ultimoContacto}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </DashboardTemplate>
  );
};

export default CoordinadorEmpresas;
