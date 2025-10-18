import { supabase, ensureAuthReady } from './supabaseClient';
import type { Estudiante } from '../types/database';

export const estudianteService = {
  // Crear estudiante
  async create(estudiante: Omit<Estudiante, 'id' | 'created_at' | 'updated_at'>) {
    console.log('Creando estudiante con datos:', estudiante);
    // wait a short while for auth session to be ready to avoid 401 unauthorized due to race
    const session = await ensureAuthReady(3000);
    if (!session) {
      console.warn('No session available before creating estudiante — request may be unauthorized');
    }

    const response = await supabase
      .from('estudiantes')
      .insert([{
        user_id: estudiante.user_id,
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        email: estudiante.email,
        telefono: estudiante.telefono || null,
        carrera: estudiante.carrera || null,
        sede: estudiante.sede || null,
      }])
      .select('*')
      .single();

    console.log('Resultado de inserción:', response);
    if (response.error) console.error('estudianteService.create error', response.error);
    return response;
  },

  // Obtener estudiante por user_id
  async getByUserId(userId: string) {
    const session = await ensureAuthReady(3000);
    if (!session) {
      console.warn('No session available before getByUserId — request may be unauthorized');
    }
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) console.error('estudianteService.getByUserId error', { userId, error });
    return { data, error };
  },

  // Obtener todos los estudiantes
  async getAll() {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('estudianteService.getAll error', { error });
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
    if (error) console.error('estudianteService.update error', { id, updates, error });
    return { data, error };
  }
};