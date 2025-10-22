import DashboardTemplate from '../components/DashboardTemplate';
import { EmpresasDirectory } from '../components/EmpresasDirectory';

const CoordinadorEmpresas = () => (
  <DashboardTemplate title="Relación con empresas">
    <EmpresasDirectory
      title="Empresas colaboradoras"
      description="Administra la información de contacto y mantén actualizada la relación con las organizaciones asociadas."
      canManage
    />
  </DashboardTemplate>
);

export default CoordinadorEmpresas;
