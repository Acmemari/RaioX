import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

// Valida e obtém variáveis de ambiente com tratamento de erro
let supabase: ReturnType<typeof createClient>;

try {
  const env = getEnv();
  supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
} catch (error) {
  // Se houver erro na inicialização, criar cliente com valores vazios
  // para evitar quebrar a aplicação completamente
  console.error('Erro ao inicializar Supabase:', error);
  supabase = createClient('', '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

export { supabase };

