import { supabase } from './supabaseClient';


interface GenerarTokenParams {
  practicaId: string;
  estudianteId: string;
  empresaId: string;
  nombreSupervisor: string;
  cargoSupervisor: string;
  emailSupervisor: string;
  telefonoSupervisor?: string;
  diasValidez?: number; // Por defecto 30 días
}

export interface EvaluacionData {
  // Datos del supervisor
  nombre_supervisor: string;
  cargo_supervisor: string;
  email_supervisor: string;
  telefono_supervisor?: string;
  
  // Aspectos técnicos
  calidad_trabajo: number;
  efectividad_trabajo: number;
  conocimientos_profesionales: number;
  adaptabilidad_cambios: number;
  organizacion_trabajo: number;
  observaciones_tecnicas?: string;
  
  // Aspectos personales
  interes_trabajo: number;
  responsabilidad: number;
  cooperacion: number;
  creatividad: number;
  iniciativa: number;
  integracion_grupo: number;
  
  // Preguntas finales
  considera_positivo_recibir_alumnos: 'SI' | 'NO';
  especialidad_requerida?: string;
  comentarios_adicionales?: string;
}

/**
 * Genera un token único para que el supervisor responda la evaluación
 */
export const generarTokenEvaluacion = async ({
  practicaId,
  estudianteId,
  empresaId,
  nombreSupervisor,
  cargoSupervisor,
  emailSupervisor,
  telefonoSupervisor,
  diasValidez = 30
}: GenerarTokenParams) => {
  try {
    // Generar token único (UUID + timestamp)
    const token = `${crypto.randomUUID()}-${Date.now()}`;
    
    // Calcular fecha de expiración
    const tokenExpiraEn = new Date();
    tokenExpiraEn.setDate(tokenExpiraEn.getDate() + diasValidez);
    
    // Insertar en base de datos
    const { data, error } = await supabase
      .from('evaluaciones_supervisor')
      .insert([{
        practica_id: practicaId,
        estudiante_id: estudianteId,
        empresa_id: empresaId,
        token,
        token_expira_en: tokenExpiraEn.toISOString(),
        nombre_supervisor: nombreSupervisor,
        cargo_supervisor: cargoSupervisor,
        email_supervisor: emailSupervisor,
        telefono_supervisor: telefonoSupervisor || null,
        respondido: false,
        token_usado: false
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Construir URL pública
    const baseUrl = window.location.origin;
    const evaluacionUrl = `${baseUrl}/evaluacion-supervisor/${token}`;
    
    return {
      success: true,
      data: {
        ...data,
        url: evaluacionUrl
      }
    };
    
  } catch (error) {
    console.error('Error generando token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Valida un token de evaluación
 */
export const validarToken = async (token: string) => {
  try {
    const { data, error } = await supabase
      .from('evaluaciones_supervisor')
      .select(`
        *,
        practicas:practica_id (
          tipo_practica,
          fecha_inicio,
          fecha_termino,
          cargo_por_desarrollar
        ),
        estudiantes:estudiante_id (
          nombre,
          apellido,
          carrera
        ),
        empresas:empresa_id (
          razon_social
        )
      `)
      .eq('token', token)
      .single();
    
    if (error) throw error;
    
    // Validar expiración
    if (new Date(data.token_expira_en) < new Date()) {
      return {
        success: false,
        error: 'Token expirado'
      };
    }
    
    // Validar si ya fue usado
    if (data.token_usado || data.respondido) {
      return {
        success: false,
        error: 'Este formulario ya fue respondido'
      };
    }
    
    return {
      success: true,
      data
    };
    
  } catch (error) {
    console.error('Error validando token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token inválido'
    };
  }
};

/**
 * Envía la evaluación del supervisor
 */
export const enviarEvaluacion = async (token: string, evaluacion: EvaluacionData) => {
  try {
    console.log('🔄 Enviando evaluación:', { token, evaluacion }); // DEBUG
    
    // Actualizar registro con la evaluación
    const { data, error } = await supabase
      .from('evaluaciones_supervisor')
      .update({
        ...evaluacion,
        respondido: true,
        token_usado: true,
        fecha_respuesta: new Date().toISOString(),
        // ip_respuesta se puede capturar con un servicio externo si es necesario
      })
      .eq('token', token)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error de Supabase:', error); // DEBUG
      throw error;
    }
    
    console.log('✅ Evaluación guardada:', data); // DEBUG
    
    return {
      success: true,
      data
    };
    
  } catch (error) {
    console.error('❌ Error completo enviando evaluación:', error); // DEBUG
    
    // Mejor manejo de errores
    if (error && typeof error === 'object' && 'message' in error) {
      return {
        success: false,
        error: (error as { message: string }).message
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar evaluación'
    };
  }
};

/**
 * Obtiene evaluación por práctica ID (para coordinadores)
 */
export const obtenerEvaluacionPorPractica = async (practicaId: string) => {
  try {
    const { data, error } = await supabase
      .from('evaluaciones_supervisor')
      .select('*')
      .eq('practica_id', practicaId)
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se encontró evaluación'
    };
  }
};

export const evaluacionSupervisorService = {
  generarTokenEvaluacion,
  validarToken,
  enviarEvaluacion,
  obtenerEvaluacionPorPractica
};