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
  Divider,
  IconButton,
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
import Fade from '@mui/material/Fade';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { SelectChangeEvent } from '@mui/material/Select';
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
type FilterValue = 'all' | 'missing' | string;

interface EmpresaFilters {
  location: FilterValue;
  user: FilterValue;
  email: FilterValue;
  role: FilterValue;
  phone: FilterValue;
}

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

const normalizeText = (value: string | null | undefined) =>
  value
    ? value
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    : '';

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
  const [filters, setFilters] = useState<EmpresaFilters>({
    location: 'all',
    user: 'all',
    email: 'all',
    role: 'all',
    phone: 'all',
  });
  const [sortOption, setSortOption] = useState<SortOption>('alphabetical-asc');

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

  const availableFilters = useMemo(() => {
    const createOptions = (key: keyof Empresa) => {
      const values = new Set<string>();
      let hasMissing = false;

      empresas.forEach((empresa) => {
        const rawValue = empresa[key];
        if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
          values.add(rawValue.trim());
        } else {
          hasMissing = true;
        }
      });

      const sortedValues = Array.from(values).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' }),
      );

      return hasMissing ? [...sortedValues, 'missing'] : sortedValues;
    };

    return {
      locations: createOptions('direccion'),
      users: createOptions('jefe_directo'),
      emails: createOptions('email'),
      roles: createOptions('cargo_jefe'),
      phones: createOptions('telefono'),
    };
  }, [empresas]);

  const selectedEmpresa = useMemo(
    () => empresas.find((empresa) => empresa.id === selectedEmpresaId) ?? null,
    [empresas, selectedEmpresaId],
  );

  const filteredEmpresas = useMemo(() => {
    const query = normalizeText(searchQuery);

    const matchesFilterValue = (value: string | null, filterValue: FilterValue) => {
      if (filterValue === 'all') {
        return true;
      }
      if (filterValue === 'missing') {
        return !value || value.trim().length === 0;
      }
      return normalizeText(value) === normalizeText(filterValue);
    };

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

      const matchesLocation = matchesFilterValue(empresa.direccion, filters.location);
      const matchesUser = matchesFilterValue(empresa.jefe_directo, filters.user);
      const matchesEmail = matchesFilterValue(empresa.email, filters.email);
      const matchesRole = matchesFilterValue(empresa.cargo_jefe, filters.role);
      const matchesPhone = matchesFilterValue(empresa.telefono, filters.phone);

      return (
        matchesSearch &&
        matchesLocation &&
        matchesUser &&
        matchesEmail &&
        matchesRole &&
        matchesPhone
      );
    });
  }, [empresas, filters, searchQuery]);

  const sortedEmpresas = useMemo(() => {
    const sorted = [...filteredEmpresas];

    sorted.sort((a, b) => {
      switch (sortOption) {
        case 'alphabetical-desc':
          return b.razon_social.localeCompare(a.razon_social, 'es', { sensitivity: 'base' });
        case 'creation-newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'creation-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alphabetical-asc':
        default:
          return a.razon_social.localeCompare(b.razon_social, 'es', { sensitivity: 'base' });
      }
    });

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
    [filters, searchQuery],
  );

  const handleSelect = (empresaId: string) => {
    setSelectedEmpresaId((current) => (current === empresaId ? null : empresaId));
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (field: keyof EmpresaFilters) => (event: SelectChangeEvent<FilterValue>) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value as FilterValue }));
  };

  const handleSortChange = (event: SelectChangeEvent<SortOption>) => {
    setSortOption(event.target.value as SortOption);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({ location: 'all', user: 'all', email: 'all', role: 'all', phone: 'all' });
    setSortOption('alphabetical-asc');
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
      handleEditClose();
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
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      const { error: deleteError } = await empresaService.delete(deleteTarget.id);
      if (deleteError) {
        throw new Error(deleteError.message ?? 'No se pudo eliminar la empresa.');
      }

      setEmpresas((prev) => prev.filter((empresa) => empresa.id !== deleteTarget.id));
      if (selectedEmpresaId === deleteTarget.id) {
        setSelectedEmpresaId(null);
      }

      showSnackbar('Empresa eliminada correctamente.', 'success');
      handleDeleteClose();
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

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <DashboardTemplate title="Empresas colaboradoras">
      <Box component="section" sx={{ py: 4 }}>
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={600}>
              Explorador de empresas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Encuentra rápidamente la empresa ideal utilizando la búsqueda instantánea, filtros
              dinámicos y opciones de ordenamiento.
            </Typography>
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

          {!loading && !error && empresas.length > 0 && (
            <Fade in timeout={300}>
              <Stack
                spacing={3}
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: (themeInstance) => themeInstance.palette.background.paper,
                  boxShadow: 2,
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                  <TextField
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Buscar por nombre, contacto o datos de la empresa"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {hasActiveFilters && (
                    <Button color="inherit" onClick={handleClearFilters} sx={{ alignSelf: { xs: 'flex-end', md: 'center' } }}>
                      Limpiar filtros
                    </Button>
                  )}
                </Stack>

                <Divider textAlign="left" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FilterListIcon fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      Filtros y ordenamiento
                    </Typography>
                  </Stack>
                </Divider>

                <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                  <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ flex: 1 }}>
                    <TextField
                      select
                      fullWidth
                      label="Ubicación"
                      value={filters.location}
                      onChange={(event) => handleFilterChange('location')(event as SelectChangeEvent<FilterValue>)}
                    >
                      <MenuItem value="all">Todas</MenuItem>
                      {availableFilters.locations.map((location) => (
                        <MenuItem key={location} value={location}>
                          {location === 'missing' ? 'Sin registro' : location}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label="Usuario"
                      value={filters.user}
                      onChange={(event) => handleFilterChange('user')(event as SelectChangeEvent<FilterValue>)}
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      {availableFilters.users.map((user) => (
                        <MenuItem key={user} value={user}>
                          {user === 'missing' ? 'Sin registro' : user}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ flex: 1 }}>
                    <TextField
                      select
                      fullWidth
                      label="Correo electrónico"
                      value={filters.email}
                      onChange={(event) => handleFilterChange('email')(event as SelectChangeEvent<FilterValue>)}
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      {availableFilters.emails.map((email) => (
                        <MenuItem key={email} value={email}>
                          {email === 'missing' ? 'Sin registro' : email}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label="Cargo de contacto"
                      value={filters.role}
                      onChange={(event) => handleFilterChange('role')(event as SelectChangeEvent<FilterValue>)}
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      {availableFilters.roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role === 'missing' ? 'Sin registro' : role}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ flex: 1 }}>
                    <TextField
                      select
                      fullWidth
                      label="Teléfono"
                      value={filters.phone}
                      onChange={(event) => handleFilterChange('phone')(event as SelectChangeEvent<FilterValue>)}
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      {availableFilters.phones.map((phone) => (
                        <MenuItem key={phone} value={phone}>
                          {phone === 'missing' ? 'Sin registro' : phone}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label="Ordenar por"
                      value={sortOption}
                      onChange={(event) => handleSortChange(event as SelectChangeEvent<SortOption>)}
                    >
                      <MenuItem value="alphabetical-asc">Alfabético (A-Z)</MenuItem>
                      <MenuItem value="alphabetical-desc">Alfabético (Z-A)</MenuItem>
                      <MenuItem value="creation-newest">Fecha de creación (recientes primero)</MenuItem>
                      <MenuItem value="creation-oldest">Fecha de creación (antiguas primero)</MenuItem>
                    </TextField>
                  </Stack>
                </Stack>
              </Stack>
            </Fade>
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
                : 'Consulta más tarde o comunícate con tu coordinador.'}
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
                    const fadeDelay = Math.min((columnIndex * 4 + itemIndex) * 60, 360);

                    return (
                      <Grow
                        in
                        key={empresa.id}
                        timeout={300}
                        style={{ transformOrigin: 'top center', transitionDelay: `${fadeDelay}ms` }}
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
                            transition: 'all 0.25s ease-in-out',
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
                            subheader={
                              empresa.cargo_jefe ? `Contacto: ${empresa.cargo_jefe}` : undefined
                            }
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
                                  {empresa.cargo_jefe || 'Cargo no registrado'}
                                </Typography>
                              </Stack>

                              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <PhoneIcon color="action" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                  {empresa.telefono ? (
                                    <Tooltip title="Llamar">
                                      <Typography
                                        component="a"
                                        href={`tel:${empresa.telefono}`}
                                        sx={{
                                          color: 'inherit',
                                          textDecoration: 'none',
                                          '&:hover': { textDecoration: 'underline' },
                                        }}
                                      >
                                        {empresa.telefono}
                                      </Typography>
                                    </Tooltip>
                                  ) : (
                                    'Teléfono no registrado'
                                  )}
                                </Typography>
                              </Stack>

                              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <EmailIcon color="action" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                  {empresa.email ? (
                                    <Tooltip title="Enviar correo">
                                      <Typography
                                        component="a"
                                        href={`mailto:${empresa.email}`}
                                        sx={{
                                          color: 'inherit',
                                          textDecoration: 'none',
                                          '&:hover': { textDecoration: 'underline' },
                                        }}
                                      >
                                        {empresa.email}
                                      </Typography>
                                    </Tooltip>
                                  ) : (
                                    'Correo no registrado'
                                  )}
                                </Typography>
                              </Stack>
                            </Stack>
                          </CardContent>

                          <Divider sx={{ mx: 3 }} />

                          <CardActions sx={{ px: 3, pb: 3, pt: 2, justifyContent: 'space-between' }}>
                            <Button
                              size="small"
                              variant={selectedEmpresaId === empresa.id ? 'contained' : 'outlined'}
                              color="primary"
                              onClick={() => handleSelect(empresa.id)}
                            >
                              {selectedEmpresaId === empresa.id ? 'Seleccionada' : 'Seleccionar'}
                            </Button>

                            {isCoordinator && (
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="Editar">
                                  <span>
                                    <IconButton size="small" onClick={() => handleEditOpen(empresa)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteOpen(empresa)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            )}
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
