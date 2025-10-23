import {
  DashboardEstudiantePage,
  SeleccionPracticaPage,
  AutoevaluacionPage,
  PracticaProfesionalFormPage,
  AdjuntarInformesPage,
  RetroalimentacionPage,
  EstudianteEmpresasPage,
  PreguntasFrecuentesPage,
} from './lazyImports';
import type { AppRoute } from './types';

export const studentRoutes: AppRoute[] = [
  { path: 'dashboard', element: <DashboardEstudiantePage /> },
  { path: 'autoevaluacion', element: <SeleccionPracticaPage /> },
  { path: 'seleccion-practica', element: <SeleccionPracticaPage /> },
  { path: 'autoevaluacion/:practicaId', element: <AutoevaluacionPage /> },
  { path: 'fichapractica', element: <PracticaProfesionalFormPage /> },
  { path: 'adjuntar_informes', element: <AdjuntarInformesPage /> },
  { path: 'retroalimentacion', element: <RetroalimentacionPage /> },
  { path: 'empresas', element: <EstudianteEmpresasPage /> },
  { path: 'preguntas-frecuentes', element: <PreguntasFrecuentesPage /> },
];

