import type { RouteConfig } from './types';
import {
  DashboardCoordinadorPage,
  CoordinadorPracticasPage,
  CoordinadorEstudiantesPage,
  CoordinadorEmpresasPage,
  CoordinadorInformesEstudiantesPage,
  CoordinadorEvaluarInformePage,
  ListaAutoevaluacionesPage,
  CalificarAutoevaluacionPage,
} from './lazyPages';

export const coordinatorRoutes: RouteConfig[] = [
  { path: 'dashboard', element: <DashboardCoordinadorPage /> },
  { path: 'practicas', element: <CoordinadorPracticasPage /> },
  { path: 'estudiantes', element: <CoordinadorEstudiantesPage /> },
  { path: 'empresas', element: <CoordinadorEmpresasPage /> },
  { path: 'informes-estudiante', element: <CoordinadorInformesEstudiantesPage /> },
  { path: 'evaluar-informe/:informeId', element: <CoordinadorEvaluarInformePage /> },
  { path: 'autoevaluaciones', element: <ListaAutoevaluacionesPage /> },
  { path: 'calificar-autoevaluacion/:autoevaluacionId', element: <CalificarAutoevaluacionPage /> },
];
