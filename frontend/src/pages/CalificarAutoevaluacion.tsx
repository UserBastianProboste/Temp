import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  Snackbar,
  Chip,
  Divider,
} from "@mui/material";
import DashboardTemplate from "../components/DashboardTemplate";
import {
  getAutoevaluacionPorId,
  getPracticaEstudiantePorId,
  calcularNotaAutoevaluacion,
  guardarNotaAutoevaluacion,
} from "../services/autoevaluacion";

const CalificarAutoevaluacion: React.FC = () => {
  const { autoevaluacionId } = useParams<{ autoevaluacionId: string }>();
  const navigate = useNavigate();

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");

  const [autoevaluacion, setAutoevaluacion] = useState<any>(null);
  const [practica, setPractica] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notaCalculada, setNotaCalculada] = useState<number | null>(null);
  const [notaPonderada, setNotaPonderada] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const mostrarAlerta = (
    mensaje: string,
    severity: "success" | "error" | "warning" | "info" = "info"
  ) => {
    setAlertMessage(mensaje);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  useEffect(() => {
    if (!autoevaluacionId) {
      mostrarAlerta("ID de autoevaluación no proporcionado", "error");
      return;
    }

    const cargarDatos = async () => {
      try {
        // Cargar autoevaluación
        const autoeval = await getAutoevaluacionPorId(autoevaluacionId);
        setAutoevaluacion(autoeval);

        // Cargar práctica asociada
        const practicaData = await getPracticaEstudiantePorId(autoeval.practica_id);
        setPractica(practicaData);

        // Calcular nota si no existe
        if (autoeval.nota_autoevaluacion !== null && autoeval.nota_autoevaluacion !== undefined) {
          // Ya tiene nota guardada, recalcular la nota original
          const notaOriginal = autoeval.nota_autoevaluacion / 0.1;
          setNotaCalculada(notaOriginal);
          setNotaPonderada(autoeval.nota_autoevaluacion);
        } else {
          // Calcular nota automáticamente
          const nota = calcularNotaAutoevaluacion(autoeval);
          setNotaCalculada(nota);
          setNotaPonderada(nota * 0.1);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        mostrarAlerta("Error al cargar la autoevaluación", "error");
        setLoading(false);
      }
    };

    cargarDatos();
  }, [autoevaluacionId]);

  const handleGuardarNota = async () => {
    if (!notaCalculada || !autoevaluacionId) {
      mostrarAlerta("No hay nota calculada para guardar", "error");
      return;
    }

    setGuardando(true);
    try {
      await guardarNotaAutoevaluacion(autoevaluacionId, notaCalculada);
      mostrarAlerta("Nota guardada exitosamente", "success");
      
      // Actualizar el estado local
      setAutoevaluacion({
        ...autoevaluacion,
        nota_autoevaluacion: notaCalculada * 0.1
      });
    } catch (error) {
      console.error("Error al guardar nota:", error);
      mostrarAlerta("Error al guardar la nota", "error");
    } finally {
      setGuardando(false);
    }
  };

  const getRespuestaColor = (respuesta: string) => {
    switch (respuesta) {
      case "Siempre":
        return "success";
      case "Frecuentemente":
        return "info";
      case "A veces":
        return "warning";
      case "Nunca":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <DashboardTemplate title="Calificar Autoevaluación">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <Typography>Cargando...</Typography>
        </Box>
      </DashboardTemplate>
    );
  }

  if (!autoevaluacion || !practica) {
    return (
      <DashboardTemplate title="Calificar Autoevaluación">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <Typography color="error">No se pudo cargar la autoevaluación</Typography>
        </Box>
      </DashboardTemplate>
    );
  }

  return (
    <DashboardTemplate title="Calificar Autoevaluación">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2, mb: 6 }}>
        {/* Información del estudiante */}
        <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                fontWeight: 600,
                color: "primary.main",
              }}
            >
              Información del Estudiante
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Nombre Completo"
                value={`${practica.estudiante?.nombre || ""} ${practica.estudiante?.apellido || ""}`}
                fullWidth
                disabled
                variant="outlined"
                InputProps={{
                  sx: { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
              <TextField
                label="Carrera"
                value={practica.estudiante?.carrera || ""}
                fullWidth
                disabled
                variant="outlined"
                InputProps={{
                  sx: { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
              <TextField
                label="Empresa"
                value={practica.empresa?.razon_social || ""}
                fullWidth
                disabled
                variant="outlined"
                InputProps={{
                  sx: { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
              <TextField
                label="Tipo de Práctica"
                value={practica.tipo_practica || ""}
                fullWidth
                disabled
                variant="outlined"
                InputProps={{
                  sx: { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Nota Calculada */}
        <Card sx={{ borderRadius: 2, boxShadow: 3, bgcolor: "primary.light" }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h5"
              sx={{
                mb: 2,
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                fontWeight: 600,
                color: "primary.contrastText",
                textAlign: { xs: "center", sm: "left" },
              }}
            >
              Nota Calculada
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 3,
                alignItems: "center",
                justifyContent: "space-around",
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "primary.contrastText",
                    mb: 1,
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  }}
                >
                  Nota Original (Escala 1-7)
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: "primary.contrastText",
                    fontSize: { xs: "2rem", sm: "2.5rem" },
                  }}
                >
                  {notaCalculada?.toFixed(2) || "N/A"}
                </Typography>
              </Box>

              <Divider
                orientation="vertical"
                flexItem
                sx={{ display: { xs: "none", sm: "block" }, bgcolor: "primary.contrastText" }}
              />

              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "primary.contrastText",
                    mb: 1,
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  }}
                >
                  Nota Ponderada (10%)
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: "success.light",
                    fontSize: { xs: "2rem", sm: "2.5rem" },
                  }}
                >
                  {notaPonderada?.toFixed(2) || "N/A"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={handleGuardarNota}
                disabled={guardando || autoevaluacion.nota_autoevaluacion !== null}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  fontWeight: 600,
                }}
              >
                {autoevaluacion.nota_autoevaluacion !== null
                  ? "Nota ya Registrada"
                  : guardando
                  ? "Guardando..."
                  : "Registrar Nota"}
              </Button>
              {autoevaluacion.nota_autoevaluacion !== null && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 1,
                    color: "primary.contrastText",
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                  }}
                >
                  Esta autoevaluación ya ha sido calificada
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* I. Gestión profesional */}
        <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem" },
                fontWeight: 600,
              }}
            >
              I. Gestión profesional y aspectos técnicos
            </Typography>

            <TableContainer
              component={Paper}
              sx={{
                width: "100%",
                overflowX: "auto",
              }}
            >
              <Table size="small" sx={{ minWidth: { xs: 300, sm: 600 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontSize: { xs: "0.8rem", sm: "0.9rem" },
                        fontWeight: 600,
                      }}
                    >
                      Criterio
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontSize: { xs: "0.8rem", sm: "0.9rem" },
                        fontWeight: 600,
                      }}
                    >
                      Respuesta
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {[
                    "a) Se desarrollaron labores orientándolas al perfeccionamiento continuo, a la calidad del proceso y resultado.",
                    "b) Se cumplieron las metas del cargo siendo eficiente durante todo el proceso.",
                    "c) Se aplicó el conocimiento adquirido en el proceso formativo, demostrando dominio en los temas y en el quehacer diario.",
                    "d) Se enfrentaron los cambios y/o dificultades que se presentaron durante el periodo de Práctica Profesional sin afectar el rendimiento del trabajo.",
                    "e) Se realizaron las tareas/actividades según un orden sistemático y claro.",
                  ].map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem" } }}
                      >
                        {item}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={autoevaluacion[`gestion_${index}`] || "N/A"}
                          color={getRespuestaColor(
                            autoevaluacion[`gestion_${index}`]
                          )}
                          size="small"
                          sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* II. Aspectos personales */}
        <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem" },
                fontWeight: 600,
              }}
            >
              II. Aspectos personales e interpersonales
            </Typography>

            <TableContainer
              component={Paper}
              sx={{
                width: "100%",
                overflowX: "auto",
              }}
            >
              <Table size="small" sx={{ minWidth: { xs: 300, sm: 600 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontSize: { xs: "0.8rem", sm: "0.9rem" },
                        fontWeight: 600,
                      }}
                    >
                      Criterio
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontSize: { xs: "0.8rem", sm: "0.9rem" },
                        fontWeight: 600,
                      }}
                    >
                      Respuesta
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {[
                    "a) Se tuvo una predisposición positiva en las actividades a realizar y en su etapa de aprendizaje.",
                    "b) Se cumplió con la puntualidad y los deberes/responsabilidades, tanto personales como del equipo de trabajo.",
                    "c) Se estuvo predispuesto a ayudar en actividades orientadas a su puesto y las que no lo estaban, con el fin de obtener mejores resultados como equipo.",
                    "d) Se aportó con ideas en la solución de problemas del cargo y del equipo de trabajo.",
                    "e) Se actuó con iniciativa en momentos claves, al ver problemas en sus actividades y/o con el desarrollo del trabajo en equipo.",
                    "f) Se integró al equipo de trabajo, generando un ambiente grato y productivo.",
                  ].map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem" } }}
                      >
                        {item}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={autoevaluacion[`personales_${index}`] || "N/A"}
                          color={getRespuestaColor(
                            autoevaluacion[`personales_${index}`]
                          )}
                          size="small"
                          sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* III. Percepción y sugerencias */}
        <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontSize: { xs: "1rem", sm: "1.25rem" },
                fontWeight: 600,
              }}
            >
              III. Percepción y Sugerencias
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    fontWeight: 600,
                  }}
                >
                  Aspectos más relevantes que la Escuela debiera potenciar:
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    border: "1px solid",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "0.85rem", sm: "1rem" },
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {autoevaluacion.aspectos_relevantes || "N/A"}
                  </Typography>
                </Paper>
              </Box>

              {autoevaluacion.comentarios && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 1,
                      fontSize: { xs: "0.85rem", sm: "0.95rem" },
                      fontWeight: 600,
                    }}
                  >
                    Comentarios adicionales:
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "grey.300",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: "0.85rem", sm: "1rem" },
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {autoevaluacion.comentarios}
                    </Typography>
                  </Paper>
                </Box>
              )}

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    fontWeight: 600,
                  }}
                >
                  ¿Recomendaría el lugar a otro estudiante?
                </Typography>
                <Chip
                  label={autoevaluacion.recomendacion === "sí" ? "Sí" : "No"}
                  color={autoevaluacion.recomendacion === "sí" ? "success" : "error"}
                  sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                />
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    fontWeight: 600,
                  }}
                >
                  Justificación:
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    border: "1px solid",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "0.85rem", sm: "1rem" },
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {autoevaluacion.justificacion || "N/A"}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Botón para volver */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            sx={{
              px: 4,
              py: 1,
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Volver
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAlertOpen(false)}
          severity={alertSeverity}
          sx={{ width: "100%", fontSize: { xs: "0.85rem", sm: "1rem" } }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </DashboardTemplate>
  );
};

export default CalificarAutoevaluacion;
