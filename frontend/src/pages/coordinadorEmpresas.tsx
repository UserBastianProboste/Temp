import { Box, Typography } from '@mui/material';
import DashboardTemplate from '../../../../consultoria_informatica/frontend/src/components/DashboardTemplate';

const CoordinadorEmpresas = () => (
  <DashboardTemplate title="Relación con empresas">
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Empresas colaboradoras
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Desde esta sección podrás administrar la información y convenios con las empresas asociadas.
      </Typography>
    </Box>
  </DashboardTemplate>
);

export default CoordinadorEmpresas;
