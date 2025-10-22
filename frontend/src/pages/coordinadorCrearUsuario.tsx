import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/PersonAddAlt';
import UploadIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import Grid from '@mui/material/GridLegacy';
import * as XLSX from 'xlsx';
import DashboardTemplate from '../components/DashboardTemplate';
import { supabase } from '../services/supabaseClient';

interface StudentRecord {
  id: string;
  user_id?: string | null;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  carrera?: string | null;
  sede?: string | null;
  semestre?: string | null;
  blocked?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

type StudentFormState = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  carrera: string;
  sede: string;
  semestre: string;
  password: string;
};

type ImportRow = StudentFormState;

type ResultMessage = { type: 'success' | 'error' | 'info'; text: string } | null;

const DEFAULT_FORM: StudentFormState = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  carrera: '',
  sede: '',
  semestre: '',
  password: '',
};

const REQUIRED_COLUMNS = ['Nombre', 'Apellido', 'Email', 'Telefono', 'Carrera', 'Semestre', 'Sede'];
const OPTIONAL_PASSWORD_KEYS = ['Password', 'Contraseña', 'Contrasena'];

const capitalizeWords = (value: string) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const normalizePhone = (value: string) => value.replace(/\s+/g, ' ').trim();

const sanitize = (value: string) => value.trim();

const generateTempPassword = () =>
  Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2);

const CoordinadorCrearUsuario = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCarrera, setFilterCarrera] = useState('todos');
  const [filterSede, setFilterSede] = useState('todos');
  const [filterSemestre, setFilterSemestre] = useState('todos');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [form, setForm] = useState<StudentFormState>(DEFAULT_FORM);
  const [editForm, setEditForm] = useState<StudentFormState>(DEFAULT_FORM);
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [formErrors, setFormErrors] = useState<Record<keyof StudentFormState, string>>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    carrera: '',
    sede: '',
    semestre: '',
    password: '',
  });

  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<ResultMessage>(null);
  const [message, setMessage] = useState<ResultMessage>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener estudiantes', error);
        setMessage({ type: 'error', text: 'No fue posible cargar los usuarios. Intenta nuevamente.' });
        return;
      }

      const mapped = (data || []).map((row: any) => ({
        ...row,
        nombre: row.nombre ? capitalizeWords(String(row.nombre)) : '',
        apellido: row.apellido ? capitalizeWords(String(row.apellido)) : '',
      }));

      setStudents(mapped);
    } finally {
      setLoading(false);
    }
  };

  const carrerasDisponibles = useMemo(() => {
    const values = new Set<string>();
    students.forEach(student => {
      if (student.carrera) values.add(student.carrera);
    });
    return Array.from(values).sort();
  }, [students]);

  const sedesDisponibles = useMemo(() => {
    const values = new Set<string>();
    students.forEach(student => {
      if (student.sede) values.add(student.sede);
    });
    return Array.from(values).sort();
  }, [students]);

  const semestresDisponibles = useMemo(() => {
    const values = new Set<string>();
    students.forEach(student => {
      if (student.semestre) values.add(String(student.semestre));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter(student => {
      const matchesSearch =
        query.length === 0 ||
        [student.nombre, student.apellido, student.email, student.telefono]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));

      const matchesCarrera = filterCarrera === 'todos' || (student.carrera || '').toLowerCase() === filterCarrera.toLowerCase();
      const matchesSede = filterSede === 'todos' || (student.sede || '').toLowerCase() === filterSede.toLowerCase();
      const matchesSemestre = filterSemestre === 'todos' || String(student.semestre || '').toLowerCase() === filterSemestre.toLowerCase();

      return matchesSearch && matchesCarrera && matchesSede && matchesSemestre;
    });
  }, [students, search, filterCarrera, filterSede, filterSemestre]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setFormErrors({ nombre: '', apellido: '', email: '', telefono: '', carrera: '', sede: '', semestre: '', password: '' });
  };

  const validateForm = (state: StudentFormState, requirePassword = true) => {
    const errors: Record<keyof StudentFormState, string> = {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      carrera: '',
      sede: '',
      semestre: '',
      password: '',
    };

    if (!state.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!state.apellido.trim()) errors.apellido = 'El apellido es obligatorio';
    if (!state.email.trim()) errors.email = 'El correo es obligatorio';
    if (!state.telefono.trim()) errors.telefono = 'El teléfono es obligatorio';
    if (!state.carrera.trim()) errors.carrera = 'La carrera es obligatoria';
    if (!state.sede.trim()) errors.sede = 'La sede es obligatoria';
    if (!state.semestre.trim()) errors.semestre = 'El semestre es obligatorio';
    if (requirePassword && !state.password.trim()) errors.password = 'La contraseña es obligatoria';

    setFormErrors(errors);
    return Object.values(errors).every(msg => !msg);
  };

  const handleCreateSubmit = async () => {
    if (!validateForm(form)) return;

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        nombre: capitalizeWords(form.nombre),
        apellido: capitalizeWords(form.apellido),
        email: sanitize(form.email).toLowerCase(),
        telefono: normalizePhone(form.telefono),
        carrera: sanitize(form.carrera),
        sede: sanitize(form.sede),
        semestre: sanitize(form.semestre),
        password: form.password.trim(),
      };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            role: 'estudiante',
            full_name: `${payload.nombre} ${payload.apellido}`,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const userId = authData.user?.id ?? null;
      const { error: dbError } = await supabase.from('estudiantes').insert({
        user_id: userId,
        nombre: payload.nombre,
        apellido: payload.apellido,
        email: payload.email,
        telefono: payload.telefono,
        carrera: payload.carrera,
        sede: payload.sede,
        semestre: payload.semestre,
      });

      if (dbError) {
        throw new Error(dbError.message);
      }

      setMessage({ type: 'success', text: 'Usuario creado correctamente.' });
      setCreateOpen(false);
      resetForm();
      await fetchStudents();
    } catch (error: any) {
      console.error('Error al crear usuario', error);
      setMessage({ type: 'error', text: error?.message || 'No se pudo crear el usuario.' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (student: StudentRecord) => {
    setSelected(student);
    setEditForm({
      nombre: student.nombre || '',
      apellido: student.apellido || '',
      email: student.email || '',
      telefono: student.telefono || '',
      carrera: student.carrera || '',
      sede: student.sede || '',
      semestre: student.semestre || '',
      password: '',
    });
    setFormErrors({ nombre: '', apellido: '', email: '', telefono: '', carrera: '', sede: '', semestre: '', password: '' });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selected) return;
    const partial: StudentFormState = { ...editForm, password: '' };
    if (!validateForm(partial, false)) return;

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        nombre: capitalizeWords(editForm.nombre),
        apellido: capitalizeWords(editForm.apellido),
        email: sanitize(editForm.email).toLowerCase(),
        telefono: normalizePhone(editForm.telefono),
        carrera: sanitize(editForm.carrera),
        sede: sanitize(editForm.sede),
        semestre: sanitize(editForm.semestre),
      };

      const { error } = await supabase
        .from('estudiantes')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      if (error) {
        throw new Error(error.message);
      }

      setMessage({ type: 'success', text: 'Usuario actualizado correctamente.' });
      setEditOpen(false);
      setSelected(null);
      await fetchStudents();
    } catch (error: any) {
      console.error('Error al actualizar usuario', error);
      setMessage({ type: 'error', text: error?.message || 'No se pudo actualizar el usuario.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportRows([]);
    setImportMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (!json.length) {
        setImportErrors(['El archivo no contiene registros.']);
        return;
      }

      const missingColumns = REQUIRED_COLUMNS.filter(column =>
        !Object.keys(json[0]).some(key => key.toLowerCase() === column.toLowerCase())
      );

      if (missingColumns.length) {
        setImportErrors([
          `Faltan columnas obligatorias: ${missingColumns.join(', ')}`,
        ]);
        return;
      }

      const mappedRows: ImportRow[] = json.map(row => {
        const lookup = (keys: string[]) => {
          const entry = Object.entries(row).find(([key]) => keys.some(k => k.toLowerCase() === key.toLowerCase()));
          return entry ? String(entry[1]) : '';
        };

        const nombre = lookup(['Nombre']);
        const apellido = lookup(['Apellido']);
        const email = lookup(['Email']);
        const telefono = lookup(['Telefono', 'Teléfono']);
        const carrera = lookup(['Carrera']);
        const sede = lookup(['Sede']);
        const semestre = lookup(['Semestre']);
        const passwordEntry = lookup(OPTIONAL_PASSWORD_KEYS);

        return {
          nombre,
          apellido,
          email,
          telefono,
          carrera,
          sede,
          semestre,
          password: passwordEntry || generateTempPassword(),
        };
      });

      const errors: string[] = [];

      mappedRows.forEach((row, index) => {
        REQUIRED_COLUMNS.forEach(column => {
          const key = column.toLowerCase();
          const value =
            key === 'nombre' ? row.nombre :
            key === 'apellido' ? row.apellido :
            key === 'email' ? row.email :
            key === 'telefono' ? row.telefono :
            key === 'carrera' ? row.carrera :
            key === 'semestre' ? row.semestre :
            key === 'sede' ? row.sede : '';

          if (!value || !String(value).trim()) {
            errors.push(`Fila ${index + 2}: ${column} es obligatorio.`);
          }
        });
      });

      if (errors.length) {
        setImportErrors(errors);
      } else {
        const normalized = mappedRows.map(row => ({
          ...row,
          nombre: capitalizeWords(row.nombre),
          apellido: capitalizeWords(row.apellido),
          email: row.email.trim().toLowerCase(),
          telefono: normalizePhone(row.telefono.trim()),
          carrera: sanitize(row.carrera),
          sede: sanitize(row.sede),
          semestre: sanitize(row.semestre),
        }));

        setImportRows(normalized);
        setPreviewOpen(true);
      }
    } catch (error) {
      console.error('Error al procesar archivo', error);
      setImportErrors(['No fue posible leer el archivo. Asegúrate de que sea un Excel válido.']);
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    setImportMessage(null);

    const results: { exitosos: number; fallidos: number; detalles: string[] } = {
      exitosos: 0,
      fallidos: 0,
      detalles: [],
    };

    for (const row of importRows) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: row.email,
          password: row.password,
          options: {
            data: {
              role: 'estudiante',
              full_name: `${row.nombre} ${row.apellido}`,
            },
          },
        });

        if (authError) {
          throw new Error(authError.message);
        }

        const userId = authData.user?.id ?? null;
        const { error: dbError } = await supabase.from('estudiantes').insert({
          user_id: userId,
          nombre: row.nombre,
          apellido: row.apellido,
          email: row.email,
          telefono: row.telefono,
          carrera: row.carrera,
          sede: row.sede,
          semestre: row.semestre,
        });

        if (dbError) {
          throw new Error(dbError.message);
        }

        results.exitosos += 1;
        results.detalles.push(`${row.email} → ${row.password}`);
      } catch (error: any) {
        console.error('Error al importar fila', row.email, error);
        results.fallidos += 1;
        results.detalles.push(`${row.email}: ${error?.message || 'Error desconocido'}`);
      }
    }

    setImporting(false);
    await fetchStudents();

    if (results.fallidos === 0) {
      setImportMessage({
        type: 'success',
        text: `Usuarios creados: ${results.exitosos}. Contraseñas temporales: ${results.detalles.join(' | ')}`,
      });
      setMessage({ type: 'success', text: `Se importaron ${results.exitosos} usuarios correctamente.` });
      setPreviewOpen(false);
      setImportRows([]);
    } else {
      setImportMessage({
        type: 'error',
        text: `Importados: ${results.exitosos}. Fallidos: ${results.fallidos}. Detalles: ${results.detalles.join(' | ')}`,
      });
      setMessage({
        type: 'error',
        text: `Importación parcial: ${results.exitosos} éxitos, ${results.fallidos} errores. Revisa los detalles para más información.`,
      });
    }
  };

  const downloadTemplate = () => {
    const rows = [
      {
        Nombre: 'Ana',
        Apellido: 'García',
        Email: 'ana.garcia@ejemplo.cl',
        Telefono: '+56912345678',
        Carrera: 'Ingeniería Civil Informática',
        Semestre: '6',
        Sede: 'Sede Providencia',
        Password: 'Practik123',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'plantilla_usuarios.xlsx');
  };

  const totalActivos = students.filter(student => !student.blocked).length;

  return (
    <DashboardTemplate title="Crear usuarios">
      <Stack spacing={4} sx={{ py: 4 }}>
        <Stack spacing={1} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestión de usuarios
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Crea, importa y edita cuentas de estudiantes desde un panel ágil y visual.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStudents}
              sx={{ textTransform: 'none' }}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              sx={{ textTransform: 'none' }}
            >
              Nuevo usuario
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<UploadIcon />}
              onClick={() => setImportOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Importar
            </Button>
          </Stack>
        </Stack>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card sx={{ borderRadius: 3, background: theme => theme.palette.mode === 'light' ? '#f7f9fc' : theme.palette.background.default }}>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <TextField
                  fullWidth
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, correo o teléfono"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width={{ xs: '100%', md: 'auto' }}>
                  <TextField
                    select
                    label="Carrera"
                    value={filterCarrera}
                    onChange={event => setFilterCarrera(event.target.value)}
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="todos">Todas</MenuItem>
                    {carrerasDisponibles.map(carrera => (
                      <MenuItem key={carrera} value={carrera}>
                        {carrera}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Sede"
                    value={filterSede}
                    onChange={event => setFilterSede(event.target.value)}
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="todos">Todas</MenuItem>
                    {sedesDisponibles.map(sede => (
                      <MenuItem key={sede} value={sede}>
                        {sede}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Semestre"
                    value={filterSemestre}
                    onChange={event => setFilterSemestre(event.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    {semestresDisponibles.map(semestre => (
                      <MenuItem key={semestre} value={semestre}>
                        {semestre}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip label={`Total usuarios: ${students.length}`} color="primary" variant="outlined" />
                <Chip label={`Activos: ${totalActivos}`} color="success" variant="outlined" />
                <Chip label={`Resultados: ${filteredStudents.length}`} color="info" variant="outlined" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredStudents.map(student => (
              <Grid item xs={12} sm={6} lg={4} key={student.id}>
                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 180ms ease, box-shadow 180ms ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: theme => `0 20px 35px ${theme.palette.primary.main}26`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 6,
                      background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" component="h2">
                            {student.nombre} {student.apellido}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {student.email}
                          </Typography>
                        </Box>
                        <IconButton color="primary" onClick={() => openEdit(student)}>
                          <EditIcon />
                        </IconButton>
                      </Stack>

                      <Divider flexItem sx={{ my: 1 }} />

                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          Teléfono: <Typography component="span" color="text.primary">{student.telefono || '—'}</Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Carrera: <Typography component="span" color="text.primary">{student.carrera || '—'}</Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sede: <Typography component="span" color="text.primary">{student.sede || '—'}</Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Semestre: <Typography component="span" color="text.primary">{student.semestre || '—'}</Typography>
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {!filteredStudents.length && !loading && (
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography align="center" color="text.secondary">
                      No se encontraron usuarios con los filtros seleccionados.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </Stack>

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!saving) {
            setCreateOpen(false);
            resetForm();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crear nuevo usuario</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={event => setForm(prev => ({ ...prev, nombre: event.target.value }))}
                onBlur={event => setForm(prev => ({ ...prev, nombre: capitalizeWords(event.target.value) }))}
                error={Boolean(formErrors.nombre)}
                helperText={formErrors.nombre}
                fullWidth
              />
              <TextField
                label="Apellido"
                value={form.apellido}
                onChange={event => setForm(prev => ({ ...prev, apellido: event.target.value }))}
                onBlur={event => setForm(prev => ({ ...prev, apellido: capitalizeWords(event.target.value) }))}
                error={Boolean(formErrors.apellido)}
                helperText={formErrors.apellido}
                fullWidth
              />
            </Stack>
            <TextField
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={form.telefono}
              onChange={event => setForm(prev => ({ ...prev, telefono: event.target.value }))}
              error={Boolean(formErrors.telefono)}
              helperText={formErrors.telefono}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Carrera"
                value={form.carrera}
                onChange={event => setForm(prev => ({ ...prev, carrera: event.target.value }))}
                error={Boolean(formErrors.carrera)}
                helperText={formErrors.carrera}
                fullWidth
              />
              <TextField
                label="Sede"
                value={form.sede}
                onChange={event => setForm(prev => ({ ...prev, sede: event.target.value }))}
                error={Boolean(formErrors.sede)}
                helperText={formErrors.sede}
                fullWidth
              />
            </Stack>
            <TextField
              label="Semestre"
              value={form.semestre}
              onChange={event => setForm(prev => ({ ...prev, semestre: event.target.value }))}
              error={Boolean(formErrors.semestre)}
              helperText={formErrors.semestre}
              fullWidth
            />
            <TextField
              label="Contraseña temporal"
              type="password"
              value={form.password}
              onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
              error={Boolean(formErrors.password)}
              helperText={formErrors.password || 'La contraseña inicial puede ser cambiada por el estudiante luego.'}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!saving) {
                setCreateOpen(false);
                resetForm();
              }
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={saving}>
            {saving ? 'Creando…' : 'Crear usuario'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => {
          if (!saving) {
            setEditOpen(false);
            setSelected(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Nombre"
                value={editForm.nombre}
                onChange={event => setEditForm(prev => ({ ...prev, nombre: event.target.value }))}
                onBlur={event => setEditForm(prev => ({ ...prev, nombre: capitalizeWords(event.target.value) }))}
                error={Boolean(formErrors.nombre)}
                helperText={formErrors.nombre}
                fullWidth
              />
              <TextField
                label="Apellido"
                value={editForm.apellido}
                onChange={event => setEditForm(prev => ({ ...prev, apellido: event.target.value }))}
                onBlur={event => setEditForm(prev => ({ ...prev, apellido: capitalizeWords(event.target.value) }))}
                error={Boolean(formErrors.apellido)}
                helperText={formErrors.apellido}
                fullWidth
              />
            </Stack>
            <TextField
              label="Correo electrónico"
              type="email"
              value={editForm.email}
              onChange={event => setEditForm(prev => ({ ...prev, email: event.target.value }))}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={editForm.telefono}
              onChange={event => setEditForm(prev => ({ ...prev, telefono: event.target.value }))}
              error={Boolean(formErrors.telefono)}
              helperText={formErrors.telefono}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Carrera"
                value={editForm.carrera}
                onChange={event => setEditForm(prev => ({ ...prev, carrera: event.target.value }))}
                error={Boolean(formErrors.carrera)}
                helperText={formErrors.carrera}
                fullWidth
              />
              <TextField
                label="Sede"
                value={editForm.sede}
                onChange={event => setEditForm(prev => ({ ...prev, sede: event.target.value }))}
                error={Boolean(formErrors.sede)}
                helperText={formErrors.sede}
                fullWidth
              />
            </Stack>
            <TextField
              label="Semestre"
              value={editForm.semestre}
              onChange={event => setEditForm(prev => ({ ...prev, semestre: event.target.value }))}
              error={Boolean(formErrors.semestre)}
              helperText={formErrors.semestre}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!saving) {
                setEditOpen(false);
                setSelected(null);
              }
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportErrors([]);
          setImportMessage(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Importar usuarios</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Descarga la plantilla de ejemplo, completa los datos y súbela en formato Excel (.xlsx). Los campos Nombre,
              Apellido, Email, Teléfono, Carrera, Semestre y Sede son obligatorios.
            </Typography>
            <Button startIcon={<DownloadIcon />} onClick={downloadTemplate} sx={{ alignSelf: 'flex-start' }}>
              Descargar plantilla
            </Button>
            <Button component="label" variant="contained" startIcon={<UploadIcon />} sx={{ alignSelf: 'flex-start' }}>
              Seleccionar archivo
              <input type="file" hidden accept=".xlsx,.xls" onChange={handleFileSelected} />
            </Button>
            {importErrors.length > 0 && (
              <Alert severity="error">
                <Stack component="ul" sx={{ pl: 2, mb: 0 }}>
                  {importErrors.map((error, index) => (
                    <Typography component="li" variant="body2" key={index}>
                      {error}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}
            {importMessage && (
              <Alert severity={importMessage.type} onClose={() => setImportMessage(null)}>
                {importMessage.text}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportOpen(false);
              setImportErrors([]);
              setImportMessage(null);
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => {
          if (!importing) {
            setPreviewOpen(false);
            setImportRows([]);
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Previsualizar importación</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Se importarán {importRows.length} usuarios. Las contraseñas temporales se muestran junto al correo para que
              puedas entregarlas de forma segura.
            </Alert>
            <Box sx={{ maxHeight: 380, overflow: 'auto' }}>
              <Stack spacing={1.5}>
                {importRows.map((row, index) => (
                  <Card key={`${row.email}-${index}`} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle1">
                          {row.nombre} {row.apellido} — {row.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Teléfono: {row.telefono} | Carrera: {row.carrera} | Semestre: {row.semestre} | Sede: {row.sede}
                        </Typography>
                        <Typography variant="body2" color="primary.main">
                          Contraseña temporal: {row.password}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!importing) {
                setPreviewOpen(false);
                setImportRows([]);
              }
            }}
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleConfirmImport} disabled={importing}>
            {importing ? 'Importando…' : 'Confirmar importación'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardTemplate>
  );
};

export default CoordinadorCrearUsuario;
