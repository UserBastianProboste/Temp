import { Box, Typography } from '@mui/material';
import DashboardTemplate from '../../../../consultoria_informatica/frontend/src/components/DashboardTemplate';

const CoordinadorEstudiantes = () => (
  <DashboardTemplate title="Seguimiento de estudiantes">
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Estudiantes asignados
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Aquí podrás revisar el avance y estado de los estudiantes en sus prácticas profesionales.
      </Typography>
    </Box>
  </DashboardTemplate>
);

export default CoordinadorEstudiantes;
