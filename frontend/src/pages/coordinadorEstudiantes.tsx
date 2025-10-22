import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment,
  Pagination,
  TableSortLabel,
  Drawer,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import DashboardTemplate from '../components/DashboardTemplate';
import { supabase } from '../services/supabaseClient';
import * as XLSX from 'xlsx';

type OrderBy = 'nombre' | 'email' | 'carrera' | 'sede' | 'created_at';
type Order = 'asc' | 'desc';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  carrera?: string;
  sede?: string;
  created_at: string;
}

interface EstudianteExcel {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  carrera?: string;
  sede?: string;
  password: string; // Para crear la cuenta
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const ITEMS_PER_PAGE = 10;

const CoordinadorEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<EstudianteExcel[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Estados para ordenamiento
  const [orderBy, setOrderBy] = useState<OrderBy>('created_at');
  const [order, setOrder] = useState<Order>('desc');
  
  // Estados para filtros
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterCarrera, setFilterCarrera] = useState<string>('');
  const [filterSede, setFilterSede] = useState<string>('');

  useEffect(() => {
    cargarEstudiantes();
  }, []);

  const cargarEstudiantes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstudiantes(data || []);
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Mapear y validar datos
        const estudiantesData: EstudianteExcel[] = jsonData.map((row: any) => ({
          nombre: row['Nombre'] || row['nombre'] || '',
          apellido: row['Apellido'] || row['apellido'] || '',
          email: row['Email'] || row['email'] || row['Correo'] || row['correo'] || '',
          telefono: row['Teléfono'] || row['telefono'] || row['Telefono'] || '',
          carrera: row['Carrera'] || row['carrera'] || '',
          sede: row['Sede'] || row['sede'] || '',
          password: row['Password'] || row['password'] || row['Contraseña'] || row['contraseña'] || '',
        }));

        // Validar datos
        const errors = validateEstudiantes(estudiantesData);
        setValidationErrors(errors);
        setPreviewData(estudiantesData);
        setUploadDialogOpen(false);
        setPreviewDialogOpen(true);
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        setUploadMessage({ type: 'error', text: 'Error al leer el archivo. Verifica que sea un archivo Excel válido.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateEstudiantes = (data: EstudianteExcel[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sedesValidas = ['Sede Llano', 'Sede Providencia', 'Sede Temuco', 'Sede Talca'];

    data.forEach((estudiante, index) => {
      const row = index + 2; // +2 porque Excel empieza en 1 y tiene header

      if (!estudiante.nombre || estudiante.nombre.trim() === '') {
        errors.push({ row, field: 'nombre', message: 'El nombre es obligatorio' });
      }

      if (!estudiante.apellido || estudiante.apellido.trim() === '') {
        errors.push({ row, field: 'apellido', message: 'El apellido es obligatorio' });
      }

      if (!estudiante.email || estudiante.email.trim() === '') {
        errors.push({ row, field: 'email', message: 'El email es obligatorio' });
      } else if (!emailRegex.test(estudiante.email)) {
        errors.push({ row, field: 'email', message: 'Email inválido' });
      }

      if (!estudiante.password || estudiante.password.trim() === '') {
        errors.push({ row, field: 'password', message: 'La contraseña es obligatoria' });
      } else if (estudiante.password.length < 6) {
        errors.push({ row, field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // Validar sede si está presente
      if (estudiante.sede && estudiante.sede.trim() !== '') {
        const sedeNormalizada = estudiante.sede.trim();
        const sedeValida = sedesValidas.some(
          (sede) => sede.toLowerCase() === sedeNormalizada.toLowerCase()
        );
        if (!sedeValida) {
          errors.push({
            row,
            field: 'sede',
            message: `Sede inválida. Debe ser: ${sedesValidas.join(', ')}`
          });
        }
      }
    });

    return errors;
  };

  const handleConfirmUpload = async () => {
    if (validationErrors.length > 0) {
      setUploadMessage({ type: 'error', text: 'Por favor corrige los errores antes de continuar' });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    const results = {
      exitosos: 0,
      fallidos: 0,
      errores: [] as string[],
    };

    for (const estudiante of previewData) {
      try {
        // 1. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: estudiante.email,
          password: estudiante.password,
          options: {
            data: {
              role: 'estudiante',
              full_name: `${estudiante.nombre} ${estudiante.apellido}`,
            },
          },
        });

        if (authError) {
          results.fallidos++;
          results.errores.push(`${estudiante.email}: ${authError.message}`);
          continue;
        }

        if (!authData.user) {
          results.fallidos++;
          results.errores.push(`${estudiante.email}: No se pudo crear el usuario`);
          continue;
        }

        // 2. Crear registro en la tabla estudiantes
        const estudianteData: any = {
          user_id: authData.user.id,
          nombre: estudiante.nombre.trim(),
          apellido: estudiante.apellido.trim(),
          email: estudiante.email.trim().toLowerCase(),
          telefono: estudiante.telefono?.trim() || null,
          carrera: estudiante.carrera?.trim() || null,
        };

        // Normalizar y agregar sede si tiene valor
        if (estudiante.sede?.trim()) {
          const sedesValidas = ['Sede Llano', 'Sede Providencia', 'Sede Temuco', 'Sede Talca'];
          const sedeInput = estudiante.sede.trim();
          // Buscar la sede válida que coincida (case-insensitive)
          const sedeNormalizada = sedesValidas.find(
            (sede) => sede.toLowerCase() === sedeInput.toLowerCase()
          );
          if (sedeNormalizada) {
            estudianteData.sede = sedeNormalizada;
          }
        }

        const { error: dbError } = await supabase.from('estudiantes').insert(estudianteData);

        if (dbError) {
          results.fallidos++;
          results.errores.push(`${estudiante.email}: Error en BD - ${dbError.message}`);
        } else {
          results.exitosos++;
        }
      } catch (error: any) {
        results.fallidos++;
        results.errores.push(`${estudiante.email}: ${error.message || 'Error desconocido'}`);
      }
    }

    setUploading(false);

    if (results.exitosos > 0) {
      await cargarEstudiantes();
    }

    if (results.fallidos === 0) {
      setUploadMessage({
        type: 'success',
        text: `✅ Se crearon ${results.exitosos} estudiantes exitosamente`,
      });
      setPreviewDialogOpen(false);
      setPreviewData([]);
    } else {
      setUploadMessage({
        type: 'error',
        text: `Exitosos: ${results.exitosos}, Fallidos: ${results.fallidos}. Errores: ${results.errores.join('; ')}`,
      });
    }
  };

  const descargarPlantilla = () => {
    const template = [
      {
        Nombre: 'Juan',
        Apellido: 'Pérez',
        Email: 'juan.perez@ejemplo.cl',
        Teléfono: '+56912345678',
        Carrera: 'Ingeniería Civil',
        Sede: 'Sede Llano',
        Password: 'temporal123',
      },
      {
        Nombre: 'María',
        Apellido: 'González',
        Email: 'maria.gonzalez@ejemplo.cl',
        Teléfono: '+56987654321',
        Carrera: 'Ingeniería Comercial',
        Sede: 'Sede Temuco',
        Password: 'temporal456',
      },
      {
        Nombre: 'Pedro',
        Apellido: 'López',
        Email: 'pedro.lopez@ejemplo.cl',
        Teléfono: '+56911223344',
        Carrera: 'Derecho',
        Sede: 'Sede Providencia',
        Password: 'temporal789',
      },
      {
        Nombre: 'Ana',
        Apellido: 'Martínez',
        Email: 'ana.martinez@ejemplo.cl',
        Teléfono: '+56955667788',
        Carrera: 'Psicología',
        Sede: 'Sede Talca',
        Password: 'temporal012',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    
    // Agregar nota con las sedes válidas
    XLSX.utils.sheet_add_aoa(ws, [
      [''],
      ['NOTA: Las sedes válidas son:'],
      ['- Sede Llano'],
      ['- Sede Providencia'],
      ['- Sede Temuco'],
      ['- Sede Talca']
    ], { origin: -1 });
    
    XLSX.writeFile(wb, 'plantilla_estudiantes.xlsx');
  };

  const filteredEstudiantes = estudiantes.filter((est) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      est.nombre.toLowerCase().includes(searchLower) ||
      est.apellido.toLowerCase().includes(searchLower) ||
      est.email.toLowerCase().includes(searchLower) ||
      est.carrera?.toLowerCase().includes(searchLower) ||
      est.sede?.toLowerCase().includes(searchLower);
    
    const matchesCarrera = !filterCarrera || est.carrera === filterCarrera;
    const matchesSede = !filterSede || est.sede === filterSede;
    
    return matchesSearch && matchesCarrera && matchesSede;
  });

  // Ordenamiento
  const sortedEstudiantes = [...filteredEstudiantes].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (orderBy) {
      case 'nombre':
        aValue = `${a.nombre} ${a.apellido}`.toLowerCase();
        bValue = `${b.nombre} ${b.apellido}`.toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'carrera':
        aValue = (a.carrera || '').toLowerCase();
        bValue = (b.carrera || '').toLowerCase();
        break;
      case 'sede':
        aValue = (a.sede || '').toLowerCase();
        bValue = (b.sede || '').toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return order === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Paginación
  const totalPages = Math.ceil(sortedEstudiantes.length / ITEMS_PER_PAGE);
  const paginatedEstudiantes = sortedEstudiantes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setCurrentPage(1); // Resetear a primera página al ordenar
  };

  const handleClearFilters = () => {
    setFilterCarrera('');
    setFilterSede('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterCarrera !== '' || filterSede !== '' || searchTerm !== '';

  // Obtener listas únicas para los filtros
  const carrerasUnicas = Array.from(new Set(estudiantes.map(e => e.carrera).filter(Boolean))).sort();
  const sedesUnicas = Array.from(new Set(estudiantes.map(e => e.sede).filter(Boolean))).sort();

  return (
    <DashboardTemplate title="Gestión de Estudiantes">
      <Box sx={{ py: 3 }}>
        {/* Header con acciones */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#da291c', fontWeight: 600 }}>
              Estudiantes Registrados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total: {estudiantes.length} estudiantes
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={descargarPlantilla}
              sx={{ borderColor: '#da291c', color: '#da291c', '&:hover': { borderColor: '#f75b50', bgcolor: 'rgba(218, 41, 28, 0.04)' } }}
            >
              Descargar Plantilla
            </Button>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
              sx={{ bgcolor: '#da291c', '&:hover': { bgcolor: '#4c0601' } }}
            >
              Carga Masiva
            </Button>
          </Box>
        </Box>

        {/* Mensajes */}
        {uploadMessage && (
          <Alert severity={uploadMessage.type} sx={{ mb: 3 }} onClose={() => setUploadMessage(null)}>
            {uploadMessage.text}
          </Alert>
        )}

        {/* Búsqueda y Filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="Buscar por nombre, email, carrera o sede..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setFilterDrawerOpen(true)}
                sx={{ 
                  borderColor: hasActiveFilters ? '#da291c' : '#bdbdbd',
                  color: hasActiveFilters ? '#da291c' : '#757575',
                  bgcolor: hasActiveFilters ? 'rgba(218, 41, 28, 0.04)' : 'transparent',
                  '&:hover': { 
                    borderColor: '#da291c', 
                    bgcolor: 'rgba(218, 41, 28, 0.08)' 
                  },
                  minWidth: '120px'
                }}
              >
                Filtros {hasActiveFilters && `(${[filterCarrera, filterSede, searchTerm].filter(Boolean).length})`}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Tabla de estudiantes */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#da291c' }} />
          </Box>
        ) : filteredEstudiantes.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 8, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {!searchTerm && 'Usa la carga masiva para agregar estudiantes'}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ boxShadow: 2, mb: 3 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#fafafa' }}>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'nombre'}
                        direction={orderBy === 'nombre' ? order : 'asc'}
                        onClick={() => handleRequestSort('nombre')}
                      >
                        <strong>Nombre</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'email'}
                        direction={orderBy === 'email' ? order : 'asc'}
                        onClick={() => handleRequestSort('email')}
                      >
                        <strong>Email</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell><strong>Teléfono</strong></TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'carrera'}
                        direction={orderBy === 'carrera' ? order : 'asc'}
                        onClick={() => handleRequestSort('carrera')}
                      >
                        <strong>Carrera</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'sede'}
                        direction={orderBy === 'sede' ? order : 'asc'}
                        onClick={() => handleRequestSort('sede')}
                      >
                        <strong>Sede</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'created_at'}
                        direction={orderBy === 'created_at' ? order : 'asc'}
                        onClick={() => handleRequestSort('created_at')}
                      >
                        <strong>Fecha Registro</strong>
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedEstudiantes.map((estudiante) => (
                    <TableRow key={estudiante.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon sx={{ color: '#da291c', fontSize: 20 }} />
                          <strong>{estudiante.nombre} {estudiante.apellido}</strong>
                        </Box>
                      </TableCell>
                      <TableCell>{estudiante.email}</TableCell>
                      <TableCell>{estudiante.telefono || '-'}</TableCell>
                      <TableCell>
                        {estudiante.carrera ? (
                          <Chip label={estudiante.carrera} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }} />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {estudiante.sede ? (
                          <Chip label={estudiante.sede} size="small" sx={{ bgcolor: '#fff5f5', color: '#da291c' }} />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{new Date(estudiante.created_at).toLocaleDateString('es-CL')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Paginación */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: '#da291c',
                    },
                    '& .Mui-selected': {
                      bgcolor: '#da291c !important',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#4c0601 !important',
                      },
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}

        {/* Dialog para subir archivo */}
        <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: '#da291c', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UploadIcon />
              Carga Masiva de Estudiantes
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Formato requerido:</strong> Archivo Excel (.xlsx) con las columnas:<br />
              Nombre, Apellido, Email, Teléfono, Carrera, Sede, Password
            </Alert>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>Sedes válidas:</strong><br />
              • Sede Llano<br />
              • Sede Providencia<br />
              • Sede Temuco<br />
              • Sede Talca
            </Alert>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <input
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                id="upload-file"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="upload-file">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  size="large"
                  sx={{ bgcolor: '#da291c', '&:hover': { bgcolor: '#4c0601' } }}
                >
                  Seleccionar Archivo Excel
                </Button>
              </label>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>Cancelar</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de vista previa */}
        <Dialog open={previewDialogOpen} onClose={() => !uploading && setPreviewDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ bgcolor: validationErrors.length > 0 ? '#fff3e0' : '#e8f5e9' }}>
            Vista Previa - {previewData.length} estudiantes
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <strong>Se encontraron {validationErrors.length} errores:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {validationErrors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>
                      Fila {error.row}, campo "{error.field}": {error.message}
                    </li>
                  ))}
                  {validationErrors.length > 5 && <li>... y {validationErrors.length - 5} errores más</li>}
                </ul>
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>#</strong></TableCell>
                    <TableCell><strong>Nombre</strong></TableCell>
                    <TableCell><strong>Apellido</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Carrera</strong></TableCell>
                    <TableCell><strong>Sede</strong></TableCell>
                    <TableCell><strong>Estado</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((est, idx) => {
                    const rowErrors = validationErrors.filter((e) => e.row === idx + 2);
                    const hasError = rowErrors.length > 0;
                    return (
                      <TableRow key={idx} sx={{ bgcolor: hasError ? '#ffebee' : 'inherit' }}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{est.nombre}</TableCell>
                        <TableCell>{est.apellido}</TableCell>
                        <TableCell>{est.email}</TableCell>
                        <TableCell>{est.carrera || '-'}</TableCell>
                        <TableCell>{est.sede || '-'}</TableCell>
                        <TableCell>
                          {hasError ? (
                            <Tooltip title={rowErrors.map((e) => e.message).join(', ')}>
                              <CancelIcon sx={{ color: 'error.main' }} />
                            </Tooltip>
                          ) : (
                            <CheckCircleIcon sx={{ color: 'success.main' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmUpload}
              disabled={validationErrors.length > 0 || uploading}
              sx={{ bgcolor: '#da291c', '&:hover': { bgcolor: '#4c0601' } }}
            >
              {uploading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Confirmar y Crear Estudiantes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Drawer de Filtros */}
        <Drawer
          anchor="right"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
        >
          <Box sx={{ width: 320, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Filtros</Typography>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                sx={{ 
                  color: '#da291c',
                  '&:hover': { bgcolor: 'rgba(218, 41, 28, 0.08)' }
                }}
              >
                Limpiar
              </Button>
            </Box>
            
            <Divider sx={{ mb: 3 }} />

            {/* Filtro por Carrera */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="filter-carrera-label">Carrera</InputLabel>
              <Select
                labelId="filter-carrera-label"
                id="filter-carrera"
                value={filterCarrera}
                label="Carrera"
                onChange={(e) => {
                  setFilterCarrera(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="">
                  <em>Todas las carreras</em>
                </MenuItem>
                {carrerasUnicas.map((carrera) => (
                  <MenuItem key={carrera} value={carrera}>
                    {carrera}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Filtro por Sede */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="filter-sede-label">Sede</InputLabel>
              <Select
                labelId="filter-sede-label"
                id="filter-sede"
                value={filterSede}
                label="Sede"
                onChange={(e) => {
                  setFilterSede(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="">
                  <em>Todas las sedes</em>
                </MenuItem>
                {sedesUnicas.map((sede) => (
                  <MenuItem key={sede} value={sede}>
                    {sede}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Información de resultados */}
            <Collapse in={hasActiveFilters}>
              <Alert severity="info" sx={{ mt: 2 }}>
                Mostrando {filteredEstudiantes.length} de {estudiantes.length} estudiantes
              </Alert>
            </Collapse>
          </Box>
        </Drawer>
      </Box>
    </DashboardTemplate>
  );
};

export default CoordinadorEstudiantes;
