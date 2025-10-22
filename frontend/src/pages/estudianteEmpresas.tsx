import DashboardTemplate from '../components/DashboardTemplate';
import { EmpresasDirectory } from '../components/EmpresasDirectory';

const EstudianteEmpresas = () => (
  <DashboardTemplate title="Empresas disponibles">
    <EmpresasDirectory
      title="Empresas colaboradoras"
      description="Explora las organizaciones disponibles para tu práctica profesional y revisa la información de contacto principal."
    />
  </DashboardTemplate>
);

export default EstudianteEmpresas;
