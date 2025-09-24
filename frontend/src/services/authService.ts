import { supabase } from './supabaseClient';



export const authService = {
  // Registro
  async signUp(email: string, password: string, metadata: { full_name: string; role: 'estudiante' | 'coordinador' }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  },

  // Login
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Obtener usuario actual
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  async resetPassword(email : string) {
    const {data,error} = await supabase.auth.resetPasswordForEmail(email,{
      redirectTo: `${window.location.origin}/reset-password`
    });
    return {data, error};
  },

  async updatePassword(newPassword: string){
    const {data , error} = await supabase.auth.updateUser({
      password: newPassword
    });
    return {data,error}
  },

  async isBlocked(email:string){
    const {data,error} = await supabase.rpc('auth_is_blocked', {
      p_email : email.toLowerCase()
    });
    return { data,error};
  },
  async recordLoginAttempt(email:string , success:boolean){
    const {data,error} = await supabase.rpc('auth_record_attempt', {
      p_email : email.toLowerCase(),
      p_success: success
    });
    return { data,error};
  },

  
  
};