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
  Fade,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import Grow from '@mui/material/Grow';
import {
  Business as BusinessIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  FilterAlt as FilterAltIcon,
  FilterList as FilterListIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  Work as WorkIcon,
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

type SortOption = 'alphabetical-asc' | 'alphabetical-desc' | 'creation-newest' | 'creation-oldest';

interface EmpresaFilters {
  location: string;
  user: string;
  email: string;
  role: string;
  phone: string;
}

const emptyFormState: EmpresaFormState = {
  razon_social: '',
  direccion: '',
  jefe_directo: '',
  cargo_jefe: '',
  telefono: '',
  email: '',
};

const INITIAL_FILTERS: EmpresaFilters = {
  location: 'all',
  user: 'all',
  email: 'all',
  role: 'all',
  phone: 'all',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EmpresaFilters>({ ...INITIAL_FILTERS });
  const [sortOption, setSortOption] = useState<SortOption>('alphabetical-asc');

  const [editTarget, setEditTarget] = useState<Empresa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [formValues, setFormValues] = useState<EmpresaFormState>(emptyFormState);
  const [formErrors, setFormErrors] = useState<EmpresaFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'success' });

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

  const normalizeText = (value: string | null | undefined) =>
    value
      ? value
          .toString()
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      : '';

  const availableFilters = useMemo(() => {
    const collect = (key: keyof Empresa) => {
      const unique = new Set<string>();
      empresas.forEach((empresa) => {
        const rawValue = empresa[key];
        if (typeof rawValue === 'string' && rawValue.trim()) {
          unique.add(rawValue.trim());
        }
      });
      return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    };

    return {
      locations: collect('direccion'),
      users: collect('jefe_directo'),
      emails: collect('email'),
      roles: collect('cargo_jefe'),
      phones: collect('telefono'),
    };
  }, [empresas]);

  const filteredEmpresas = useMemo(() => {
    const query = normalizeText(searchQuery);

    return empresas.filter((empresa) => {
      const matchesSearch =
        query.length === 0 ||
        [
          empresa.razon_social,
          empresa.direccion,
          empresa.jefe_directo,
          empresa.cargo_jefe,
          empresa.telefono,
          empresa.email,
        ]
          .map((value) => normalizeText(value))
          .some((value) => value.includes(query));

      const matchesLocation =
        filters.location === 'all'
          ? true
          : filters.location === 'missing'
          ? !empresa.direccion
          : normalizeText(empresa.direccion) === normalizeText(filters.location);

      const matchesUser =
        filters.user === 'all'
          ? true
          : filters.user === 'missing'
          ? !empresa.jefe_directo
          : normalizeText(empresa.jefe_directo) === normalizeText(filters.user);

      const matchesEmail =
        filters.email === 'all'
          ? true
          : filters.email === 'missing'
          ? !empresa.email
          : normalizeText(empresa.email) === normalizeText(filters.email);

      const matchesRole =
        filters.role === 'all'
          ? true
          : filters.role === 'missing'
          ? !empresa.cargo_jefe
          : normalizeText(empresa.cargo_jefe) === normalizeText(filters.role);

      const matchesPhone =
        filters.phone === 'all'
          ? true
          : filters.phone === 'missing'
          ? !empresa.telefono
          : normalizeText(empresa.telefono) === normalizeText(filters.phone);

      return (
        matchesSearch && matchesLocation && matchesUser && matchesEmail && matchesRole && matchesPhone
      );
    });
  }, [empresas, filters.email, filters.location, filters.phone, filters.role, filters.user, searchQuery]);

  const sortedEmpresas = useMemo(() => {
    const sorted = [...filteredEmpresas];
    switch (sortOption) {
      case 'alphabetical-desc':
        sorted.sort((a, b) => b.razon_social.localeCompare(a.razon_social, 'es', { sensitivity: 'base' }));
        break;
      case 'creation-newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'creation-oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'alphabetical-asc':
      default:
        sorted.sort((a, b) => a.razon_social.localeCompare(b.razon_social, 'es', { sensitivity: 'base' }));
        break;
    }
    return sorted;
  }, [filteredEmpresas, sortOption]);

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
    () => buildBalancedColumns(sortedEmpresas, columnCount),
    [sortedEmpresas, columnCount],
  );

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        searchQuery.trim() ||
          filters.location !== 'all' ||
          filters.user !== 'all' ||
          filters.email !== 'all' ||
          filters.role !== 'all' ||
          filters.phone !== 'all',
      ),
    [filters.email, filters.location, filters.phone, filters.role, filters.user, searchQuery],
  );

  const selectedEmpresa = useMemo(
    () => empresas.find((empresa) => empresa.id === selectedEmpresaId) ?? null,
    [empresas, selectedEmpresaId],
  );

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (field: keyof EmpresaFilters) => (value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({ ...INITIAL_FILTERS });
    setSortOption('alphabetical-asc');
  };

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
              Consulta el listado actualizado de organizaciones disponibles para prácticas.{' '}
              {isCoordinator
                ? 'Como coordinador puedes mantener la información al día.'
                : 'Como estudiante selecciona la opción que se ajuste a tus intereses.'}
            </Typography>
          </Box>

          <Fade in={!loading && !error && empresas.length > 0} mountOnEnter unmountOnExit timeout={400}>
            <Box
              sx={{
                borderRadius: 3,
                p: { xs: 2, md: 3 },
                backgroundColor: 'background.paper',
                boxShadow: { xs: 1, md: 3 },
                border: '1px solid',
                borderColor: 'divider',
                transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                '&:hover': {
                  boxShadow: { xs: 2, md: 6 },
                  transform: { md: 'translateY(-2px)' },
                },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <FilterListIcon color="primary" />
                <Typography variant="h6" component="h2">
                  Busca y filtra empresas
                </Typography>
              </Stack>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={{ xs: 2, md: 3 }}
                useFlexGap
                flexWrap="wrap"
                alignItems="stretch"
              >
                <TextField
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Buscar por nombre, ubicación o contacto"
                  label="Buscar"
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: { xs: '1 1 100%', md: '2 1 320px' },
                    minWidth: { md: 260 },
                  }}
                />

                <TextField
                  select
                  fullWidth
                  label="Ubicación"
                  value={filters.location}
                  onChange={(event) => handleFilterChange('location')(event.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value="missing">Sin registro</MenuItem>
                  {availableFilters.locations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Usuario"
                  value={filters.user}
                  onChange={(event) => handleFilterChange('user')(event.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="missing">Sin registro</MenuItem>
                  {availableFilters.users.map((user) => (
                    <MenuItem key={user} value={user}>
                      {user}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Correo electrónico"
                  value={filters.email}
                  onChange={(event) => handleFilterChange('email')(event.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px' } }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="missing">Sin registro</MenuItem>
                  {availableFilters.emails.map((email) => (
                    <MenuItem key={email} value={email}>
                      {email}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Cargo de contacto"
                  value={filters.role}
                  onChange={(event) => handleFilterChange('role')(event.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterAltIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px' } }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="missing">Sin registro</MenuItem>
                  {availableFilters.roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Teléfono"
                  value={filters.phone}
                  onChange={(event) => handleFilterChange('phone')(event.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="missing">Sin registro</MenuItem>
                  {availableFilters.phones.map((phone) => (
                    <MenuItem key={phone} value={phone}>
                      {phone}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Ordenar por"
                  value={sortOption}
                  onChange={(event) => handleSortChange(event.target.value as SortOption)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterAltIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px' } }}
                >
                  <MenuItem value="alphabetical-asc">Alfabético (A-Z)</MenuItem>
                  <MenuItem value="alphabetical-desc">Alfabético (Z-A)</MenuItem>
                  <MenuItem value="creation-newest">Fecha de creación (recientes primero)</MenuItem>
                  <MenuItem value="creation-oldest">Fecha de creación (antiguas primero)</MenuItem>
                </TextField>
              </Stack>

              {(hasActiveFilters || selectedEmpresa) && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                  {hasActiveFilters && (
                    <Button variant="text" onClick={handleClearFilters} startIcon={<FilterAltIcon />}>
                      Limpiar filtros
                    </Button>
                  )}
                  {selectedEmpresa && (
                    <Alert
                      icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                      severity="info"
                      sx={{ borderRadius: 2, flex: 1 }}
                      action={
                        <Button color="inherit" size="small" onClick={() => setSelectedEmpresaId(null)}>
                          Quitar selección
                        </Button>
                      }
                    >
                      Has seleccionado <strong>{selectedEmpresa.razon_social}</strong> como referencia.
                    </Alert>
                  )}
                </Stack>
              )}
            </Box>
          </Fade>

          {error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void loadEmpresas()}>
                  Reintentar
                </Button>
              }
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
              Aún no hay empresas registradas.{' '}
              {isCoordinator
                ? 'Cuando registres una nueva empresa aparecerá aquí.'
                : 'Consulta más tarde o comunica a tu coordinador.'}
            </Alert>
          ) : !error && sortedEmpresas.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No encontramos coincidencias con la búsqueda o los filtros seleccionados. Ajusta los
              criterios e inténtalo nuevamente.
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
                  {column.map((empresa, itemIndex) => {
                    const isSelected = selectedEmpresaId === empresa.id;
                    const animationDelay = Math.min((columnIndex * 4 + itemIndex) * 60, 360);

                    return (
                      <Grow
                        in
                        key={empresa.id}
                        timeout={300}
                        style={{ transformOrigin: 'top center', transitionDelay: `${animationDelay}ms` }}
                        unmountOnExit
                      >
                        <Card
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
                            avatar={
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <BusinessIcon />
                              </Avatar>
                            }
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
                                    <Button
                                      color="primary"
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleEditOpen(empresa)}
                                      startIcon={<EditIcon fontSize="small" />}
                                    >
                                      Editar
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Eliminar">
                                    <Button
                                      color="error"
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleDeleteOpen(empresa)}
                                      startIcon={<DeleteIcon fontSize="small" />}
                                    >
                                      Eliminar
                                    </Button>
                                  </Tooltip>
                                </Stack>
                              )}
                            </Stack>
                          </CardActions>
                        </Card>
                      </Grow>
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
