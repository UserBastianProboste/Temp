import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Snackbar } from "@mui/material";
import DashboardTemplate from "../../../../consultoria_informatica/frontend/src/components/DashboardTemplate";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import { guardarAutoevaluacion, getAutoevaluacion, getPracticaEstudiantePorId } from "../../../../consultoria_informatica/frontend/src/services/autoevaluacion";

const criterios = ["Siempre", "Frecuentemente", "A veces", "Nunca"];

const Autoevaluacion: React.FC = () => {
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");

  const mostrarAlerta = (
    mensaje: string,
    severity: "success" | "error" | "warning" | "info" = "info"
  ) => {
    setAlertMessage(mensaje);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };
  const [estudiante, setEstudiante] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [yaEnviado, setYaEnviado] = useState(false);

  const calcularDias = (inicio: string, termino: string) => {
    const start = new Date(inicio);
    const end = new Date(termino);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const [datos, setDatos] = useState<{ estudiante: any, practica: any, empresa: any } | null>(null);

  const { practicaId } = useParams() as { practicaId: string };

  useEffect(() => {
    if (!practicaId) return;

    async function cargarDatosPractica() {
      try {
        // Traer solo la práctica seleccionada por ID
        const practicaSeleccionada = await getPracticaEstudiantePorId(practicaId);

        setEstudiante(practicaSeleccionada.estudiante);

        const initialForm = {
          lugar: practicaSeleccionada.actividades || "",
          departamento: practicaSeleccionada.departamento || "",
          cargo: practicaSeleccionada.cargo_por_desarrollar || "",
          dias_trabajados: calcularDias(practicaSeleccionada.fecha_inicio, practicaSeleccionada.fecha_termino),
          horario: practicaSeleccionada.horario_trabajo || "",
        };

        const { data: autoeval } = await getAutoevaluacion(practicaSeleccionada.id);

        if (autoeval && autoeval.length > 0) {
          setForm({ ...initialForm, ...autoeval[0] });
          setYaEnviado(true);
        } else {
          setForm(initialForm);
        }

        setDatos({ estudiante: practicaSeleccionada.estudiante, practica: practicaSeleccionada, empresa: practicaSeleccionada.empresa });
      } catch (error) {
        console.error("Error al cargar datos de la práctica:", error);
        setEstudiante(false);
      }
    }

    cargarDatosPractica();
  }, [practicaId]);

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleEnviar = async () => {
    const camposObligatorios = [
      "aspectos_relevantes", "recomendacion", "justificacion",
      ...Array.from({ length: 5 }, (_, i) => `gestion_${i}`),
      ...Array.from({ length: 6 }, (_, i) => `personales_${i}`)
    ];

    const faltantes = camposObligatorios.filter((campo) => !form[campo]);
    if (faltantes.length > 0) {
      mostrarAlerta("Debes completar todos los campos obligatorios antes de continuar.", "warning");
      return;
    }

    const payload = {
      practica_id: datos?.practica.id,
      gestion_0: form.gestion_0,
      gestion_1: form.gestion_1,
      gestion_2: form.gestion_2,
      gestion_3: form.gestion_3,
      gestion_4: form.gestion_4,
      personales_0: form.personales_0,
      personales_1: form.personales_1,
      personales_2: form.personales_2,
      personales_3: form.personales_3,
      personales_4: form.personales_4,
      personales_5: form.personales_5,
      aspectos_relevantes: form.aspectos_relevantes,
      comentarios: form.comentarios || "",
      recomendacion: form.recomendacion,
      justificacion: form.justificacion,
    };

    try {
      await guardarAutoevaluacion(payload);
      setYaEnviado(true);
      mostrarAlerta("Autoevaluación enviada correctamente.", "success");
    } catch (err) {
      console.error(err);
      mostrarAlerta("Solo puede enviar una autoevaluación por práctica.", "error");
    }
  };

  if (estudiante === null) return <p>Cargando...</p>;
  if (estudiante === false) return <p>Error al cargar los datos del estudiante</p>;

  return (
    <DashboardTemplate title="Autoevaluación">
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 4, mt: 4, mb: 6 }}
      >
        {/* Datos del estudiante */}
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
          <CardContent
            sx={{
              p: { xs: 2, sm: 3 },
              width: "100%",
              maxWidth: { xs: "100%", sm: "600px", md: "800px" },
              mx: "auto",
            }}
          >
            <Typography
              variant="h3"
              sx={{
                mb: 2,
                fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
                textAlign: { xs: "center", sm: "left" },
              }}
            >
              Autoevaluación Práctica Profesional
            </Typography>

            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem" },
                textAlign: { xs: "center", sm: "left" },
              }}
            >
              Datos del estudiante
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <TextField
                label="Nombre Alumno"
                value={estudiante.nombre + " " + estudiante.apellido}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Carrera"
                value={estudiante.carrera}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Mail"
                value={estudiante.email}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Teléfono de Contacto"
                value={estudiante.telefono || ""}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Lugar donde realizó la práctica"
                value={datos?.empresa.direccion || ""}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Departamento/área"
                value={datos?.practica.departamento || ""}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Cargo desempeñado"
                value={datos?.practica.cargo_por_desarrollar || ""}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Total de días trabajados"
                value={form.dias_trabajados ?? ""}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
              <TextField
                label="Horario"
                value={datos?.practica.horario_trabajo || ""}
                fullWidth
                disabled
                InputProps={{ sx: { fontSize: { xs: "0.9rem", sm: "1rem" } } }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card
          sx={{
            boxShadow: "none",
            width: "100%",
            maxWidth: { xs: "100%", sm: "900px" },
            mx: "auto",
            p: { xs: 2, sm: 3 },
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                textAlign: { xs: "center", sm: "left" },
              }}
            >
              Instrucciones para llenar la encuesta:
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                textAlign: "justify",
                lineHeight: { xs: 1.4, sm: 1.6 },
              }}
            >
              A continuación, se presenta una escala de criterios para que Ud. pueda
              evaluar su desempeño en el trabajo realizado durante el período de
              Práctica Profesional.
              Es muy importante que usted realice una
              autoevaluación de su desempeño de manera consciente, seria y objetiva,
              de manera que refleje exactamente lo ocurrido en el periodo de trabajo.
            </Typography>
          </CardContent>
        </Card>

        {/* I. Gestión profesional */}
        <Card
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: 2,
            width: "100%",
            maxWidth: { xs: "100%", sm: "900px" },
            mx: "auto",
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                textAlign: { xs: "center", sm: "left" },
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
              <Table
                size="small"
                sx={{
                  minWidth: 600,
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}
                    >
                      Criterio
                    </TableCell>
                    {criterios.map((c) => (
                      <TableCell
                        key={c}
                        align="center"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem" } }}
                      >
                        {c}
                      </TableCell>
                    ))}
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
                    <TableRow key={index}>
                      <TableCell
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem", md: "1rem" } }}
                      >
                        {item}
                      </TableCell>
                      {criterios.map((c) => (
                        <TableCell key={c} align="center">
                          <Radio
                            checked={form[`gestion_${index}`] === c}
                            onChange={() => handleChange(`gestion_${index}`, c)}
                            sx={{
                              transform: { xs: "scale(0.8)", sm: "scale(0.9)", md: "scale(1)" },
                            }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* II. Aspectos personales */}
        <Card
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: 2,
            width: "100%",
            maxWidth: { xs: "100%", sm: "900px" },
            mx: "auto",
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                textAlign: { xs: "center", sm: "left" },
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
              <Table
                size="small"
                sx={{
                  minWidth: 600,
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}
                    >
                      Criterio
                    </TableCell>
                    {criterios.map((c) => (
                      <TableCell
                        key={c}
                        align="center"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem" } }}
                      >
                        {c}
                      </TableCell>
                    ))}
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
                    <TableRow key={index}>
                      <TableCell
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem", md: "1rem" } }}
                      >
                        {item}
                      </TableCell>
                      {criterios.map((c) => (
                        <TableCell key={c} align="center">
                          <Radio
                            checked={form[`personales_${index}`] === c}
                            onChange={() => handleChange(`personales_${index}`, c)}
                            sx={{
                              transform: { xs: "scale(0.8)", sm: "scale(0.9)", md: "scale(1)" },
                            }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* III. Percepción y sugerencias */}
        <Card
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: 2,
            width: "100%",
            maxWidth: { xs: "100%", sm: "900px" },
            mx: "auto",
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                textAlign: { xs: "center", sm: "left" },
              }}
            >
              III. Percepción y Sugerencias
            </Typography>

            <Typography
              sx={{
                mb: 2,
                fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                textAlign: "justify",
                lineHeight: { xs: 1.4, sm: 1.6 },
              }}
            >
              Sobre la base de la experiencia, mencione los aspectos más relevantes que
              la Escuela debiera potenciar en sus alumnos para un mejor desempeño durante
              su práctica profesional.
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <TextField
                multiline
                rows={4}
                fullWidth
                required
                value={form.aspectos_relevantes || ""}
                onChange={(e) => handleChange("aspectos_relevantes", e.target.value)}
                InputProps={{ sx: { fontSize: { xs: "0.85rem", sm: "1rem" } } }}
              />

              <Typography
                sx={{
                  mb: 2,
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  textAlign: "justify",
                }}
              >
                Señale algún comentario u observación, que usted considere pertinente
                dejar constancia (opcional)
              </Typography>

              <TextField
                multiline
                rows={4}
                fullWidth
                value={form.comentarios || ""}
                onChange={(e) => handleChange("comentarios", e.target.value)}
                InputProps={{ sx: { fontSize: { xs: "0.85rem", sm: "1rem" } } }}
              />

              <Select
                value={form.recomendacion || ""}
                displayEmpty
                fullWidth
                required
                onChange={(e) => handleChange("recomendacion", e.target.value)}
                sx={{
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                }}
              >
                <MenuItem value="">
                  ¿Recomendaría el lugar donde realizó su práctica a otro estudiante de
                  la Universidad?
                </MenuItem>
                <MenuItem value="sí">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>

              <TextField
                label="¿Por qué?"
                multiline
                rows={4}
                fullWidth
                required
                value={form.justificacion || ""}
                onChange={(e) => handleChange("justificacion", e.target.value)}
                InputLabelProps={{ sx: { fontSize: { xs: "0.85rem", sm: "1rem" } } }}
                InputProps={{ sx: { fontSize: { xs: "0.85rem", sm: "1rem" } } }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Botón final */}
        {!yaEnviado ? (
          <Button variant="contained" color="primary" onClick={handleEnviar}>
            Enviar Autoevaluación
          </Button>
        ) : (
          <Typography sx={{ mt: 2, fontWeight: "normal", color: "red" }}>
            Autoevaluación enviada correctamente
          </Typography>
        )}
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

export default Autoevaluacion;
