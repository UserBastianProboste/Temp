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
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import type { SelectChangeEvent } from '@mui/material/Select';
import AddIcon from '@mui/icons-material/PersonAddAlt';
import UploadIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import WarningIcon from '@mui/icons-material/WarningAmber';
import CheckIcon from '@mui/icons-material/CheckCircle';
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

type OrderBy = 'nombre' | 'email' | 'carrera' | 'sede' | 'semestre' | 'created_at';
type Order = 'asc' | 'desc';

type FormErrors = Record<keyof StudentFormState, string>;

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

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 70, 100, 200] as const;
const SEDES_VALIDAS = ['Sede Llano', 'Sede Providencia', 'Sede Temuco', 'Sede Talca'];
const SEMESTRES_VALIDOS = Array.from({ length: 12 }, (_, index) => String(index + 1));

const TABLE_COLUMN_STYLES = {
  nombre: {
    width: { xs: '30%', sm: '22%' },
    maxWidth: { xs: '100%', sm: 280 },
  },
  email: {
    width: { xs: '30%', sm: '22%' },
    maxWidth: { xs: '100%', sm: 280 },
  },
  telefono: {
    width: { xs: '20%', sm: '12%' },
    maxWidth: { xs: '100%', sm: 160 },
  },
  carrera: {
    width: { xs: '20%', sm: '14%' },
    maxWidth: { xs: '100%', sm: 180 },
  },
  sede: {
    width: { xs: '20%', sm: '12%' },
    maxWidth: { xs: '100%', sm: 160 },
  },
  semestre: {
    width: { xs: '15%', sm: '8%' },
    maxWidth: { xs: '100%', sm: 100 },
  },
  estado: {
    width: { xs: '15%', sm: '5%' },
    maxWidth: { xs: '100%', sm: 80 },
  },
  acciones: {
    width: { xs: '20%', sm: '5%' },
    maxWidth: { xs: '100%', sm: 120 },
  },
} as const;

const CHIP_STYLES = {
  maxWidth: '100%',
  '& .MuiChip-label': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

const EMPTY_ERRORS: FormErrors = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  carrera: '',
  sede: '',
  semestre: '',
  password: '',
};

const capitalizeWords = (value: string) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const normalizePhone = (value: string) => value.replace(/\s+/g, ' ').trim();

const sanitize = (value: string) => value.trim();

const matchSede = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = SEDES_VALIDAS.find(valid => valid.toLowerCase() === trimmed.toLowerCase());
  return match ?? '';
};

const normalizeExistingSede = (value: string | null | undefined) => {
  if (!value) return null;
  const stringValue = String(value).trim();
  return matchSede(stringValue) || stringValue;
};

const normalizeSemestre = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const stringValue = String(value).trim();
  return stringValue || null;
};

const isStudentComplete = (student: StudentRecord) => {
  const hasAllFields =
    Boolean(student.nombre) &&
    Boolean(student.apellido) &&
    Boolean(student.email) &&
    Boolean(student.telefono) &&
    Boolean(student.carrera) &&
    Boolean(student.sede) &&
    Boolean(student.semestre);

  if (!hasAllFields) {
    return false;
  }

  const sedeCanonical = matchSede(String(student.sede));
  const semestreValue = String(student.semestre ?? '').trim();

  if (!sedeCanonical || !SEMESTRES_VALIDOS.includes(semestreValue)) {
    return false;
  }

  return true;
};

const generateTempPassword = () =>
  Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2);

const CoordinadorEstudiantes = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCarrera, setFilterCarrera] = useState('todos');
  const [filterSede, setFilterSede] = useState('todos');
  const [filterSemestre, setFilterSemestre] = useState('todos');
  const [orderBy, setOrderBy] = useState<OrderBy>('created_at');
  const [order, setOrder] = useState<Order>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(ROWS_PER_PAGE_OPTIONS[0]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [form, setForm] = useState<StudentFormState>(DEFAULT_FORM);
  const [editForm, setEditForm] = useState<StudentFormState>(DEFAULT_FORM);
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [createErrors, setCreateErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [editErrors, setEditErrors] = useState<FormErrors>(EMPTY_ERRORS);

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
        setMessage({ type: 'error', text: 'No fue posible cargar los estudiantes. Intenta nuevamente.' });
        return;
      }

      const mapped = (data || []).map((row: any) => ({
        ...row,
        nombre: row.nombre ? capitalizeWords(String(row.nombre)) : '',
        apellido: row.apellido ? capitalizeWords(String(row.apellido)) : '',
        telefono: row.telefono ? normalizePhone(String(row.telefono)) : null,
        carrera: row.carrera ? sanitize(String(row.carrera)) : null,
        sede: normalizeExistingSede(row.sede),
        semestre: normalizeSemestre(row.semestre),
      }));

      setStudents(mapped);
    } finally {
      setLoading(false);
    }
  };

  const carrerasDisponibles = useMemo(() => {
    const values = new Set<string>();
    students.forEach(student => {
      if (student.carrera) values.add(String(student.carrera));
    });
    if (form.carrera) values.add(form.carrera);
    if (editForm.carrera) values.add(editForm.carrera);
    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [students, form.carrera, editForm.carrera]);

  const sedesDisponibles = useMemo(() => {
    const values = new Set<string>();
    students.forEach(student => {
      if (student.sede) values.add(String(student.sede));
    });
    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [students]);

  const semestresDisponibles = useMemo(() => {
    const values = new Set<string>();
    students.forEach(student => {
      if (student.semestre) values.add(String(student.semestre));
    });
    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = students.filter(student => {
      const matchesSearch =
        query.length === 0 ||
        [student.nombre, student.apellido, student.email, student.telefono]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));

      const matchesCarrera =
        filterCarrera === 'todos' || (student.carrera || '').toLowerCase() === filterCarrera.toLowerCase();
      const matchesSede =
        filterSede === 'todos' || (student.sede || '').toLowerCase() === filterSede.toLowerCase();
      const matchesSemestre =
        filterSemestre === 'todos' || String(student.semestre || '').toLowerCase() === filterSemestre.toLowerCase();

      return matchesSearch && matchesCarrera && matchesSede && matchesSemestre;
    });

    const getComparableValue = (student: StudentRecord) => {
      switch (orderBy) {
        case 'nombre':
          return `${student.nombre ?? ''} ${student.apellido ?? ''}`.toLowerCase();
        case 'email':
          return (student.email ?? '').toLowerCase();
        case 'carrera':
          return (student.carrera ?? '').toLowerCase();
        case 'sede':
          return (student.sede ?? '').toLowerCase();
        case 'semestre':
          return Number(student.semestre ?? 0);
        case 'created_at':
        default:
          return student.created_at ? new Date(student.created_at).getTime() : 0;
      }
    };

    return filtered.sort((a, b) => {
      const aValue = getComparableValue(a);
      const bValue = getComparableValue(b);

      if (aValue === bValue) return 0;

      if (aValue === undefined || aValue === null) return order === 'asc' ? 1 : -1;
      if (bValue === undefined || bValue === null) return order === 'asc' ? -1 : 1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue), undefined, {
        numeric: typeof aValue === 'number' || typeof bValue === 'number',
        sensitivity: 'base',
      });

      return order === 'asc' ? comparison : -comparison;
    });
  }, [students, search, filterCarrera, filterSede, filterSemestre, orderBy, order]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCarrera, filterSede, filterSemestre, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, currentPage, rowsPerPage]);

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (event: SelectChangeEvent<string>) => {
    const value = Number(event.target.value);
    setRowsPerPage(value);
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setCreateErrors(EMPTY_ERRORS);
  };

  const resetEditState = () => {
    setEditForm(DEFAULT_FORM);
    setEditErrors(EMPTY_ERRORS);
    setSelected(null);
  };

  const validateForm = (
    state: StudentFormState,
    { requirePassword, setErrors }: { requirePassword: boolean; setErrors: (errors: FormErrors) => void }
  ) => {
    const errors: FormErrors = { ...EMPTY_ERRORS };

    const nombre = state.nombre.trim();
    const apellido = state.apellido.trim();
    const email = state.email.trim();
    const telefono = state.telefono.trim();
    const carrera = state.carrera.trim();
    const sede = state.sede.trim();
    const semestre = state.semestre.trim();

    if (!nombre) errors.nombre = 'El nombre es obligatorio';
    if (!apellido) errors.apellido = 'El apellido es obligatorio';
    if (!email) errors.email = 'El correo es obligatorio';
    if (!telefono) errors.telefono = 'El teléfono es obligatorio';
    if (!carrera) errors.carrera = 'La carrera es obligatoria';

    if (!sede) {
      errors.sede = 'La sede es obligatoria';
    } else if (!matchSede(sede)) {
      errors.sede = `Selecciona una sede válida (${SEDES_VALIDAS.join(', ')})`;
    }

    if (!semestre) {
      errors.semestre = 'El semestre es obligatorio';
    } else if (!SEMESTRES_VALIDOS.includes(semestre)) {
      errors.semestre = 'Selecciona un semestre válido';
    }

    if (requirePassword && !state.password.trim()) {
      errors.password = 'La contraseña es obligatoria';
    }

    setErrors(errors);
    return Object.values(errors).every(message => !message);
  };

  const handleCreateSubmit = async () => {
    if (!validateForm(form, { requirePassword: true, setErrors: setCreateErrors })) return;

    setSaving(true);
    setMessage(null);
    try {
      const sedeCanon = matchSede(form.sede);
      const semestreValue = form.semestre.trim();
      const payload = {
        nombre: capitalizeWords(form.nombre),
        apellido: capitalizeWords(form.apellido),
        email: sanitize(form.email).toLowerCase(),
        telefono: normalizePhone(form.telefono),
        carrera: sanitize(form.carrera),
        sede: sedeCanon,
        semestre: semestreValue,
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

      setMessage({ type: 'success', text: 'Estudiante creado correctamente.' });
      setCreateOpen(false);
      resetForm();
      await fetchStudents();
    } catch (error: any) {
      console.error('Error al crear estudiante', error);
      setMessage({ type: 'error', text: error?.message || 'No se pudo crear el estudiante.' });
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
      sede: matchSede(String(student.sede ?? '')) || '',
      semestre: SEMESTRES_VALIDOS.includes(String(student.semestre ?? '').trim())
        ? String(student.semestre)
        : '',
      password: '',
    });
    setEditErrors(EMPTY_ERRORS);
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selected) return;
    const partial: StudentFormState = { ...editForm, password: '' };
    if (!validateForm(partial, { requirePassword: false, setErrors: setEditErrors })) return;

    setSaving(true);
    setMessage(null);
    try {
      const sedeCanon = matchSede(editForm.sede);
      const semestreValue = editForm.semestre.trim();
      const payload = {
        nombre: capitalizeWords(editForm.nombre),
        apellido: capitalizeWords(editForm.apellido),
        email: sanitize(editForm.email).toLowerCase(),
        telefono: normalizePhone(editForm.telefono),
        carrera: sanitize(editForm.carrera),
        sede: sedeCanon,
        semestre: semestreValue,
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

      setMessage({ type: 'success', text: 'Estudiante actualizado correctamente.' });
      setEditOpen(false);
      resetEditState();
      await fetchStudents();
    } catch (error: any) {
      console.error('Error al actualizar estudiante', error);
      setMessage({ type: 'error', text: error?.message || 'No se pudo actualizar el estudiante.' });
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
          } else if (key === 'sede') {
            const canonical = matchSede(String(value));
            if (!canonical) {
              errors.push(`Fila ${index + 2}: La sede debe ser una de: ${SEDES_VALIDAS.join(', ')}`);
            }
          } else if (key === 'semestre') {
            const normalizedSemestre = String(value).trim();
            if (!SEMESTRES_VALIDOS.includes(normalizedSemestre)) {
              errors.push(`Fila ${index + 2}: El semestre debe estar entre ${SEMESTRES_VALIDOS.join(', ')}`);
            }
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
          sede: matchSede(row.sede) || sanitize(row.sede),
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
        text: `Estudiantes creados: ${results.exitosos}. Contraseñas temporales: ${results.detalles.join(' | ')}`,
      });
      setMessage({ type: 'success', text: `Se importaron ${results.exitosos} estudiantes correctamente.` });
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');
    XLSX.writeFile(workbook, 'plantilla_estudiantes.xlsx');
  };

  const totalActivos = students.filter(student => !student.blocked).length;
  const totalFaltantes = useMemo(
    () => filteredStudents.filter(student => !isStudentComplete(student)).length,
    [filteredStudents],
  );

  return (
    <DashboardTemplate title="Estudiantes">
      <Stack spacing={4} sx={{ py: 4 }}>
        <Stack spacing={1} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestión de estudiantes
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
              Nuevo estudiante
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<UploadIcon />}
              onClick={() => setImportOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Importar estudiantes
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
                <Chip label={`Total estudiantes: ${students.length}`} color="primary" variant="outlined" />
                <Chip label={`Activos: ${totalActivos}`} color="success" variant="outlined" />
                <Chip label={`Resultados: ${filteredStudents.length}`} color="info" variant="outlined" />
                <Chip label={`Faltantes: ${totalFaltantes}`} color="warning" variant="outlined" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No se encontraron estudiantes con los filtros seleccionados.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Ajusta la búsqueda o importa nuevos registros para comenzar.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3, overflowX: 'hidden' }}>
              <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...TABLE_COLUMN_STYLES.nombre }}>
                      <TableSortLabel
                        active={orderBy === 'nombre'}
                        direction={orderBy === 'nombre' ? order : 'asc'}
                        onClick={() => handleRequestSort('nombre')}
                      >
                        <strong>Nombre</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ ...TABLE_COLUMN_STYLES.email }}>
                      <TableSortLabel
                        active={orderBy === 'email'}
                        direction={orderBy === 'email' ? order : 'asc'}
                        onClick={() => handleRequestSort('email')}
                      >
                        <strong>Email</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ ...TABLE_COLUMN_STYLES.telefono }}>
                      <strong>Teléfono</strong>
                    </TableCell>
                    <TableCell sx={{ ...TABLE_COLUMN_STYLES.carrera }}>
                      <TableSortLabel
                        active={orderBy === 'carrera'}
                        direction={orderBy === 'carrera' ? order : 'asc'}
                        onClick={() => handleRequestSort('carrera')}
                      >
                        <strong>Carrera</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ ...TABLE_COLUMN_STYLES.sede }}>
                      <TableSortLabel
                        active={orderBy === 'sede'}
                        direction={orderBy === 'sede' ? order : 'asc'}
                        onClick={() => handleRequestSort('sede')}
                      >
                        <strong>Sede</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ ...TABLE_COLUMN_STYLES.semestre }}>
                      <TableSortLabel
                        active={orderBy === 'semestre'}
                        direction={orderBy === 'semestre' ? order : 'asc'}
                        onClick={() => handleRequestSort('semestre')}
                      >
                        <strong>Semestre</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ ...TABLE_COLUMN_STYLES.estado }}>
                      <strong>Estado</strong>
                    </TableCell>
                    <TableCell align="center" sx={{ ...TABLE_COLUMN_STYLES.acciones }}>
                      <strong></strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedStudents.map(student => {
                    const complete = isStudentComplete(student);
                    const sedeDisplay = student.sede || '—';
                    const semestreDisplay = student.semestre || '—';

                    return (
                      <TableRow
                        key={student.id}
                        hover
                        sx={{
                          backgroundColor: complete ? 'inherit' : 'rgba(255, 244, 229, 0.6)',
                          '&:last-of-type td, &:last-of-type th': { border: 0 },
                          height: 64,
                        }}
                      >
                        <TableCell sx={{ ...TABLE_COLUMN_STYLES.nombre, verticalAlign: 'middle' }}>
                          <Tooltip title={`${student.nombre} ${student.apellido}`}>
                            <Typography
                              fontWeight={600}
                              color="text.primary"
                              noWrap
                              sx={{ display: 'block' }}
                            >
                              {student.nombre} {student.apellido}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ ...TABLE_COLUMN_STYLES.email, verticalAlign: 'middle' }}>
                          <Tooltip title={student.email}>
                            <Typography color="text.secondary" noWrap sx={{ display: 'block' }}>
                              {student.email}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ ...TABLE_COLUMN_STYLES.telefono, verticalAlign: 'middle' }}>
                          <Typography color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {student.telefono || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...TABLE_COLUMN_STYLES.carrera, verticalAlign: 'middle' }}>
                          {student.carrera ? (
                            <Tooltip title={student.carrera}>
                              <Chip
                                label={student.carrera}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={CHIP_STYLES}
                              />
                            </Tooltip>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell sx={{ ...TABLE_COLUMN_STYLES.sede, verticalAlign: 'middle' }}>
                          {student.sede ? (
                            <Tooltip title={sedeDisplay}>
                              <Chip
                                label={sedeDisplay}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={CHIP_STYLES}
                              />
                            </Tooltip>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell sx={{ ...TABLE_COLUMN_STYLES.semestre, verticalAlign: 'middle' }}>
                          {student.semestre ? (
                            <Tooltip title={semestreDisplay}>
                              <Chip
                                label={semestreDisplay}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={CHIP_STYLES}
                              />
                            </Tooltip>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ ...TABLE_COLUMN_STYLES.estado, verticalAlign: 'middle' }}>
                          {complete ? (
                            <Tooltip title="Estudiante con información completa">
                              <CheckIcon color="success" fontSize="small" />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Información incompleta. Revisa los datos del estudiante.">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            ...TABLE_COLUMN_STYLES.acciones,
                            verticalAlign: 'middle',
                            py: 1,
                          }}
                        >
                          <Tooltip title="Editar estudiante">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => openEdit(student)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              display="flex"
              justifyContent={{ xs: 'center', sm: 'space-between' }}
              alignItems="center"
              flexWrap="wrap"
              gap={2}
              mt={3}
            >
              <TextField
                select
                size="small"
                label="Filas por página"
                value={String(rowsPerPage)}
                onChange={handleRowsPerPageChange}
                sx={{ width: 180 }}
              >
                {ROWS_PER_PAGE_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              {totalPages > 1 && (
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                />
              )}
            </Box>
          </>
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
        <DialogTitle>Agregar estudiante</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={event => setForm(prev => ({ ...prev, nombre: event.target.value }))}
                onBlur={event => setForm(prev => ({ ...prev, nombre: capitalizeWords(event.target.value) }))}
                error={Boolean(createErrors.nombre)}
                helperText={createErrors.nombre}
                fullWidth
              />
              <TextField
                label="Apellido"
                value={form.apellido}
                onChange={event => setForm(prev => ({ ...prev, apellido: event.target.value }))}
                onBlur={event => setForm(prev => ({ ...prev, apellido: capitalizeWords(event.target.value) }))}
                error={Boolean(createErrors.apellido)}
                helperText={createErrors.apellido}
                fullWidth
              />
            </Stack>
            <TextField
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
              error={Boolean(createErrors.email)}
              helperText={createErrors.email}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={form.telefono}
              onChange={event => setForm(prev => ({ ...prev, telefono: event.target.value }))}
              error={Boolean(createErrors.telefono)}
              helperText={createErrors.telefono}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                fullWidth
                freeSolo
                options={carrerasDisponibles}
                value={form.carrera}
                onChange={(_event, newValue) =>
                  setForm(prev => ({ ...prev, carrera: (newValue as string) || '' }))
                }
                onInputChange={(_event, newInputValue) =>
                  setForm(prev => ({ ...prev, carrera: newInputValue }))
                }
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Carrera"
                    error={Boolean(createErrors.carrera)}
                    helperText={createErrors.carrera}
                  />
                )}
              />
              <Autocomplete
                fullWidth
                options={SEDES_VALIDAS}
                value={form.sede || null}
                onChange={(_event, newValue) =>
                  setForm(prev => ({ ...prev, sede: (newValue as string) || '' }))
                }
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Sede"
                    error={Boolean(createErrors.sede)}
                    helperText={createErrors.sede}
                  />
                )}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Semestre"
                value={form.semestre}
                onChange={event => setForm(prev => ({ ...prev, semestre: event.target.value }))}
                error={Boolean(createErrors.semestre)}
                helperText={createErrors.semestre}
                fullWidth
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="" disabled>
                  Selecciona un semestre
                </MenuItem>
                {SEMESTRES_VALIDOS.map(semestre => (
                  <MenuItem key={semestre} value={semestre}>
                    Semestre {semestre}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Contraseña temporal"
                type="password"
                value={form.password}
                onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                error={Boolean(createErrors.password)}
                helperText={
                  createErrors.password || 'La contraseña inicial puede ser cambiada por el estudiante luego.'
                }
                fullWidth
              />
            </Stack>
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
            {saving ? 'Creando…' : 'Crear estudiante'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => {
          if (!saving) {
            setEditOpen(false);
            resetEditState();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar estudiante</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Nombre"
                value={editForm.nombre}
                onChange={event => setEditForm(prev => ({ ...prev, nombre: event.target.value }))}
                onBlur={event => setEditForm(prev => ({ ...prev, nombre: capitalizeWords(event.target.value) }))}
                error={Boolean(editErrors.nombre)}
                helperText={editErrors.nombre}
                fullWidth
              />
              <TextField
                label="Apellido"
                value={editForm.apellido}
                onChange={event => setEditForm(prev => ({ ...prev, apellido: event.target.value }))}
                onBlur={event => setEditForm(prev => ({ ...prev, apellido: capitalizeWords(event.target.value) }))}
                error={Boolean(editErrors.apellido)}
                helperText={editErrors.apellido}
                fullWidth
              />
            </Stack>
            <TextField
              label="Correo electrónico"
              type="email"
              value={editForm.email}
              onChange={event => setEditForm(prev => ({ ...prev, email: event.target.value }))}
              error={Boolean(editErrors.email)}
              helperText={editErrors.email}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={editForm.telefono}
              onChange={event => setEditForm(prev => ({ ...prev, telefono: event.target.value }))}
              error={Boolean(editErrors.telefono)}
              helperText={editErrors.telefono}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                fullWidth
                freeSolo
                options={carrerasDisponibles}
                value={editForm.carrera}
                onChange={(_event, newValue) =>
                  setEditForm(prev => ({ ...prev, carrera: (newValue as string) || '' }))
                }
                onInputChange={(_event, newInputValue) =>
                  setEditForm(prev => ({ ...prev, carrera: newInputValue }))
                }
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Carrera"
                    error={Boolean(editErrors.carrera)}
                    helperText={editErrors.carrera}
                  />
                )}
              />
              <Autocomplete
                fullWidth
                options={SEDES_VALIDAS}
                value={editForm.sede || null}
                onChange={(_event, newValue) =>
                  setEditForm(prev => ({ ...prev, sede: (newValue as string) || '' }))
                }
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Sede"
                    error={Boolean(editErrors.sede)}
                    helperText={editErrors.sede}
                  />
                )}
              />
            </Stack>
            <TextField
              select
              label="Semestre"
              value={editForm.semestre}
              onChange={event => setEditForm(prev => ({ ...prev, semestre: event.target.value }))}
              error={Boolean(editErrors.semestre)}
              helperText={editErrors.semestre}
              fullWidth
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="" disabled>
                Selecciona un semestre
              </MenuItem>
              {SEMESTRES_VALIDOS.map(semestre => (
                <MenuItem key={semestre} value={semestre}>
                  Semestre {semestre}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!saving) {
                setEditOpen(false);
                resetEditState();
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
        <DialogTitle>Importar estudiantes</DialogTitle>
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
              Se importarán {importRows.length} estudiantes. Las contraseñas temporales se muestran junto al correo para que
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

export default CoordinadorEstudiantes;
