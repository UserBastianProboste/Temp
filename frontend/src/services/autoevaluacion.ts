import { supabase } from './supabaseClient';
import { sendBrevoEmail } from './brevoEmailService';
import { getEmailTemplate } from './emailTemplates';


export async function guardarAutoevaluacion(payload: any) {
  const { data, error } = await supabase
    .from("autoevaluaciones")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  
  // Enviar emails a coordinadores notificando la nueva autoevaluación
  try {
    // Obtener información de la práctica con estudiante y empresa
    const { data: practica, error: practicaError } = await supabase
      .from("practicas")
      .select(`
        *,
        estudiantes:estudiante_id (
          id,
          nombre,
          apellido,
          email,
          carrera
        ),
        empresas:empresa_id (
          razon_social
        )
      `)
      .eq("id", payload.practica_id)
      .single();

    if (practicaError) {
      console.error('Error al obtener práctica para email:', practicaError);
      return data; // Continuar aunque falle el email
    }

    // Obtener todos los coordinadores
    const { data: coordinadores, error: coordError } = await supabase
      .from("coordinadores")
      .select("id, nombre, apellido, email");

    if (coordError || !coordinadores || coordinadores.length === 0) {
      console.error('Error al obtener coordinadores o no hay coordinadores:', coordError);
      return data; // Continuar aunque falle el email
    }

    const estudiante = practica.estudiantes as any;
    const empresa = practica.empresas as any;
    const nombreCompleto = `${estudiante?.nombre || ''} ${estudiante?.apellido || ''}`.trim();

    // Formatear fechas
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return 'No especificada';
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };

    // Enviar email a cada coordinador
    for (const coord of coordinadores) {
      try {
        const coordNombre = `${coord.nombre} ${coord.apellido}`.trim() || 'Coordinador/a';

        const emailData = getEmailTemplate('generico', {
          coordinator_name: coordNombre,
          estudiante_nombre: estudiante?.nombre,
          estudiante_apellido: estudiante?.apellido,
          subject: '📝 Nueva Autoevaluación Recibida',
          mensaje_html: `
            <h2 style="color: #1976d2;">📝 Nueva Autoevaluación de Práctica</h2>
            
            <p style="font-size: 15px; line-height: 1.6;">
              Estimado/a <strong>${coordNombre}</strong>,
            </p>
            
            <p style="font-size: 15px; line-height: 1.6;">
              Le informamos que el estudiante <strong>${nombreCompleto}</strong> 
              ha completado su autoevaluación de práctica profesional.
            </p>
            
            <table width="100%" cellpadding="15" style="background-color: #e3f2fd; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1976d2;">
              <tr>
                <td>
                  <h3 style="margin: 0 0 15px 0; color: #0d47a1;">📋 Información de la Práctica</h3>
                  <table width="100%" cellpadding="6">
                    <tr>
                      <td style="color: #0d47a1; font-size: 14px;"><strong>Estudiante:</strong></td>
                      <td style="color: #1565c0; font-size: 14px;">${nombreCompleto}</td>
                    </tr>
                    ${estudiante?.carrera ? `
                    <tr>
                      <td style="color: #0d47a1; font-size: 14px;"><strong>Carrera:</strong></td>
                      <td style="color: #1565c0; font-size: 14px;">${estudiante.carrera}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="color: #0d47a1; font-size: 14px;"><strong>Empresa:</strong></td>
                      <td style="color: #1565c0; font-size: 14px;">${empresa?.razon_social || 'No especificada'}</td>
                    </tr>
                    <tr>
                      <td style="color: #0d47a1; font-size: 14px;"><strong>Tipo de Práctica:</strong></td>
                      <td style="color: #1565c0; font-size: 14px;">${practica.tipo_practica}</td>
                    </tr>
                    <tr>
                      <td style="color: #0d47a1; font-size: 14px;"><strong>Periodo:</strong></td>
                      <td style="color: #1565c0; font-size: 14px;">${formatDate(practica.fecha_inicio)} - ${formatDate(practica.fecha_termino)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <table width="100%" cellpadding="20" style="background-color: #fff3e0; border-radius: 6px; margin: 20px 0;">
              <tr>
                <td style="text-align: center;">
                  <h3 style="margin: 0 0 15px 0; color: #e65100;">⚠️ Acción Requerida</h3>
                  <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.6;">
                    Por favor, ingrese al sistema para <strong>revisar y calificar</strong> 
                    la autoevaluación del estudiante.
                  </p>
                  <p style="margin: 15px 0 0 0; font-size: 14px; color: #999; font-style: italic;">
                    La calificación de la autoevaluación representa el <strong>10%</strong> 
                    de la nota final de práctica.
                  </p>
                </td>
              </tr>
            </table>
            
            <p style="font-size: 15px; line-height: 1.6; margin-top: 20px;">
              Puede acceder a la autoevaluación desde el panel de coordinador, 
              sección <strong>"Lista de Autoevaluaciones"</strong>.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              Atentamente,<br>
              <strong>Sistema de Gestión de Prácticas</strong><br>
              Universidad Autónoma de Chile
            </p>
          `
        });

        await sendBrevoEmail({
          to: coord.email,
          subject: emailData.subject,
          mensaje_html: emailData.html
        });

        console.log(`Email de autoevaluación enviado a coordinador: ${coord.email}`);
      } catch (emailError) {
        console.error(`Error al enviar email a coordinador ${coord.email}:`, emailError);
        // Continuar con el siguiente coordinador aunque falle uno
      }
    }
  } catch (error) {
    console.error('Error en envío de emails de autoevaluación:', error);
    // No lanzar error, solo loggearlo para no afectar el guardado
  }

  return data;
}

// Retorna todas las prácticas del estudiante
export async function getPracticasEstudiante() {
  // Debug: confirm session / user presence before making DB calls
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session ?? null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error('Error al obtener usuario: ' + (userError.message || String(userError)));
  }
  const user = userData?.user ?? session?.user ?? null;
  if (!user) throw new Error('No hay sesión activa (token faltante o expirado).');

  const { data: estudiante, error: estudianteError } = await supabase
    .from("estudiantes")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (estudianteError) throw new Error('Error al leer estudiantes: ' + (((estudianteError as any)?.message) || String(estudianteError)));

  const { data: practicas, error: practicasError } = await supabase
    .from("practicas")
    .select("*")
    .eq("estudiante_id", estudiante.id);
  if (practicasError) throw practicasError;
  if (practicasError) throw new Error('Error al leer practicas: ' + (((practicasError as any)?.message) || String(practicasError)));

  const practicasConEmpresa = await Promise.all(
    practicas.map(async (p) => {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", p.empresa_id)
        .single();
      return { ...p, empresa, estudiante };
    })
  );

  return practicasConEmpresa;
}

// Retorna una práctica específica por su ID
export async function getPracticaEstudiantePorId(practicaId: string) {
  const { data, error } = await supabase
    .from("practicas")
    .select("*")
    .eq("id", practicaId)
    .single();
  
  if (error) throw error;

  // Obtener estudiante relacionado
  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("*")
    .eq("id", data.estudiante_id)
    .single();

  // Obtener empresa relacionada
  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", data.empresa_id)
    .single();

  return { ...data, estudiante, empresa };
}

// Retorna la autoevaluación de una práctica
export async function getAutoevaluacion(practica_id: string) {
  const { data, error } = await supabase
    .from("autoevaluaciones")
    .select("*")
    .eq("practica_id", practica_id);
  
  return { data, error };
}

// Retorna autoevaluación por ID
export async function getAutoevaluacionPorId(autoevaluacionId: string) {
  const { data, error } = await supabase
    .from("autoevaluaciones")
    .select("*")
    .eq("id", autoevaluacionId)
    .single();
  
  if (error) throw error;
  return data;
}

// Calcula la nota de la autoevaluación basada en las respuestas
// Siempre = 4 puntos, Frecuentemente = 3, A veces = 2, Nunca = 1
// Total de items: 11 (5 gestión + 6 personales)
// Puntaje máximo: 44 puntos
// Nota máxima: 7.0
export function calcularNotaAutoevaluacion(autoevaluacion: any): number {
  const valorRespuesta: { [key: string]: number } = {
    'Siempre': 4,
    'Frecuentemente': 3,
    'A veces': 2,
    'Nunca': 1
  };

  let puntajeTotal = 0;
  let totalItems = 0;

  // Calcular puntaje de gestión (5 items)
  for (let i = 0; i < 5; i++) {
    const respuesta = autoevaluacion[`gestion_${i}`];
    if (respuesta && valorRespuesta[respuesta]) {
      puntajeTotal += valorRespuesta[respuesta];
      totalItems++;
    }
  }

  // Calcular puntaje de aspectos personales (6 items)
  for (let i = 0; i < 6; i++) {
    const respuesta = autoevaluacion[`personales_${i}`];
    if (respuesta && valorRespuesta[respuesta]) {
      puntajeTotal += valorRespuesta[respuesta];
      totalItems++;
    }
  }

  if (totalItems === 0) return 0;

  // Puntaje máximo posible: 4 puntos * 11 items = 44
  const puntajeMaximo = 44;
  
  // Convertir a escala de 1 a 7
  const nota = ((puntajeTotal / puntajeMaximo) * 6) + 1;
  
  // Redondear a 2 decimales
  return Math.round(nota * 100) / 100;
}

// Calcula y guarda la nota ponderada (10% de la nota total)
export async function guardarNotaAutoevaluacion(autoevaluacionId: string, nota: number) {
  // La nota se pondera al 10%
  const notaPonderada = nota * 0.1;
  
  const { data, error } = await supabase
    .from("autoevaluaciones")
    .update({ nota_autoevaluacion: notaPonderada })
    .eq("id", autoevaluacionId)
    .select()
    .single();

  if (error) throw error;

  // Enviar email al estudiante notificando que su autoevaluación fue calificada
  try {
    // Obtener la autoevaluación con la práctica y estudiante
    const { data: autoevaluacion, error: autoError } = await supabase
      .from("autoevaluaciones")
      .select(`
        *,
        practicas:practica_id (
          id,
          tipo_practica,
          fecha_inicio,
          fecha_termino,
          estudiante_id,
          estudiantes:estudiante_id (
            id,
            nombre,
            apellido,
            email,
            carrera
          ),
          empresas:empresa_id (
            razon_social
          )
        )
      `)
      .eq("id", autoevaluacionId)
      .single();

    if (autoError || !autoevaluacion) {
      console.error('Error al obtener autoevaluación para email:', autoError);
      return data;
    }

    const practica = autoevaluacion.practicas as any;
    const estudiante = practica?.estudiantes as any;
    const empresa = practica?.empresas as any;

    if (!estudiante?.email) {
      console.error('No se encontró email del estudiante');
      return data;
    }

    const nombreCompleto = `${estudiante.nombre || ''} ${estudiante.apellido || ''}`.trim();

    // Determinar el color y mensaje según la nota
    const getNotaInfo = (notaVal: number) => {
      if (notaVal >= 6.0) return { color: '#4caf50', emoji: '🎉', mensaje: '¡Excelente desempeño!' };
      if (notaVal >= 5.5) return { color: '#8bc34a', emoji: '👏', mensaje: '¡Muy buen trabajo!' };
      if (notaVal >= 5.0) return { color: '#ffc107', emoji: '👍', mensaje: 'Buen desempeño' };
      if (notaVal >= 4.0) return { color: '#ff9800', emoji: '📝', mensaje: 'Desempeño satisfactorio' };
      return { color: '#f44336', emoji: '📚', mensaje: 'Necesitas mejorar' };
    };

    const notaInfo = getNotaInfo(nota);

    const emailData = getEmailTemplate('generico', {
      estudiante_nombre: estudiante.nombre,
      estudiante_apellido: estudiante.apellido,
      subject: '✅ Tu Autoevaluación ha sido Calificada',
      mensaje_html: `
        <h2 style="color: #1976d2;">✅ Autoevaluación Calificada</h2>
        
        <p style="font-size: 15px; line-height: 1.6;">
          Estimado/a <strong>${nombreCompleto}</strong>,
        </p>
        
        <p style="font-size: 15px; line-height: 1.6;">
          Tu autoevaluación de práctica profesional ha sido revisada y calificada 
          por el coordinador.
        </p>
        
        <table width="100%" cellpadding="20" style="background-color: ${notaInfo.color}15; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${notaInfo.color};">
          <tr>
            <td style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">${notaInfo.emoji}</div>
              <h3 style="margin: 0 0 10px 0; color: ${notaInfo.color};">${notaInfo.mensaje}</h3>
              
              <table width="100%" style="margin-top: 20px;">
                <tr>
                  <td style="text-align: center; padding: 10px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Nota Original</div>
                    <div style="font-size: 36px; font-weight: bold; color: ${notaInfo.color};">
                      ${nota.toFixed(2)}
                    </div>
                    <div style="font-size: 12px; color: #999;">Escala 1.0 - 7.0</div>
                  </td>
                  <td style="text-align: center; padding: 10px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Nota Ponderada (10%)</div>
                    <div style="font-size: 36px; font-weight: bold; color: #ff9800;">
                      ${notaPonderada.toFixed(2)}
                    </div>
                    <div style="font-size: 12px; color: #999;">Contribución a nota final</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="15" style="background-color: #e3f2fd; border-radius: 6px; margin: 20px 0;">
          <tr>
            <td>
              <h3 style="margin: 0 0 15px 0; color: #0d47a1;">📋 Información de la Práctica</h3>
              <table width="100%" cellpadding="6">
                <tr>
                  <td style="color: #0d47a1; font-size: 14px;"><strong>Empresa:</strong></td>
                  <td style="color: #1565c0; font-size: 14px;">${empresa?.razon_social || 'No especificada'}</td>
                </tr>
                <tr>
                  <td style="color: #0d47a1; font-size: 14px;"><strong>Tipo de Práctica:</strong></td>
                  <td style="color: #1565c0; font-size: 14px;">${practica.tipo_practica}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="15" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
          <tr>
            <td>
              <h4 style="margin: 0 0 10px 0; color: #333;">ℹ️ Importante:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                <li>Esta nota representa el <strong>10%</strong> de tu evaluación total de práctica</li>
                <li>Puedes ver el detalle de tu autoevaluación en tu panel de estudiante</li>
                <li>Si tienes consultas sobre la calificación, contacta a tu coordinador</li>
              </ul>
            </td>
          </tr>
        </table>
        
        <p style="font-size: 15px; line-height: 1.6; margin-top: 20px;">
          ¡Continúa con el excelente trabajo en tu práctica profesional!
        </p>
        
        <p style="font-size: 14px; color: #666;">
          Atentamente,<br>
          <strong>Coordinación de Prácticas Profesionales</strong><br>
          Universidad Autónoma de Chile
        </p>
      `
    });

    await sendBrevoEmail({
      to: estudiante.email,
      subject: emailData.subject,
      mensaje_html: emailData.html
    });

    console.log(`Email de calificación enviado a estudiante: ${estudiante.email}`);
  } catch (error) {
    console.error('Error al enviar email de calificación:', error);
    // No lanzar error para no afectar el guardado de la nota
  }

  return data;
}

// Obtiene todas las autoevaluaciones con información de la práctica y estudiante
export async function getAutoevaluacionesConDetalles() {
  const { data, error } = await supabase
    .from("autoevaluaciones")
    .select(`
      *,
      practicas:practica_id (
        id,
        tipo_practica,
        fecha_inicio,
        fecha_termino,
        estudiante_id,
        estudiantes:estudiante_id (
          id,
          nombre,
          apellido,
          email,
          carrera
        ),
        empresas:empresa_id (
          razon_social
        )
      )
    `);

  if (error) throw error;
  return data;
}