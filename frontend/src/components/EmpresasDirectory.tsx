import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  Grow,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SearchIcon from '@mui/icons-material/Search';
import type { Empresa } from '../types/database';
import { empresaService } from '../services/empresaService';
import { useTheme } from '@mui/material/styles';

export interface EmpresasDirectoryProps {
  title: string;
  description: string;
  canManage?: boolean;
}

type SortOption = 'name-asc' | 'name-desc' | 'created-desc' | 'created-asc';

const normalizeString = (value?: string | null) => value?.toLowerCase() ?? '';

const formatDate = (value?: string | null) => {
  if (!value) return 'Fecha no disponible';
  try {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (_error) {
    return value;
  }
};

export const EmpresasDirectory = ({ title, description, canManage = false }: EmpresasDirectoryProps) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [emailFilter, setEmailFilter] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    let active = true;

    const fetchEmpresas = async () => {
      setLoading(true);
      const { data, error: fetchError } = await empresaService.getAll();
      if (!active) return;

      if (fetchError) {
        setError(fetchError.message ?? 'No fue posible cargar las empresas');
        setEmpresas([]);
      } else {
        setEmpresas(data ?? []);
        setError(null);
      }
      setLoading(false);
    };

    fetchEmpresas();

    return () => {
      active = false;
    };
  }, []);

  const locations = useMemo(() => {
    const unique = new Set<string>();
    empresas.forEach((empresa) => {
      if (empresa.direccion) {
        unique.add(empresa.direccion);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [empresas]);

  const contacts = useMemo(() => {
    const unique = new Set<string>();
    empresas.forEach((empresa) => {
      if (empresa.jefe_directo) {
        unique.add(empresa.jefe_directo);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [empresas]);

  const emails = useMemo(() => {
    const unique = new Set<string>();
    empresas.forEach((empresa) => {
      if (empresa.email) {
        unique.add(empresa.email);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [empresas]);

  const filteredEmpresas = useMemo(() => {
    const normalizedTerm = normalizeString(searchTerm);

    const filtered = empresas.filter((empresa) => {
      const matchesSearch =
        !normalizedTerm ||
        normalizeString(empresa.razon_social).includes(normalizedTerm) ||
        normalizeString(empresa.direccion).includes(normalizedTerm) ||
        normalizeString(empresa.jefe_directo).includes(normalizedTerm) ||
        normalizeString(empresa.email).includes(normalizedTerm);

      const matchesLocation =
        locationFilter === 'all' || normalizeString(empresa.direccion) === normalizeString(locationFilter);
      const matchesContact =
        contactFilter === 'all' || normalizeString(empresa.jefe_directo) === normalizeString(contactFilter);
      const matchesEmail = emailFilter === 'all' || normalizeString(empresa.email) === normalizeString(emailFilter);

      return matchesSearch && matchesLocation && matchesContact && matchesEmail;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name-desc':
          return a.razon_social.localeCompare(b.razon_social) * -1;
        case 'created-desc': {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        }
        case 'created-asc': {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        }
        case 'name-asc':
        default:
          return a.razon_social.localeCompare(b.razon_social);
      }
    });

    return sorted;
  }, [empresas, searchTerm, locationFilter, contactFilter, emailFilter, sortOption]);

  return (
    <Stack spacing={4} sx={{ py: 6 }}>
      <Box textAlign="center">
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <TextField
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar empresa, ubicación o contacto"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl fullWidth>
          <InputLabel id="filter-ubicacion-label">Ubicación</InputLabel>
          <Select
            labelId="filter-ubicacion-label"
            value={locationFilter}
            label="Ubicación"
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            <MenuItem value="all">Todas</MenuItem>
            {locations.map((location) => (
              <MenuItem key={location} value={location}>
                {location}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="filter-usuario-label">Usuario</InputLabel>
          <Select
            labelId="filter-usuario-label"
            value={contactFilter}
            label="Usuario"
            onChange={(event) => setContactFilter(event.target.value)}
          >
            <MenuItem value="all">Todos</MenuItem>
            {contacts.map((contact) => (
              <MenuItem key={contact} value={contact}>
                {contact}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="filter-email-label">Correo</InputLabel>
          <Select
            labelId="filter-email-label"
            value={emailFilter}
            label="Correo"
            onChange={(event) => setEmailFilter(event.target.value)}
          >
            <MenuItem value="all">Todos</MenuItem>
            {emails.map((email) => (
              <MenuItem key={email} value={email}>
                {email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="sort-label">Ordenar por</InputLabel>
          <Select
            labelId="sort-label"
            value={sortOption}
            label="Ordenar por"
            onChange={(event) => setSortOption(event.target.value as SortOption)}
          >
            <MenuItem value="name-asc">Orden alfabético (A-Z)</MenuItem>
            <MenuItem value="name-desc">Orden alfabético (Z-A)</MenuItem>
            <MenuItem value="created-desc">Fecha de creación (recientes)</MenuItem>
            <MenuItem value="created-asc">Fecha de creación (antiguas)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box textAlign="center" py={6}>
          <Typography color="error" variant="body1">
            {error}
          </Typography>
        </Box>
      ) : filteredEmpresas.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography variant="body1" color="text.secondary">
            No se encontraron empresas con los filtros seleccionados.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredEmpresas.map((empresa, index) => (
            <Grid item xs={12} sm={6} md={4} key={empresa.id}>
              <Grow in style={{ transformOrigin: '0 0 0' }} timeout={300 + index * 40}>
                <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent>
                    <Stack spacing={2} sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <BusinessIcon color="primary" />
                        <Typography variant="h6">{empresa.razon_social}</Typography>
                      </Stack>

                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <LocationOnIcon color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {empresa.direccion || 'Dirección no registrada'}
                        </Typography>
                      </Stack>

                      <Divider flexItem sx={{ my: 1 }} />

                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <PersonIcon color="action" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Contacto principal
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {empresa.jefe_directo || 'Sin asignar'}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <EmailIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {empresa.email || 'Correo no disponible'}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <LocalPhoneIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {empresa.telefono || 'Teléfono no disponible'}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarTodayIcon color="action" fontSize="small" />
                          <Typography variant="caption" color="text.secondary">
                            Registrada el {formatDate(empresa.created_at)}
                          </Typography>
                        </Stack>
                        {canManage && (
                          <Chip
                            label="Gestionar"
                            color="primary"
                            variant="outlined"
                            size={isSmallScreen ? 'small' : 'medium'}
                          />
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grow>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
};

export default EmpresasDirectory;
