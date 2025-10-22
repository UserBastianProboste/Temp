import { supabase } from "./supabaseClient";
import type { Empresa } from "../types/database";

export const empresaService = {
    async create(empresa: Omit<Empresa , 'id' | 'created_at' | 'updated_at'>) {
        console.log('Creando empresa con datos:',empresa)

        const {data,error} = await supabase
            .from('empresas')
            .insert([{
                razon_social:empresa.razon_social,
                direccion:empresa.direccion,
                jefe_directo:empresa.jefe_directo,
                cargo_jefe:empresa.cargo_jefe,
                telefono:empresa.telefono,
                email:empresa.email,
            }])
            .select()
            .single();
        console.log('Resultado de inserción:', { data, error });
        return { data, error };
    },
      // Obtener empresa por ID
    async getById(id: string) {
        const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();
        return { data, error };
    },

    // Obtener todas las empresas
    async getAll() {
        const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('razon_social', { ascending: true });
        return { data, error };
    },
      // Actualizar empresa
  async update(id: string, updates: Partial<Empresa>) {
    const sanitizedUpdates = Object.fromEntries(
      Object.entries({ ...updates, updated_at: new Date().toISOString() }).filter(
        ([, value]) => value !== undefined
      )
    );

    const { data, error } = await supabase
      .from('empresas')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Eliminar empresa
  async delete(id: string) {
    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Buscar empresas por nombre
  async search(query: string) {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .ilike('razon_social', `%${query}%`)
      .order('razon_social', { ascending: true });
    return { data, error };
  }
}