import { sendBrevoEmail } from './brevoEmailService';

interface EmailEvaluacionParams {
  supervisorEmail: string;
  supervisorNombre: string;
  estudianteNombre: string;
  estudianteApellido: string;
  empresaNombre: string;
  enlaceEvaluacion: string;
  tipoPractica: string;
  coordinatorName: string;
}

export const enviarEmailEvaluacion = async (params: EmailEvaluacionParams) => {
  const {
    supervisorEmail,
    supervisorNombre,
    estudianteNombre,
    estudianteApellido,
    empresaNombre,
    enlaceEvaluacion,
    tipoPractica,
    coordinatorName
  } = params;

  const subject = `Evaluación de práctica profesional - ${estudianteNombre} ${estudianteApellido}`;

  const mensajeHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1976d2; margin-bottom: 20px;">Evaluación de Práctica Profesional</h2>
        
        <p>Estimado/a <strong>${supervisorNombre}</strong>,</p>
        
        <p>Le escribimos desde la <strong>Coordinación de Prácticas Profesionales</strong> para solicitarle la evaluación del estudiante:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Estudiante:</strong> ${estudianteNombre} ${estudianteApellido}</p>
          <p style="margin: 5px 0;"><strong>Empresa:</strong> ${empresaNombre}</p>
          <p style="margin: 5px 0;"><strong>Tipo de práctica:</strong> ${tipoPractica}</p>
        </div>
        
        <p>Para completar la evaluación, por favor haga clic en el siguiente enlace:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${enlaceEvaluacion}" 
             style="display: inline-block; padding: 15px 30px; background-color: #1976d2; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Completar Evaluación
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>⏱️ Importante:</strong> Este enlace es válido por <strong>30 días</strong>. 
            La evaluación tomará aproximadamente 10 minutos.
          </p>
        </div>
        
        <p>Si tiene alguna consulta, no dude en contactarnos.</p>
        
        <p style="margin-top: 30px;">
          Saludos cordiales,<br>
          <strong>${coordinatorName}</strong><br>
          Coordinación de Prácticas Profesionales
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #757575; text-align: center;">
          Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
          <a href="${enlaceEvaluacion}" style="color: #1976d2; word-break: break-all;">${enlaceEvaluacion}</a>
        </p>
      </div>
    </div>
  `;

  const payload = {
    to: supervisorEmail,
    subject,
    coordinator_name: coordinatorName,
    estudiante_nombre: estudianteNombre,
    estudiante_apellido: estudianteApellido,
    supervisor_nombre: supervisorNombre,
    empresa_nombre: empresaNombre,
    enlace_evaluacion: enlaceEvaluacion,
    tipo_practica: tipoPractica,
    mensaje_html: mensajeHtml
  };

  await sendBrevoEmail(payload);
};