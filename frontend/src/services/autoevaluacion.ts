import { supabase } from './supabaseClient';


export async function guardarAutoevaluacion(payload: any) {
  const { data, error } = await supabase
    .from("autoevaluaciones")
    .insert([payload]);

  if (error) throw error;
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