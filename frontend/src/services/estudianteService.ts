import { supabase } from './supabaseClient';
import type { Estudiante } from '../types/database';

export const estudianteService = {
  // Crear estudiante
  async create(estudiante: Omit<Estudiante, 'id' | 'created_at' | 'updated_at'>) {
    console.log('Creando estudiante con datos:', estudiante);
    
    const { data, error } = await supabase
      .from('estudiantes')
      .insert([{
        user_id: estudiante.user_id,
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        email: estudiante.email,
        telefono: estudiante.telefono || null,
        carrera: estudiante.carrera || null,
      }])
      .select()
      .single();
    
    console.log('Resultado de inserción:', { data, error });
    return { data, error };
  },

  // Obtener estudiante por user_id
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  // Obtener todos los estudiantes
  async getAll() {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Actualizar estudiante
  async update(id: string, updates: Partial<Estudiante>) {
    const { data, error } = await supabase
      .from('estudiantes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }
};