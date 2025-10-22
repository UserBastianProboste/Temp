import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography, Card, CardContent } from "@mui/material";
import Grid from "@mui/material/Grid";
import DashboardTemplate from "../../../../consultoria_informatica/frontend/src/components/DashboardTemplate";
import { getPracticasEstudiante } from "../../../../consultoria_informatica/frontend/src/services/autoevaluacion";

const SeleccionPractica: React.FC = () => {
  const [practicas, setPracticas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getPracticasEstudiante();
        setPracticas(data);
      } catch (error) {
        console.error("Error al obtener prácticas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSeleccion = (id: string) => {
    navigate(`/estudiante/autoevaluacion/${id}`);
  };

  const puedeSeleccionar = (fechaTermino: string) => {
    const hoy = new Date();
    const fechaFin = new Date(fechaTermino);
    return hoy >= fechaFin;
  };

  return (
    <DashboardTemplate title="Autoevaluación">
      <Box sx={{ mt: 4, mb: 6, px: 2 }}>
        {/* Título general */}
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            mb: 8,
            mt: 2,
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
          }}
        >
          Selecciona la práctica para realizar tu autoevaluación
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Typography>Cargando prácticas...</Typography>
          </Box>
        ) : practicas.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Typography color="error">No hay prácticas disponibles.</Typography>
          </Box>
        ) : (
          <Grid container spacing={3} direction="column" alignItems="center">
            {practicas.map((p) => (
              <Grid
                size={{ xs: 12 }}
                key={p.id}
                sx={{ width: { xs: "100%", sm: "70%", md: "50%" } }}
              >
                <Card
                  sx={{
                    p: 3,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: 3,
                  }}
                >
                  <CardContent>
                    <Typography variant="h5" sx={{ mb: 2 }}>
                      {p.tipo_practica}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "nowrap",
                      }}
                    >
                      <Box>
                        <Typography variant="body1">
                          Departamento: {p.departamento}
                        </Typography>
                        <Typography variant="body1">
                          Cargo: {p.cargo_por_desarrollar}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "left" }}>
                        <Typography variant="body1">Estado: {p.estado}</Typography>
                        <Typography variant="body1">
                          Fecha Término: {p.fecha_termino}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <Box sx={{ pt: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      sx={{ py: 2, fontSize: { xs: "1rem", sm: "1.1rem", md: "1.2rem" } }}
                      onClick={() => handleSeleccion(p.id)}
                      disabled={!puedeSeleccionar(p.fecha_termino)}
                    >
                      Seleccionar
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </DashboardTemplate>
  );
};

export default SeleccionPractica;