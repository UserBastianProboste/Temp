/**
 * Plantillas de email profesionales para el Sistema de Prácticas
 * Optimizadas para pasar filtros de Microsoft 365/Outlook
 */

interface EmailTemplateData {
  estudiante_nombre?: string;
  estudiante_apellido?: string;
  coordinator_name?: string;
  tipo_practica?: string;
  empresa?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  estado?: string;
  practica_id?: string;
  [key: string]: any;
}

/**
 * Genera el layout base del email con header y footer institucional
 * Colores del dashboard: #da291c (rojo principal), #f75b50 (rojo claro), #4c0601 (rojo oscuro)
 */
const createEmailLayout = (content: string): string => {
  const currentYear = new Date().getFullYear();
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universidad Autónoma de Chile</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', 'Helvetica', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    
                    <!-- Header con degradado rojo institucional -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #da291c 0%, #f75b50 100%); padding: 35px 25px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 0.5px;">
                                Universidad Autónoma de Chile
                            </h1>
                            <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 15px; font-weight: 400;">
                                Sistema de Gestión de Prácticas Profesionales
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content con padding mejorado -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer moderno -->
                    <tr>
                        <td style="background-color: #fafafa; padding: 30px 25px; border-top: 2px solid #da291c;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="padding-bottom: 15px;">
                                        <p style="margin: 0; color: #333333; font-size: 14px; font-weight: 600; line-height: 1.5;">
                                            Coordinación de Prácticas Profesionales
                                        </p>
                                        <p style="margin: 4px 0 0 0; color: #666666; font-size: 13px; line-height: 1.4;">
                                            Universidad Autónoma de Chile
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0; border-top: 1px solid #e0e0e0;">
                                        <p style="margin: 0; font-size: 12px; color: #888888; line-height: 1.5;">
                                            Este es un correo automático del Sistema de Gestión de Prácticas Profesionales.<br>
                                            Para consultas, contacta a: <a href="mailto:practicas@uautonoma.cl" style="color: #da291c; text-decoration: none; font-weight: 500;">practicas@uautonoma.cl</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 15px;">
                                        <p style="margin: 0; font-size: 11px; color: #aaaaaa; line-height: 1.4;">
                                            Universidad Autónoma de Chile<br>
                                            Av. Pedro de Valdivia 425, Providencia, Santiago<br>
                                            © ${currentYear} Universidad Autónoma de Chile. Todos los derechos reservados.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
};

/**
 * Formatea fechas en español
 */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'No especificada';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Obtiene el nombre completo del estudiante
 */
const getFullName = (nombre?: string, apellido?: string): string => {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  return `${n} ${a}`.trim() || 'Estudiante';
};

/**
 * Plantilla: Confirmación de recepción de ficha al estudiante
 */
export const templateFichaRecibida = (data: EmailTemplateData): { subject: string; html: string } => {
  const nombreCompleto = getFullName(data.estudiante_nombre, data.estudiante_apellido);
  const fechaInicio = formatDate(data.fecha_inicio);
  const fechaTermino = formatDate(data.fecha_termino);
  
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td>
                <h2 style="color: #4CAF50; margin: 0 0 25px 0; font-size: 24px; font-weight: 600;">
                    ✅ Ficha de Práctica Recibida
                </h2>
            </td>
        </tr>
    </table>
    
    <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.7;">
        Hola <strong style="color: #da291c;">${nombreCompleto}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; color: #555555; font-size: 15px; line-height: 1.7;">
        Hemos recibido exitosamente tu ficha de práctica profesional con los siguientes datos:
    </p>
    
    <!-- Card con información -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%); border-radius: 8px; margin: 25px 0; border: 2px solid #e8e8e8; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
        <tr>
            <td style="padding: 25px;">
                <table width="100%" cellpadding="8" cellspacing="0" border="0">
                    <tr>
                        <td width="40%" style="color: #666666; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">📚</span>Tipo de Práctica:
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; font-weight: 600;">
                            ${data.tipo_practica || 'No especificado'}
                        </td>
                    </tr>
                    <tr style="border-top: 1px solid #f0f0f0;">
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">🏢</span>Empresa:
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; font-weight: 600;">
                            ${data.empresa || 'No especificada'}
                        </td>
                    </tr>
                    <tr style="border-top: 1px solid #f0f0f0;">
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">📅</span>Fecha Inicio:
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; font-weight: 600;">
                            ${fechaInicio}
                        </td>
                    </tr>
                    <tr style="border-top: 1px solid #f0f0f0;">
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">📅</span>Fecha Término:
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; font-weight: 600;">
                            ${fechaTermino}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <p style="margin: 25px 0 16px 0; color: #555555; font-size: 15px; line-height: 1.7;">
        La Coordinación de Prácticas revisará tu información y te notificaremos sobre cualquier actualización o requerimiento adicional.
    </p>
    
    <p style="margin: 16px 0 0 0; color: #555555; font-size: 15px; line-height: 1.7;">
        Te deseamos mucho éxito en esta etapa de tu formación profesional. 🎓
    </p>
    
    <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
        Atentamente,<br>
        <strong style="color: #333333;">Coordinación de Prácticas Profesionales</strong>
    </p>
  `;
  
  return {
    subject: `✅ Ficha de Práctica Recibida - ${data.tipo_practica || 'Práctica Profesional'}`,
    html: createEmailLayout(content)
  };
};

/**
 * Plantilla: Notificación de nueva inscripción al coordinador
 */
export const templateNuevaInscripcion = (data: EmailTemplateData): { subject: string; html: string } => {
  const nombreEstudiante = getFullName(data.estudiante_nombre, data.estudiante_apellido);
  const nombreCoordinador = data.coordinator_name || 'Coordinador/a';
  const fechaInicio = formatDate(data.fecha_inicio);
  const fechaTermino = formatDate(data.fecha_termino);
  
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td>
                <h2 style="color: #da291c; margin: 0 0 25px 0; font-size: 24px; font-weight: 600;">
                    📋 Nueva Inscripción de Práctica
                </h2>
            </td>
        </tr>
    </table>
    
    <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.7;">
        Estimado/a <strong style="color: #da291c;">${nombreCoordinador}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; color: #555555; font-size: 15px; line-height: 1.7;">
        Se ha registrado una nueva inscripción de práctica profesional en el sistema:
    </p>
    
    <!-- Card destacada con borde izquierdo rojo -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%); border-radius: 8px; margin: 25px 0; border-left: 5px solid #da291c; box-shadow: 0 2px 6px rgba(218, 41, 28, 0.1);">
        <tr>
            <td style="padding: 25px;">
                <table width="100%" cellpadding="8" cellspacing="0" border="0">
                    <tr>
                        <td width="40%" style="color: #4c0601; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">👤</span>Estudiante:
                        </td>
                        <td style="color: #da291c; font-size: 15px; padding: 8px 0; font-weight: 700;">
                            ${nombreEstudiante}
                        </td>
                    </tr>
                    <tr style="border-top: 1px solid #ffe8e6;">
                        <td style="color: #4c0601; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">📚</span>Tipo de Práctica:
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; font-weight: 600;">
                            ${data.tipo_practica || 'No especificado'}
                        </td>
                    </tr>
                    <tr style="border-top: 1px solid #ffe8e6;">
                        <td style="color: #4c0601; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">🏢</span>Empresa:
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; font-weight: 600;">
                            ${data.empresa || 'No especificada'}
                        </td>
                    </tr>
                    <tr style="border-top: 1px solid #ffe8e6;">
                        <td style="color: #4c0601; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">📅</span>Periodo:
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; font-weight: 600;">
                            ${fechaInicio} - ${fechaTermino}
                        </td>
                    </tr>
                    ${data.practica_id ? `
                    <tr style="border-top: 1px solid #ffe8e6;">
                        <td style="color: #4c0601; font-size: 14px; padding: 8px 0; font-weight: 500;">
                            <span style="color: #da291c; margin-right: 8px;">🔢</span>ID Práctica:
                        </td>
                        <td style="color: #333333; font-size: 13px; padding: 8px 0; font-family: 'Courier New', monospace; font-weight: 600;">
                            ${data.practica_id}
                        </td>
                    </tr>
                    ` : ''}
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Llamado a la acción -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 8px; margin: 25px 0; padding: 20px;">
        <tr>
            <td>
                <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.7;">
                    <strong style="color: #da291c;">⚡ Acción requerida:</strong><br>
                    Por favor, revisa esta solicitud en el sistema de gestión de prácticas para aprobarla o solicitar información adicional.
                </p>
            </td>
        </tr>
    </table>
    
    <p style="margin: 25px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
        Atentamente,<br>
        <strong style="color: #333333;">Sistema de Gestión de Prácticas</strong>
    </p>
  `;
  
  return {
    subject: `📋 Nueva Inscripción: ${nombreEstudiante} - ${data.tipo_practica || 'Práctica'}`,
    html: createEmailLayout(content)
  };
};

/**
 * Plantilla: Cambio de estado de práctica
 */
export const templateCambioEstado = (data: EmailTemplateData): { subject: string; html: string } => {
  const nombreCompleto = getFullName(data.estudiante_nombre, data.estudiante_apellido);
  const nombreCoordinador = data.coordinator_name || 'Coordinación de Prácticas';
  const estado = data.estado || 'actualizado';
  
  // Mapeo de emojis y colores según estado (usando paleta del dashboard)
  const estadoConfig: Record<string, { emoji: string; color: string; bgColor: string; borderColor: string }> = {
    'aprobada': { emoji: '✅', color: '#2e7d32', bgColor: '#e8f5e9', borderColor: '#4caf50' },
    'rechazada': { emoji: '❌', color: '#da291c', bgColor: '#ffebee', borderColor: '#f75b50' },
    'pendiente': { emoji: '⏳', color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ff9800' },
    'en_revision': { emoji: '👀', color: '#da291c', bgColor: '#fff5f5', borderColor: '#f75b50' },
    'en_progreso': { emoji: '🔄', color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#42a5f5' },
    'completada': { emoji: '🎓', color: '#6a1b9a', bgColor: '#f3e5f5', borderColor: '#9c27b0' },
    'finalizada': { emoji: '🎓', color: '#6a1b9a', bgColor: '#f3e5f5', borderColor: '#9c27b0' },
  };
  
  const config = estadoConfig[estado.toLowerCase()] || { emoji: '📝', color: '#616161', bgColor: '#f5f5f5', borderColor: '#9e9e9e' };
  
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td>
                <h2 style="color: ${config.color}; margin: 0 0 25px 0; font-size: 24px; font-weight: 600;">
                    ${config.emoji} Actualización de Práctica Profesional
                </h2>
            </td>
        </tr>
    </table>
    
    <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.7;">
        Hola <strong style="color: #da291c;">${nombreCompleto}</strong>,
    </p>
    
    <p style="margin: 0 0 25px 0; color: #555555; font-size: 15px; line-height: 1.7;">
        Tu práctica profesional <strong>${data.tipo_practica || ''}</strong> en <strong>${data.empresa || ''}</strong> ha sido actualizada.
    </p>
    
    <!-- Badge de estado grande -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${config.bgColor}; border-radius: 12px; margin: 30px 0; border-left: 5px solid ${config.borderColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr>
            <td style="padding: 30px; text-align: center;">
                <p style="margin: 0; color: ${config.color}; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                    ${config.emoji} Estado: ${estado.replace('_', ' ')}
                </p>
            </td>
        </tr>
    </table>
    
    ${estado.toLowerCase() === 'aprobada' ? `
    <!-- Mensaje de aprobación -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); border-radius: 8px; margin: 25px 0; padding: 20px;">
        <tr>
            <td>
                <p style="margin: 0; color: #2e7d32; font-size: 15px; line-height: 1.7;">
                    <strong>🎉 ¡Felicidades!</strong><br>
                    Tu práctica ha sido aprobada. Puedes comenzar con las actividades planificadas. Te deseamos mucho éxito en esta experiencia profesional.
                </p>
            </td>
        </tr>
    </table>
    ` : estado.toLowerCase() === 'rechazada' ? `
    <!-- Mensaje de rechazo -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #ffebee 0%, #fff5f5 100%); border-radius: 8px; margin: 25px 0; padding: 20px;">
        <tr>
            <td>
                <p style="margin: 0; color: #da291c; font-size: 15px; line-height: 1.7;">
                    <strong>⚠️ Atención requerida</strong><br>
                    Tu práctica requiere ajustes. Por favor, contacta a la Coordinación de Prácticas para más información sobre los cambios necesarios.
                </p>
            </td>
        </tr>
    </table>
    ` : `
    <!-- Mensaje genérico -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 8px; margin: 25px 0; padding: 20px;">
        <tr>
            <td>
                <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.7;">
                    <strong>ℹ️ Información:</strong><br>
                    Para más información sobre este cambio, por favor contacta a la Coordinación de Prácticas.
                </p>
            </td>
        </tr>
    </table>
    `}
    
    <!-- Detalle de la práctica -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border-radius: 8px; margin: 25px 0; border: 1px solid #e8e8e8;">
        <tr>
            <td style="padding: 20px;">
                <p style="margin: 0 0 12px 0; color: #666666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    📄 Información de tu práctica
                </p>
                <table width="100%" cellpadding="6" cellspacing="0" border="0">
                    ${data.tipo_practica ? `
                    <tr>
                        <td width="35%" style="color: #666666; font-size: 14px; font-weight: 500;">Tipo:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: 600;">${data.tipo_practica}</td>
                    </tr>
                    ` : ''}
                    ${data.empresa ? `
                    <tr style="border-top: 1px solid #f0f0f0;">
                        <td style="color: #666666; font-size: 14px; font-weight: 500; padding-top: 8px;">Empresa:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: 600; padding-top: 8px;">${data.empresa}</td>
                    </tr>
                    ` : ''}
                    ${data.practica_id ? `
                    <tr style="border-top: 1px solid #f0f0f0;">
                        <td style="color: #666666; font-size: 14px; font-weight: 500; padding-top: 8px;">ID:</td>
                        <td style="color: #333333; font-size: 13px; font-family: 'Courier New', monospace; font-weight: 600; padding-top: 8px;">${data.practica_id}</td>
                    </tr>
                    ` : ''}
                </table>
            </td>
        </tr>
    </table>
    
    <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
        Atentamente,<br>
        <strong style="color: #333333;">${nombreCoordinador}</strong><br>
        <span style="color: #999999;">Coordinación de Prácticas Profesionales</span>
    </p>
  `;
  
  return {
    subject: `${config.emoji} Actualización de Práctica: ${estado.replace('_', ' ').toUpperCase()} - ${data.tipo_practica || 'Práctica Profesional'}`,
    html: createEmailLayout(content)
  };
};

/**
 * Plantilla genérica para notificaciones personalizadas
 */
export const templateGenerico = (data: EmailTemplateData & { mensaje_html?: string; subject?: string }): { subject: string; html: string } => {
  const subject = data.subject || 'Notificación del Sistema de Prácticas';
  const mensajeHtml = data.mensaje_html || '<p>Se ha generado una notificación en el sistema.</p>';
  
  // Si el mensaje ya tiene estructura HTML completa, usarlo directamente
  if (mensajeHtml.includes('<!DOCTYPE') || mensajeHtml.includes('<html')) {
    return {
      subject,
      html: mensajeHtml
    };
  }
  
  // Si es HTML simple, envolverlo en el layout
  return {
    subject,
    html: createEmailLayout(mensajeHtml)
  };
};

/**
 * Selector de plantilla según tipo de notificación
 */
export const getEmailTemplate = (
  tipo: 'ficha_recibida' | 'nueva_inscripcion' | 'cambio_estado' | 'generico',
  data: EmailTemplateData
): { subject: string; html: string } => {
  switch (tipo) {
    case 'ficha_recibida':
      return templateFichaRecibida(data);
    case 'nueva_inscripcion':
      return templateNuevaInscripcion(data);
    case 'cambio_estado':
      return templateCambioEstado(data);
    case 'generico':
    default:
      return templateGenerico(data);
  }
};
