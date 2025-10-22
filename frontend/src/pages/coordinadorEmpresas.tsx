import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Business as BusinessIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  SupervisorAccount as SupervisorAccountIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import DashboardTemplate from '../components/DashboardTemplate';
import { empresaService } from '../services/empresaService';
import type { Empresa } from '../types/database';
import { useAuth } from '../hooks/useAuth';

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  primary: string;
  secondary?: string;
}

const InfoRow = ({ icon, label, primary, secondary }: InfoRowProps) => (
  <Stack direction='row' spacing={2} alignItems='flex-start'>
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        flexShrink: 0,
        boxShadow: '0 6px 16px rgba(33, 150, 243, 0.35)'
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography
        variant='overline'
        color='text.secondary'
        sx={{ letterSpacing: 1.2, fontSize: 12 }}
      >
        {label}
      </Typography>
      <Typography variant='body1' sx={{ fontWeight: 600, color: 'text.primary' }}>
        {primary}
      </Typography>
      {secondary && (
        <Typography variant='body2' color='text.secondary'>
          {secondary}
        </Typography>
      )}
    </Box>
  </Stack>
);

const CoordinadorEmpresas = () => {
  const { role, currentUser } = useAuth();
  const theme = useTheme();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);

  const resolvedRole = useMemo(() => {
    const claimedRole = currentUser && 'role' in currentUser
      ? ((currentUser as User & { role?: string | null }).role ?? null)
      : null;
    const metadataRole = (currentUser?.app_metadata?.role as string | undefined)
      ?? (currentUser?.user_metadata?.role as string | undefined)
      ?? null;
    const finalRole = role ?? claimedRole ?? metadataRole ?? null;
    return finalRole ? finalRole.toString().toLowerCase() : null;
  }, [role, currentUser]);

  const isCoordinador = resolvedRole === 'coordinador';

  const loadEmpresas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await empresaService.getAll();
      if (fetchError) {
        throw fetchError;
      }
      setEmpresas(data ?? []);
    } catch (err) {
      console.error('Error al cargar empresas', err);
      const message = err instanceof Error
        ? err.message
        : 'No se pudo obtener la lista de empresas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmpresas();
  }, [loadEmpresas]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
    []
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleSelectEmpresa = (empresaId: string) => {
    setSelectedEmpresaId(prev => (prev === empresaId ? null : empresaId));
  };

  const filteredEmpresas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return empresas;
    }
    return empresas.filter(empresa => {
      const fields = [
        empresa.razon_social,
        empresa.jefe_directo,
        empresa.cargo_jefe,
        empresa.direccion,
        empresa.email
      ];
      return fields.some(field => field?.toLowerCase().includes(term));
    });
  }, [empresas, search]);

  const isLoadingList = loading && empresas.length === 0;
  const showEmptyState = !loading && !error && filteredEmpresas.length === 0;

  const renderCardContent = (empresa: Empresa) => (
    <CardContent sx={{ px: 3, pt: 0, pb: 3 }}>
      <Stack spacing={2.5}>
        <InfoRow
          icon={<SupervisorAccountIcon fontSize='small' />}
          label='Jefe directo'
          primary={empresa.jefe_directo || 'Sin información'}
          secondary={empresa.cargo_jefe}
        />
        <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(148, 163, 184, 0.4)' }} />
        <InfoRow
          icon={<LocationOnIcon fontSize='small' />}
          label='Dirección'
          primary={empresa.direccion || 'No registrada'}
        />
        <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(148, 163, 184, 0.4)' }} />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ width: '100%' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <InfoRow
              icon={<PhoneIcon fontSize='small' />}
              label='Teléfono'
              primary={empresa.telefono || 'Sin teléfono'}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <InfoRow
              icon={<EmailIcon fontSize='small' />}
              label='Correo'
              primary={empresa.email || 'Sin correo'}
            />
          </Box>
        </Stack>
      </Stack>
    </CardContent>
  );

  return (
    <DashboardTemplate title='Empresas colaboradoras'>
      <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, maxWidth: '1440px', mx: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 3,
            mb: 4
          }}
        >
          <Box>
            <Typography variant='h4' component='h1' sx={{ fontWeight: 700 }} gutterBottom>
              Catálogo de empresas
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              Consulta las organizaciones disponibles para prácticas y convenios activos.
            </Typography>
            <Stack direction='row' spacing={1.5} sx={{ mt: 2 }} alignItems='center'>
              <Chip
                color='primary'
                variant='outlined'
                icon={<BusinessIcon fontSize='small' />}
                label={`${empresas.length} empresa${empresas.length === 1 ? '' : 's'}`}
              />
              {isCoordinador && (
                <Chip
                  color='secondary'
                  variant='outlined'
                  label='Gestión habilitada para coordinadores'
                />
              )}
            </Stack>
          </Box>
          <Stack direction='row' spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <TextField
              fullWidth
              value={search}
              onChange={handleSearchChange}
              placeholder='Buscar por nombre, jefe directo o correo'
              size='medium'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon color='action' />
                  </InputAdornment>
                )
              }}
            />
            <Tooltip title='Actualizar listado'>
              <span>
                <IconButton
                  onClick={() => void loadEmpresas()}
                  color='primary'
                  sx={{
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: 2,
                    width: 52,
                    height: 52
                  }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={22} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        {error && (
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => void loadEmpresas()}>
                Reintentar
              </Button>
            }
            sx={{ mb: 4 }}
          >
            Ocurrió un problema al obtener las empresas. {error}
          </Alert>
        )}

        {showEmptyState && (
          <Card
            variant='outlined'
            sx={{
              borderRadius: 4,
              py: 8,
              px: 4,
              textAlign: 'center',
              boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)'
            }}
          >
            <CardContent>
              <Typography variant='h5' component='h2' gutterBottom sx={{ fontWeight: 600 }}>
                No encontramos coincidencias
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Ajusta los filtros o revisa más tarde. Si eres coordinador puedes registrar nuevas empresas desde el panel administrativo.
              </Typography>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          {isLoadingList && Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} sm={6} lg={4} key={`skeleton-${index}`}>
              <Card
                variant='outlined'
                sx={{ borderRadius: 4, boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}
              >
                <CardHeader
                  avatar={<Skeleton variant='circular' width={48} height={48} />}
                  title={<Skeleton variant='text' width='70%' />}
                  subheader={<Skeleton variant='text' width='50%' />}
                />
                <CardContent>
                  <Stack spacing={2.5}>
                    <Skeleton variant='rectangular' height={18} />
                    <Skeleton variant='rectangular' height={18} />
                    <Skeleton variant='rectangular' height={18} />
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 3, pb: 3 }}>
                  <Skeleton variant='rectangular' height={38} width='100%' sx={{ borderRadius: 2 }} />
                </CardActions>
              </Card>
            </Grid>
          ))}

          {!isLoadingList && filteredEmpresas.map(empresa => {
            const selected = selectedEmpresaId === empresa.id;
            const cardContent = renderCardContent(empresa);
            const initials = empresa.razon_social
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0]?.toUpperCase())
              .join('');

            return (
              <Grid item xs={12} sm={6} lg={4} key={empresa.id}>
                <Card
                  variant='outlined'
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    position: 'relative',
                    borderWidth: selected ? 2 : 1,
                    borderStyle: 'solid',
                    borderColor: selected
                      ? theme.palette.primary.main
                      : 'rgba(148, 163, 184, 0.3)',
                    boxShadow: selected
                      ? '0 24px 50px rgba(59, 130, 246, 0.25)'
                      : '0 18px 45px rgba(15, 23, 42, 0.1)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 28px 60px rgba(15, 23, 42, 0.18)'
                    }
                  }}
                >
                  {selected && !isCoordinador && (
                    <Chip
                      label='Seleccionada'
                      color='primary'
                      size='small'
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        fontWeight: 600,
                        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)'
                      }}
                    />
                  )}
                  <CardHeader
                    sx={{ pb: 0, alignItems: 'flex-start' }}
                    avatar={(
                      <Avatar
                        sx={{
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          fontWeight: 700,
                          width: 48,
                          height: 48
                        }}
                      >
                        {initials || 'EM'}
                      </Avatar>
                    )}
                    title={(
                      <Typography variant='h6' sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {empresa.razon_social}
                      </Typography>
                    )}
                    subheader={empresa.created_at ? `Registrada el ${dateFormatter.format(new Date(empresa.created_at))}` : 'Registro sin fecha'}
                    action={(
                      <Chip
                        icon={<BusinessIcon fontSize='small' />}
                        label='Empresa activa'
                        size='small'
                        variant='outlined'
                      />
                    )}
                  />
                  {isCoordinador ? (
                    cardContent
                  ) : (
                    <CardActionArea onClick={() => handleSelectEmpresa(empresa.id)}>
                      {cardContent}
                    </CardActionArea>
                  )}
                  <CardActions
                    sx={{
                      mt: 'auto',
                      px: 3,
                      pb: 3,
                      pt: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 1
                    }}
                  >
                    {!isCoordinador && (
                      <Button
                        variant={selected ? 'contained' : 'outlined'}
                        onClick={() => handleSelectEmpresa(empresa.id)}
                        color='primary'
                        fullWidth
                      >
                        {selected ? 'Seleccionada' : 'Seleccionar'}
                      </Button>
                    )}
                    <Button
                      variant='text'
                      color='primary'
                      fullWidth
                      href={empresa.email ? `mailto:${empresa.email}` : undefined}
                      sx={{ fontWeight: 600 }}
                    >
                      Contactar
                    </Button>
                    {isCoordinador && (
                      <Tooltip title='Gestiona esta empresa desde las herramientas administrativas'>
                        <Button
                          variant='outlined'
                          color='secondary'
                          fullWidth
                          onClick={() => handleSelectEmpresa(empresa.id)}
                        >
                          Gestionar empresa
                        </Button>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </DashboardTemplate>
  );
};

export default CoordinadorEmpresas;
