/**
 * Test manual para el servicio de Brevo
 * Para ejecutar: npm run dev y usar la consola del navegador
 */

import { sendBrevoEmail, BrevoEmailError } from '../brevoEmailService';

/**
 * Test básico de envío de email
 */
export const testBasicEmail = async (destinatario: string) => {
  console.log('🧪 Test: Email básico');
  
  try {
    const result = await sendBrevoEmail({
      to: destinatario,
      subject: 'Test de email básico',
      mensaje_html: `
        <h1>Test del Sistema de Prácticas</h1>
        <p>Este es un email de prueba enviado el ${new Date().toLocaleString('es-CL')}</p>
        <p>Si recibes este email, el sistema está funcionando correctamente.</p>
      `
    });
    
    console.log('✅ Email enviado exitosamente:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    if (error instanceof BrevoEmailError) {
      console.error('Detalles del error:', error.details);
      console.error('Status code:', error.statusCode);
    }
    return { success: false, error };
  }
};

/**
 * Test de email con todos los campos
 */
export const testFullEmail = async (destinatario: string) => {
  console.log('🧪 Test: Email completo');
  
  try {
    const result = await sendBrevoEmail({
      to: destinatario,
      subject: 'Práctica Profesional Aprobada',
      coordinator_name: 'Juan Pérez',
      estudiante_nombre: 'María',
      estudiante_apellido: 'González',
      tipo_practica: 'Práctica I',
      practica_id: 'test-123',
      empresa: 'Empresa Test S.A.',
      fecha_inicio: '2025-01-15',
      fecha_termino: '2025-06-30',
      estado: 'aprobada',
      mensaje_html: `
        <p>Hola María González,</p>
        <p>Tu ficha de práctica profesional ha sido <strong>aprobada</strong>.</p>
        <ul>
          <li><strong>Tipo:</strong> Práctica I</li>
          <li><strong>Empresa:</strong> Empresa Test S.A.</li>
          <li><strong>Periodo:</strong> 15/01/2025 - 30/06/2025</li>
        </ul>
        <p>Te deseamos mucho éxito,</p>
        <p>Juan Pérez<br/>Coordinación de Prácticas</p>
      `
    });
    
    console.log('✅ Email completo enviado:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error };
  }
};

/**
 * Test de múltiples destinatarios
 */
export const testMultipleRecipients = async (destinatarios: string[]) => {
  console.log('🧪 Test: Múltiples destinatarios');
  
  try {
    const result = await sendBrevoEmail({
      to: destinatarios,
      subject: 'Test a múltiples destinatarios',
      mensaje_html: `
        <p>Hola,</p>
        <p>Este email fue enviado a múltiples destinatarios simultáneamente.</p>
        <p>Fecha: ${new Date().toLocaleString('es-CL')}</p>
      `
    });
    
    console.log('✅ Email enviado a múltiples destinatarios:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error };
  }
};

/**
 * Test de validación de email
 */
export const testInvalidEmail = async () => {
  console.log('🧪 Test: Email inválido (debe fallar)');
  
  try {
    await sendBrevoEmail({
      to: 'email-invalido',
      subject: 'Test',
      mensaje_html: '<p>Test</p>'
    });
    
    console.log('❌ ERROR: Debería haber fallado con email inválido');
    return { success: false, error: 'No detectó email inválido' };
  } catch (error) {
    console.log('✅ Correctamente rechazó email inválido:', error);
    return { success: true, error };
  }
};

/**
 * Test de retry automático
 */
export const testRetry = async (destinatario: string) => {
  console.log('🧪 Test: Retry automático (puede tardar)');
  
  try {
    const result = await sendBrevoEmail(
      {
        to: destinatario,
        subject: 'Test de retry',
        mensaje_html: '<p>Test de retry automático</p>'
      },
      {
        timeout: 5000,  // Timeout corto para forzar retry
        retries: 3       // 3 reintentos
      }
    );
    
    console.log('✅ Email enviado (con posibles reintentos):', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Falló después de reintentos:', error);
    return { success: false, error };
  }
};

/**
 * Ejecutar todos los tests
 */
export const runAllTests = async (emailPrueba: string) => {
  console.log('🚀 Iniciando suite de tests de Brevo\n');
  
  const results = {
    basic: await testBasicEmail(emailPrueba),
    full: await testFullEmail(emailPrueba),
    invalid: await testInvalidEmail(),
    // multiple: await testMultipleRecipients([emailPrueba, 'otro@ejemplo.com']), // Descomentar si tienes múltiples emails
    // retry: await testRetry(emailPrueba), // Descomentar para probar reintentos
  };
  
  console.log('\n📊 Resultados:');
  console.table(Object.entries(results).map(([test, result]) => ({
    Test: test,
    Estado: result.success ? '✅ PASS' : '❌ FAIL'
  })));
  
  return results;
};

// Para usar en la consola del navegador:
// import * as BrevoTests from './services/__tests__/brevoEmailService.test';
// await BrevoTests.runAllTests('tu@email.com');
