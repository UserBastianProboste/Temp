import { supabase } from './supabaseClient';

export interface ProfileRecord {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  alternate_email?: string | null;
  avatar_path?: string | null;
  updated_at?: string | null;
}

export interface ProfileUpdateInput {
  full_name?: string | null;
  phone?: string | null;
  alternate_email?: string | null;
}

const PROFILE_COLUMNS = 'id, full_name, phone, alternate_email, avatar_path, updated_at';

export async function fetchProfile(userId: string): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function upsertProfile(userId: string, updates: ProfileUpdateInput): Promise<ProfileRecord | null> {
  const payload = Object.fromEntries(
    Object.entries(updates)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, value === '' ? null : value])
  );

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAvatarSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 10);

  if (error) {
    throw error;
  }

  return data?.signedUrl ?? null;
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ avatarUrl: string | null; avatarPath: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type || 'image/jpeg' });

  if (uploadError) {
    throw uploadError;
  }

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      avatar_path: filePath,
      updated_at: new Date().toISOString(),
    });

  if (upsertError) {
    throw upsertError;
  }

  const avatarUrl = await getAvatarSignedUrl(filePath);

  return { avatarUrl, avatarPath: filePath };
}
