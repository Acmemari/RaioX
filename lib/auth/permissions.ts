import { User, Plan } from '../../types';
import { PLANS } from '../../constants';

/**
 * Verifica se o usuário tem permissão para acessar uma feature
 * @param user Usuário atual
 * @param feature Nome da feature
 * @returns true se tem permissão, false caso contrário
 */
export const checkPermission = (user: User | null, feature: string): boolean => {
  if (!user || !user.plan) return false;
  // Admin tem acesso total
  if (user.role === 'admin') return true;
  
  // Analyst tem acesso às features baseado no plano (mas pode acessar dados de múltiplos clientes)
  // Client tem acesso baseado no plano

  const userPlan = PLANS.find(p => p.id === user.plan);
  if (!userPlan) return false;

  // Check if feature is in plan features
  const hasWildcard = userPlan.features.some(f => f.toLowerCase().includes('todos os agentes'));
  if (hasWildcard) return true;

  return userPlan.features.some(f => f.toLowerCase().includes(feature.toLowerCase())) || userPlan.id === 'enterprise';
};

/**
 * Verifica se o usuário está dentro do limite para uma métrica
 * @param user Usuário atual
 * @param limit Tipo de limite
 * @param currentValue Valor atual
 * @returns true se está dentro do limite, false caso contrário
 */
export const checkLimit = (
  user: User | null,
  limit: keyof Plan['limits'],
  currentValue: number
): boolean => {
  if (!user || !user.plan) return false;
  // Admin não tem limites
  if (user.role === 'admin') return true;
  
  // Analyst e Client seguem os limites do plano

  const userPlan = PLANS.find(p => p.id === user.plan);
  if (!userPlan) return false;

  return currentValue < userPlan.limits[limit];
};

/**
 * Verifica se um usuário é analista
 * @param user Usuário atual
 * @returns true se é analista
 */
export const isAnalyst = (user: User | null): boolean => {
  return user?.role === 'analyst';
};

/**
 * Verifica se um usuário é administrador
 * @param user Usuário atual
 * @returns true se é administrador
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

/**
 * Verifica se um usuário é cliente
 * @param user Usuário atual
 * @returns true se é cliente
 */
export const isClient = (user: User | null): boolean => {
  return user?.role === 'client';
};

