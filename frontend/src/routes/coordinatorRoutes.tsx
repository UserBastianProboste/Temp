import {
  DashboardCoordinadorPage,
  CoordinadorPracticasPage,
  CoordinadorEstudiantesPage,
  CoordinadorEmpresasPage,
  CoordinadorInformesEstudiantesPage,
  ListaAutoevaluacionesPage,
  CalificarAutoevaluacionPage,
  CoordinadorEvaluarInformePage,
} from './lazyImports';
import type { AppRoute } from './types';

export const coordinatorRoutes: AppRoute[] = [
  { path: 'dashboard', element: <DashboardCoordinadorPage /> },
  { path: 'practicas', element: <CoordinadorPracticasPage /> },
  { path: 'estudiantes', element: <CoordinadorEstudiantesPage /> },
  { path: 'empresas', element: <CoordinadorEmpresasPage /> },
  { path: 'informes-estudiante', element: <CoordinadorInformesEstudiantesPage /> },
  { path: 'evaluar-informe/:informeId', element: <CoordinadorEvaluarInformePage /> },
  { path: 'autoevaluaciones', element: <ListaAutoevaluacionesPage /> },
  { path: 'calificar-autoevaluacion/:autoevaluacionId', element: <CalificarAutoevaluacionPage /> },
];

