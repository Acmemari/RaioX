import { supabase } from './supabase';

export interface Invitation {
  id: string;
  invitation_code: string;
  email: string;
  role: 'analyst' | 'client';
  invited_by: string;
  invited_by_role: 'admin' | 'analyst';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  inviter_name?: string;
  inviter_email?: string;
  accepted_by_name?: string;
  accepted_by_email?: string;
}

export interface CreateInvitationParams {
  email: string;
  role: 'analyst' | 'client';
  expires_in_days?: number;
  metadata?: Record<string, any>;
}

/**
 * Cria um novo convite
 */
export const createInvitation = async (params: CreateInvitationParams): Promise<Invitation> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    throw new Error('Usuário não autenticado');
  }

  const userId = userData.user.id;
  if (!userId) {
    throw new Error('ID do usuário não encontrado');
  }

  const { data, error } = await supabase.rpc('create_invitation', {
    p_email: params.email,
    p_role: params.role,
    p_invited_by: userId,
    p_invited_by_role: params.role === 'analyst' ? 'admin' : 'analyst',
    p_expires_in_days: params.expires_in_days || 7,
    p_metadata: params.metadata || {}
  });

  if (error) {
    throw new Error(error.message || 'Erro ao criar convite');
  }

  return data;
};

/**
 * Busca convites criados pelo usuário atual
 */
export const getMyInvitations = async (): Promise<Invitation[]> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    throw new Error('Usuário não autenticado');
  }

  const userId = userData.user.id;
  if (!userId) {
    throw new Error('ID do usuário não encontrado');
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('invited_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Erro ao buscar convites');
  }

  return data || [];
};

/**
 * Busca todos os convites (apenas para admins)
 */
export const getAllInvitations = async (): Promise<Invitation[]> => {
  const { data, error } = await supabase
    .from('invitations_with_inviter')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Erro ao buscar convites');
  }

  return data || [];
};

/**
 * Busca convite por código
 */
export const getInvitationByCode = async (code: string): Promise<Invitation | null> => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('invitation_code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(error.message || 'Erro ao buscar convite');
  }

  return data;
};

/**
 * Aceita um convite
 */
export const acceptInvitation = async (invitationCode: string): Promise<Invitation> => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase.rpc('accept_invitation', {
    p_invitation_code: invitationCode,
    p_user_id: user.id
  });

  if (error) {
    throw new Error(error.message || 'Erro ao aceitar convite');
  }

  return data;
};

/**
 * Cancela um convite
 */
export const cancelInvitation = async (invitationId: string): Promise<Invitation> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    throw new Error('Usuário não autenticado');
  }

  const userId = userData.user.id;
  if (!userId) {
    throw new Error('ID do usuário não encontrado');
  }

  const { data, error } = await supabase.rpc('cancel_invitation', {
    p_invitation_id: invitationId,
    p_user_id: userId
  });

  if (error) {
    throw new Error(error.message || 'Erro ao cancelar convite');
  }

  return data;
};

/**
 * Verifica se um convite é válido
 */
export const isInvitationValid = (invitation: Invitation | null): boolean => {
  if (!invitation) return false;
  if (invitation.status !== 'pending') return false;
  if (new Date(invitation.expires_at) < new Date()) return false;
  return true;
};

/**
 * Formata o status do convite
 */
export const formatInvitationStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    accepted: 'Aceito',
    expired: 'Expirado',
    cancelled: 'Cancelado'
  };
  return statusMap[status] || status;
};

/**
 * Gera link de convite
 */
export const generateInvitationLink = (code: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/register?code=${code}`;
};

