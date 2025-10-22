import { supabase } from './supabaseClient';
import { sendBrevoEmail } from './brevoEmailService';
import { getEmailTemplate } from './emailTemplates';


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
    
    // Primero, obtener datos completos de la evaluación
    const tokenData = await validarToken(token);
    if (!tokenData.success || !tokenData.data) {
      throw new Error('Token inválido');
    }
    
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
    
    // Calcular promedio de la evaluación
    const aspectosTecnicos = [
      evaluacion.calidad_trabajo,
      evaluacion.efectividad_trabajo,
      evaluacion.conocimientos_profesionales,
      evaluacion.adaptabilidad_cambios,
      evaluacion.organizacion_trabajo
    ];
    
    const aspectosPersonales = [
      evaluacion.interes_trabajo,
      evaluacion.responsabilidad,
      evaluacion.cooperacion,
      evaluacion.creatividad,
      evaluacion.iniciativa,
      evaluacion.integracion_grupo
    ];
    
    const promedioTecnico = (aspectosTecnicos.reduce((a, b) => a + b, 0) / aspectosTecnicos.length).toFixed(1);
    const promedioPersonal = (aspectosPersonales.reduce((a, b) => a + b, 0) / aspectosPersonales.length).toFixed(1);
    const promedioGeneral = (([...aspectosTecnicos, ...aspectosPersonales].reduce((a, b) => a + b, 0)) / (aspectosTecnicos.length + aspectosPersonales.length)).toFixed(1);
    
    // Enviar correos de notificación
    const estudiante = tokenData.data.estudiantes;
    const empresa = tokenData.data.empresas;
    
    // 1. Email al estudiante
    if (estudiante?.email) {
      try {
        const estudianteEmail = getEmailTemplate('generico', {
          estudiante_nombre: estudiante.nombre,
          estudiante_apellido: estudiante.apellido,
          subject: '📊 Evaluación de Supervisor Recibida',
          mensaje_html: `
            <h2 style="color: #4CAF50;">📊 Evaluación de Supervisor Completada</h2>
            
            <p style="font-size: 15px; line-height: 1.6;">
              Hola <strong>${estudiante.nombre} ${estudiante.apellido}</strong>,
            </p>
            
            <p style="font-size: 15px; line-height: 1.6;">
              Tu supervisor en <strong>${empresa?.razon_social || 'la empresa'}</strong> ha completado tu evaluación de práctica profesional.
            </p>
            
            <table width="100%" cellpadding="15" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
              <tr>
                <td>
                  <h3 style="margin: 0 0 15px 0; color: #333;">📈 Resumen de Calificaciones</h3>
                  <table width="100%" cellpadding="8">
                    <tr>
                      <td style="color: #666; font-size: 14px;">
                        <strong>Aspectos Técnicos:</strong>
                      </td>
                      <td style="color: #4CAF50; font-size: 18px; font-weight: bold;">
                        ${promedioTecnico} / 5.0
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #666; font-size: 14px;">
                        <strong>Aspectos Personales:</strong>
                      </td>
                      <td style="color: #4CAF50; font-size: 18px; font-weight: bold;">
                        ${promedioPersonal} / 5.0
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #666; font-size: 14px;">
                        <strong>Promedio General:</strong>
                      </td>
                      <td style="color: #1976d2; font-size: 20px; font-weight: bold;">
                        ${promedioGeneral} / 5.0
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <p style="font-size: 15px; line-height: 1.6;">
              Puedes revisar los detalles completos de tu evaluación en el sistema de gestión de prácticas.
            </p>
            
            <p style="font-size: 15px; line-height: 1.6;">
              <strong>Evaluador:</strong> ${evaluacion.nombre_supervisor}<br>
              <strong>Cargo:</strong> ${evaluacion.cargo_supervisor}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              ¡Felicidades por completar tu práctica profesional!
            </p>
          `
        });
        
        await sendBrevoEmail({
          to: estudiante.email,
          subject: estudianteEmail.subject,
          mensaje_html: estudianteEmail.html
        });
        
        console.log('✅ Email enviado al estudiante');
      } catch (emailError) {
        console.warn('⚠️ Error enviando email al estudiante:', emailError);
        // No fallar si el email falla, solo registrar
      }
    }
    
    // 2. Email a coordinadores
    try {
      const { data: coordinadores } = await supabase
        .from('coordinadores')
        .select('id, email, nombre, apellido')
        .order('nombre', { ascending: true });
      
      if (coordinadores && coordinadores.length > 0) {
        for (const coord of coordinadores) {
          if (!coord.email) continue;
          
          const coordNombre = `${coord.nombre || ''} ${coord.apellido || ''}`.trim() || 'Coordinador';
          
          const coordEmail = getEmailTemplate('generico', {
            coordinator_name: coordNombre,
            estudiante_nombre: estudiante?.nombre,
            estudiante_apellido: estudiante?.apellido,
            subject: '📊 Nueva Evaluación de Supervisor Recibida',
            mensaje_html: `
              <h2 style="color: #1976d2;">📊 Evaluación de Supervisor Completada</h2>
              
              <p style="font-size: 15px; line-height: 1.6;">
                Estimado/a <strong>${coordNombre}</strong>,
              </p>
              
              <p style="font-size: 15px; line-height: 1.6;">
                Se ha recibido una nueva evaluación de supervisor para el estudiante <strong>${estudiante?.nombre} ${estudiante?.apellido}</strong>.
              </p>
              
              <table width="100%" cellpadding="15" style="background-color: #e3f2fd; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1976d2;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #0d47a1;">📋 Información de la Evaluación</h3>
                    <table width="100%" cellpadding="6">
                      <tr>
                        <td style="color: #0d47a1; font-size: 14px;"><strong>Estudiante:</strong></td>
                        <td style="color: #1565c0; font-size: 14px;">${estudiante?.nombre} ${estudiante?.apellido}</td>
                      </tr>
                      <tr>
                        <td style="color: #0d47a1; font-size: 14px;"><strong>Carrera:</strong></td>
                        <td style="color: #1565c0; font-size: 14px;">${estudiante?.carrera || 'No especificada'}</td>
                      </tr>
                      <tr>
                        <td style="color: #0d47a1; font-size: 14px;"><strong>Empresa:</strong></td>
                        <td style="color: #1565c0; font-size: 14px;">${empresa?.razon_social || 'No especificada'}</td>
                      </tr>
                      <tr>
                        <td style="color: #0d47a1; font-size: 14px;"><strong>Supervisor:</strong></td>
                        <td style="color: #1565c0; font-size: 14px;">${evaluacion.nombre_supervisor}</td>
                      </tr>
                      <tr>
                        <td style="color: #0d47a1; font-size: 14px;"><strong>Cargo:</strong></td>
                        <td style="color: #1565c0; font-size: 14px;">${evaluacion.cargo_supervisor}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="15" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #333;">📊 Resultados</h3>
                    <table width="100%" cellpadding="8">
                      <tr>
                        <td style="color: #666; font-size: 14px;">Promedio Técnico:</td>
                        <td style="color: #4CAF50; font-size: 16px; font-weight: bold;">${promedioTecnico} / 5.0</td>
                      </tr>
                      <tr>
                        <td style="color: #666; font-size: 14px;">Promedio Personal:</td>
                        <td style="color: #4CAF50; font-size: 16px; font-weight: bold;">${promedioPersonal} / 5.0</td>
                      </tr>
                      <tr>
                        <td style="color: #666; font-size: 14px;">Promedio General:</td>
                        <td style="color: #1976d2; font-size: 18px; font-weight: bold;">${promedioGeneral} / 5.0</td>
                      </tr>
                      <tr>
                        <td style="color: #666; font-size: 14px;">Considera positivo recibir alumnos:</td>
                        <td style="color: #333; font-size: 14px; font-weight: bold;">${evaluacion.considera_positivo_recibir_alumnos === 'SI' ? '✅ Sí' : '❌ No'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${evaluacion.comentarios_adicionales ? `
              <table width="100%" cellpadding="15" style="background-color: #fff3e0; border-radius: 6px; margin: 20px 0;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 10px 0; color: #e65100;">💬 Comentarios del Supervisor:</h4>
                    <p style="margin: 0; color: #333; font-size: 14px; font-style: italic;">
                      "${evaluacion.comentarios_adicionales}"
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <p style="font-size: 15px; line-height: 1.6;">
                Revisa los detalles completos en el sistema de gestión de prácticas.
              </p>
            `
          });
          
          await sendBrevoEmail({
            to: coord.email,
            subject: coordEmail.subject,
            mensaje_html: coordEmail.html
          });
          
          console.log(`✅ Email enviado al coordinador: ${coord.email}`);
        }
      }
    } catch (emailError) {
      console.warn('⚠️ Error enviando emails a coordinadores:', emailError);
      // No fallar si los emails fallan
    }
    
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