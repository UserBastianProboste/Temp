import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Pagination,
  CardActions,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Search as SearchIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Feedback as FeedbackIcon,
} from "@mui/icons-material";
import DashboardTemplate from "../components/DashboardTemplate";
import { getAutoevaluacionesConDetalles } from "../services/autoevaluacion";

const ITEMS_PER_PAGE = 10;

const ListaAutoevaluaciones: React.FC = () => {
  const navigate = useNavigate();
  const [autoevaluaciones, setAutoevaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para búsqueda, filtros y paginación
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nombre" | "empresa" | "estado">("nombre");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const cargarAutoevaluaciones = async () => {
      try {
        const data = await getAutoevaluacionesConDetalles();
        setAutoevaluaciones(data || []);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar autoevaluaciones:", err);
        setError("Error al cargar las autoevaluaciones");
        setLoading(false);
      }
    };

    cargarAutoevaluaciones();
  }, []);

  // Filtrar y ordenar autoevaluaciones
  const filteredAndSorted = useMemo(() => {
    let filtered = [...autoevaluaciones];

    // Búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((autoeval) => {
        const estudiante = autoeval.practicas?.estudiantes;
        const empresa = autoeval.practicas?.empresas;
        const nombreCompleto = `${estudiante?.nombre || ""} ${estudiante?.apellido || ""}`.toLowerCase();
        const carrera = estudiante?.carrera?.toLowerCase() || "";
        const empresaNombre = empresa?.razon_social?.toLowerCase() || "";
        
        return (
          nombreCompleto.includes(term) ||
          carrera.includes(term) ||
          empresaNombre.includes(term)
        );
      });
    }

    // Ordenar
    filtered.sort((a, b) => {
      const estudianteA = a.practicas?.estudiantes;
      const estudianteB = b.practicas?.estudiantes;
      const empresaA = a.practicas?.empresas;
      const empresaB = b.practicas?.empresas;

      switch (sortBy) {
        case "nombre":
          const nombreA = `${estudianteA?.nombre || ""} ${estudianteA?.apellido || ""}`;
          const nombreB = `${estudianteB?.nombre || ""} ${estudianteB?.apellido || ""}`;
          return nombreA.localeCompare(nombreB);
        
        case "empresa":
          const empA = empresaA?.razon_social || "";
          const empB = empresaB?.razon_social || "";
          return empA.localeCompare(empB);
        
        case "estado":
          const estadoA = a.nota_autoevaluacion !== null ? 1 : 0;
          const estadoB = b.nota_autoevaluacion !== null ? 1 : 0;
          return estadoA - estadoB;
        
        default:
          return 0;
      }
    });

    return filtered;
  }, [autoevaluaciones, searchTerm, sortBy]);

  // Paginación
  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, currentPage]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCalificar = (autoevaluacionId: string) => {
    navigate(`/coordinador/calificar-autoevaluacion/${autoevaluacionId}`);
  };

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <DashboardTemplate title="Autoevaluaciones de Estudiantes">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress />
        </Box>
      </DashboardTemplate>
    );
  }

  if (error) {
    return (
      <DashboardTemplate title="Autoevaluaciones de Estudiantes">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </DashboardTemplate>
    );
  }

  return (
    <DashboardTemplate title="Autoevaluaciones de Estudiantes">
      <Box sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <FeedbackIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography
            variant="h4"
            sx={{ fontWeight: 600, color: "primary.main" }}
          >
            Autoevaluaciones Completadas
          </Typography>
        </Box>

        {autoevaluaciones.length === 0 ? (
          <Alert severity="info">
            No hay autoevaluaciones registradas aún.
          </Alert>
        ) : (
          <>
            {/* Barra de búsqueda y filtros */}
            <Card sx={{ p: 2, mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                  alignItems: { xs: "stretch", sm: "center" },
                }}
              >
                {/* Barra de búsqueda */}
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por nombre, carrera o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flexGrow: 1 }}
                />

                {/* Selector de ordenamiento */}
                <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "nombre" | "empresa" | "estado")}
                    displayEmpty
                  >
                    <MenuItem value="nombre">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PersonIcon fontSize="small" />
                        Ordenar por nombre
                      </Box>
                    </MenuItem>
                    <MenuItem value="empresa">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <BusinessIcon fontSize="small" />
                        Ordenar por empresa
                      </Box>
                    </MenuItem>
                    <MenuItem value="estado">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <SchoolIcon fontSize="small" />
                        Ordenar por estado
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Contador de resultados */}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {filteredAndSorted.length} {filteredAndSorted.length === 1 ? "resultado" : "resultados"}
                {searchTerm && ` para "${searchTerm}"`}
              </Typography>
            </Card>

            {/* Grid de cards */}
            {paginatedData.length > 0 ? (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                    },
                    gap: 2,
                    mb: 3,
                  }}
                >
                  {paginatedData.map((autoeval: any) => {
                    const estudiante = autoeval.practicas?.estudiantes;
                    const practica = autoeval.practicas;
                    const empresa = practica?.empresas;
                    const calificada = autoeval.nota_autoevaluacion !== null;
                    const nombreCompleto = estudiante
                      ? `${estudiante.nombre} ${estudiante.apellido}`
                      : "Sin información";

                    return (
                      <Card
                        key={autoeval.id}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          transition: "all 0.3s",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: 4,
                          },
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          {/* Avatar y nombre */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                            <Avatar
                              sx={{
                                bgcolor: "primary.main",
                                width: 50,
                                height: 50,
                              }}
                            >
                              {estudiante && getInitials(estudiante.nombre, estudiante.apellido)}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                {nombreCompleto}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {estudiante?.carrera || "Sin carrera"}
                              </Typography>
                            </Box>
                          </Box>

                          <Divider sx={{ mb: 2 }} />

                          {/* Información de la empresa */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                            <BusinessIcon fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {empresa?.razon_social || "Sin empresa"}
                            </Typography>
                          </Box>

                          {/* Tipo de práctica */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                            <SchoolIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {practica?.tipo_practica || "Sin tipo"}
                            </Typography>
                          </Box>

                          {/* Estado */}
                          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                            <Chip
                              label={
                                calificada
                                  ? `Calificada: ${((autoeval.nota_autoevaluacion || 0) * 10).toFixed(1)}`
                                  : "Pendiente"
                              }
                              color={calificada ? "success" : "warning"}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </CardContent>

                        <CardActions sx={{ p: 2, pt: 0 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleCalificar(autoeval.id)}
                          >
                            {calificada ? "Ver Calificación" : "Calificar"}
                          </Button>
                        </CardActions>
                      </Card>
                    );
                  })}
                </Box>

                {/* Paginación */}
                {totalPages > 1 && (
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            ) : (
              <Card sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary">
                  No se encontraron resultados para "{searchTerm}"
                </Typography>
              </Card>
            )}
          </>
        )}
      </Box>
    </DashboardTemplate>
  );
};

export default ListaAutoevaluaciones;
