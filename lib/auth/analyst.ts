import { supabase } from '../supabase';

/**
 * Verifica se um cliente pertence a um analista
 * @param analystId ID do analista
 * @param clientId ID do cliente
 * @returns true se o cliente pertence ao analista
 */
export const analystHasClient = async (analystId: string, clientId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('analyst_has_client', {
      analyst_id: analystId,
      client_id: clientId
    });
    
    if (error) {
      console.error('Error checking analyst-client relationship:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error calling analyst_has_client:', error);
    return false;
  }
};

/**
 * Obtém lista de IDs dos clientes de um analista
 * @param analystId ID do analista
 * @returns Array de IDs dos clientes
 */
export const getAnalystClients = async (analystId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase.rpc('get_analyst_clients', {
      analyst_id: analystId
    });
    
    if (error) {
      console.error('Error getting analyst clients:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error calling get_analyst_clients:', error);
    return [];
  }
};

/**
 * Associa um cliente a um analista
 * @param analystId ID do analista
 * @param clientId ID do cliente
 * @returns true se foi associado com sucesso
 */
export const addClientToAnalyst = async (analystId: string, clientId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('analyst_clients')
      .insert({
        analyst_id: analystId,
        client_id: clientId
      });
    
    if (error) {
      console.error('Error adding client to analyst:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in addClientToAnalyst:', error);
    return false;
  }
};

/**
 * Remove associação de um cliente com um analista
 * @param analystId ID do analista
 * @param clientId ID do cliente
 * @returns true se foi removido com sucesso
 */
export const removeClientFromAnalyst = async (analystId: string, clientId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('analyst_clients')
      .delete()
      .eq('analyst_id', analystId)
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error removing client from analyst:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeClientFromAnalyst:', error);
    return false;
  }
};

