import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import DashboardTemplate from '../components/DashboardTemplate';

export default function PreguntasFrecuentes() {
  return (
    <DashboardTemplate title="Preguntas frecuentes">
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Preguntas frecuentes
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Estamos preparando la información más solicitada por los estudiantes. A continuación encontrarás un mock
          temporal mientras definimos los contenidos definitivos.
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="1. Mock" secondary="Respuesta en desarrollo" />
          </ListItem>
          <ListItem>
            <ListItemText primary="r Mock" secondary="Respuesta en desarrollo" />
          </ListItem>
        </List>
      </Box>
    </DashboardTemplate>
  );
}
