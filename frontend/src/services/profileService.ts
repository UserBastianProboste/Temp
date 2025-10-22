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

const FALLBACK_PROFILE_COLUMNS = 'id, full_name, avatar_path, updated_at';

const isMissingColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  if (err.code === '42703') return true;
  return typeof err.message === 'string' && err.message.toLowerCase().includes('column') && err.message.toLowerCase().includes('does not exist');
};

export async function fetchProfile(userId: string): Promise<ProfileRecord | null> {
  const baseQuery = supabase
    .from('profiles')
    .eq('id', userId);

  const { data, error } = await baseQuery
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    const fallback = await baseQuery
      .select(FALLBACK_PROFILE_COLUMNS)
      .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    const record = fallback.data ?? null;
    if (!record) return null;
    return {
      ...record,
      phone: null,
      alternate_email: null,
    } as ProfileRecord;
  }

  return data ?? null;
}

export async function upsertProfile(userId: string, updates: ProfileUpdateInput): Promise<ProfileRecord | null> {
  const payload = Object.fromEntries(
    Object.entries(updates)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, value === '' ? null : value])
  );

  const baseQuery = supabase.from('profiles');

  const attempt = await baseQuery
    .upsert({
      id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .select(PROFILE_COLUMNS)
    .single();

  if (attempt.error) {
    if (!isMissingColumnError(attempt.error)) {
      throw attempt.error;
    }

    const fallbackPayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => key === 'full_name' || key === 'avatar_path')
    );

    const fallback = await baseQuery
      .upsert({
        id: userId,
        ...fallbackPayload,
        updated_at: new Date().toISOString(),
      })
      .select(FALLBACK_PROFILE_COLUMNS)
      .single();

    if (fallback.error) {
      throw fallback.error;
    }

    const record = fallback.data ?? null;
    if (!record) {
      return {
        id: userId,
        full_name: (payload.full_name as string | null) ?? null,
        avatar_path: (payload as Record<string, unknown>).avatar_path as string | null,
        updated_at: new Date().toISOString(),
        phone: (payload.phone as string | null) ?? null,
        alternate_email: (payload.alternate_email as string | null) ?? null,
      } as ProfileRecord;
    }
    return {
      ...record,
      phone: (payload.phone as string | null) ?? null,
      alternate_email: (payload.alternate_email as string | null) ?? null,
    } as ProfileRecord;
  }

  return attempt.data;
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
