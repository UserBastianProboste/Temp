import { supabase } from './supabaseClient';

// Entry IDs obtenidos del formulario
const ENTRY_IDS = {
  practica_id: 'entry.732045575',
  estudiante_id: 'entry.1649312725',
  empresa_id: 'entry.198459416',
};

interface PracticaParaFormulario {
  id: string;
  estudiante_id: string;
  estudiante_nombre: string;
  estudiante_apellido: string;
  estudiante_carrera: string;
  empresa_id: string;
  empresa_razon_social: string;
  fecha_inicio: string;
  fecha_termino: string;
}

export const googleFormService = {
  /**
   * Generar URL personalizada del formulario con datos pre-llenados
   */
  generateFormUrl(practica: PracticaParaFormulario): string {
    const params = new URLSearchParams({
      [ENTRY_IDS.practica_id]: practica.id,
      [ENTRY_IDS.estudiante_id]: practica.estudiante_id,
      [ENTRY_IDS.empresa_id]: practica.empresa_id,
    });

    // Usar la URL base correcta (la que obtuvimos)
    return `https://docs.google.com/forms/d/e/1FAIpQLSd168YP6Vu_9Q_vh594aIgdQwYOB7fvbhJnYnGK1-V0iceLWA/viewform?${params.toString()}`;
  },

  /**
   * Obtener datos de práctica y generar formulario
   */
  async generarFormularioParaPractica(practicaId: string) {
    try {
      // 1. Obtener datos completos de la práctica
      const { data: practica, error: practicaError } = await supabase
        .from('practicas')
        .select(`
          id,
          fecha_inicio,
          fecha_termino,
          estudiante_id,
          estudiantes!inner(
            nombre,
            apellido,
            carrera,
            email
          ),
          empresa_id,
          empresas!inner(
            razon_social,
            email,
            jefe_directo
          )
        `)
        .eq('id', practicaId)
        .single();

      if (practicaError || !practica) {
        throw new Error('No se pudo obtener los datos de la práctica');
      }

      // 2. Extraer datos (Supabase devuelve arrays para relaciones)
      const estudiante = Array.isArray(practica.estudiantes) ? practica.estudiantes[0] : practica.estudiantes;
      const empresa = Array.isArray(practica.empresas) ? practica.empresas[0] : practica.empresas;

      if (!estudiante || !empresa) {
        throw new Error('Faltan datos del estudiante o empresa');
      }

      // 3. Generar URL personalizada
      const formUrl = this.generateFormUrl({
        id: practica.id,
        estudiante_id: practica.estudiante_id,
        estudiante_nombre: estudiante.nombre,
        estudiante_apellido: estudiante.apellido,
        estudiante_carrera: estudiante.carrera || '',
        empresa_id: practica.empresa_id,
        empresa_razon_social: empresa.razon_social,
        fecha_inicio: practica.fecha_inicio,
        fecha_termino: practica.fecha_termino,
      });

      return { 
        data: { 
          formUrl, 
          practica: {
            ...practica,
            estudiantes: estudiante,
            empresas: empresa
          }
        }, 
        error: null 
      };

    } catch (error: any) {
      console.error('Error al generar formulario:', error);
      return { data: null, error };
    }
  },

  /**
   * Guardar URL del formulario en la práctica y marcar como enviado
   */
  async registrarEnvioFormulario(practicaId: string, formUrl: string) {
    const { error } = await supabase
      .from('practicas')
      .update({
        google_form_url: formUrl,
        google_form_enviado: true,
        google_form_enviado_at: new Date().toISOString(),
      })
      .eq('id', practicaId);

    if (error) {
      console.error('Error al registrar envío:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  },

  /**
   * Enviar formulario completo (generar + registrar)
   */
  async enviarFormulario(practicaId: string) {
    try {
      // 1. Generar formulario
      const { data, error } = await this.generarFormularioParaPractica(practicaId);
      if (error || !data) {
        throw error || new Error('No se pudo generar el formulario');
      }

      const { formUrl, practica } = data;
      const estudiante = practica.estudiantes;
      const empresa = practica.empresas;

      // 2. Registrar en base de datos
      const { error: registroError } = await this.registrarEnvioFormulario(practicaId, formUrl);
      if (registroError) {
        throw registroError;
      }

      return {
        success: true,
        data: {
          form_url: formUrl,
          supervisor_email: empresa.email,
          supervisor_nombre: empresa.jefe_directo,
          estudiante_nombre: `${estudiante.nombre} ${estudiante.apellido}`,
          empresa_nombre: empresa.razon_social,
        },
        error: null,
      };

    } catch (error: any) {
      console.error('Error al enviar formulario:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Error desconocido',
      };
    }
  },
};