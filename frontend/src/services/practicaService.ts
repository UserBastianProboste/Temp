import { supabase } from './supabaseClient';
import type { Practica } from '../types/database';

export const practicaService = {
  // Crear práctica
  async create(practica: Omit<Practica, 'id' | 'created_at' | 'updated_at'>) {
    console.log('Creando práctica con datos:', practica);
    
    const { data, error } = await supabase
      .from('practicas')
      .insert([{
        estudiante_id: practica.estudiante_id,
        empresa_id: practica.empresa_id,
        coordinador_id: practica.coordinador_id || null,
        tipo_practica: practica.tipo_practica,
        fecha_inicio: practica.fecha_inicio,
        fecha_termino: practica.fecha_termino,
        horario_trabajo: practica.horario_trabajo,
        colacion: practica.colacion,
        cargo_por_desarrollar: practica.cargo_por_desarrollar,
        departamento: practica.departamento,
        actividades: practica.actividades,
        fecha_firma: practica.fecha_firma || null,
        firma_alumno: practica.firma_alumno || null,
        estado: practica.estado || 'pendiente'
      }])
      .select()
      .single();
    
    console.log('Resultado de inserción:', { data, error });
    return { data, error };
  },

  // Obtener práctica por ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('practicas')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  // Obtener prácticas por estudiante
  async getByEstudianteId(estudianteId: string) {
    const { data, error } = await supabase
      .from('practicas')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Obtener prácticas por coordinador
  async getByCoordinadorId(coordinadorId: string) {
    const { data, error } = await supabase
      .from('practicas')
      .select('*')
      .eq('coordinador_id', coordinadorId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Obtener todas las prácticas
  async getAll() {
    const { data, error } = await supabase
      .from('practicas')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Obtener prácticas con información completa (usando la vista)
  async getAllWithDetails() {
    const { data, error } = await supabase
      .from('vista_practicas_completa')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Actualizar práctica
  async update(id: string, updates: Partial<Practica>) {
    const { data, error } = await supabase
      .from('practicas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Asignar coordinador a práctica
  async assignCoordinador(practicaId: string, coordinadorId: string) {
    const { data, error } = await supabase
      .from('practicas')
      .update({ 
        coordinador_id: coordinadorId, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', practicaId)
      .select()
      .single();
    return { data, error };
  },

  // Cambiar estado de práctica
  async updateEstado(id: string, estado: Practica['estado']) {
    const { data, error } = await supabase
      .from('practicas')
      .update({ 
        estado, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Eliminar práctica
  async delete(id: string) {
    const { error } = await supabase
      .from('practicas')
      .delete()
      .eq('id', id);
    return { error };
  }
};