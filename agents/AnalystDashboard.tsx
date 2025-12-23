import React, { useState, useEffect } from 'react';
import { Users, Mail, Search, MoreHorizontal, CheckCircle2, XCircle, Loader2, AlertCircle, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InvitationManager from '../components/InvitationManager';
import { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { mapUserProfile } from '../lib/auth/mapUserProfile';

const AnalystDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'invitations' | 'clients'>('invitations');
  const [clients, setClients] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
  });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  useEffect(() => {
    if (currentUser?.role === 'analyst') {
      if (activeTab === 'clients') {
        loadMyClients();
      } else {
        setIsLoading(false);
      }
    } else if (currentUser && currentUser.role !== 'analyst') {
      setError('Acesso negado. Apenas analistas podem visualizar esta página.');
      setIsLoading(false);
    }
  }, [currentUser, activeTab]);

  const loadMyClients = async (retries = 3, delay = 1000) => {
    if (currentUser?.role !== 'analyst' || !currentUser?.id) {
      setError('Acesso negado. Apenas analistas podem visualizar esta página.');
      setIsLoading(false);
      return;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`[AnalystDashboard] Loading clients for analyst ${currentUser.id} (attempt ${attempt + 1}/${retries})...`);
        
        // Buscar clientes através da tabela analyst_clients
        const { data: analystClientsData, error: analystClientsError } = await supabase
          .from('analyst_clients')
          .select('client_id')
          .eq('analyst_id', currentUser.id);

        if (analystClientsError) {
          console.error('[AnalystDashboard] Error loading analyst_clients:', analystClientsError);
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          setError(`Erro ao carregar clientes: ${analystClientsError.message || 'Erro desconhecido'}`);
          setIsLoading(false);
          return;
        }

        if (!analystClientsData || analystClientsData.length === 0) {
          console.log('[AnalystDashboard] No clients found for this analyst');
          setClients([]);
          setStats({ total: 0, active: 0 });
          setIsLoading(false);
          return;
        }

        const clientIds = analystClientsData.map(ac => ac.client_id);

        // Buscar perfis dos clientes
        const { data: clientsData, error: clientsError } = await supabase
          .from('user_profiles')
          .select('*')
          .in('id', clientIds)
          .eq('role', 'client')
          .order('created_at', { ascending: false });

        if (clientsError) {
          console.error('[AnalystDashboard] Error loading clients:', clientsError);
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          setError(`Erro ao carregar clientes: ${clientsError.message || 'Erro desconhecido'}`);
          setIsLoading(false);
          return;
        }

        if (clientsData) {
          console.log(`[AnalystDashboard] Loaded ${clientsData.length} client profiles`);
          
          const mappedClients = clientsData.map(mapUserProfile).filter(Boolean) as UserType[];
          setClients(mappedClients);
          
          const active = mappedClients.filter(c => c.status === 'active').length;
          setStats({
            total: mappedClients.length,
            active,
          });
          
          setIsLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('[AnalystDashboard] Exception loading clients:', error);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        setError(`Erro inesperado ao carregar clientes: ${error.message || 'Erro desconhecido'}`);
      } finally {
        if (attempt === retries - 1) {
          setIsLoading(false);
        }
      }
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Nunca';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  if (isLoading && activeTab === 'clients') {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ai-subtext" />
      </div>
    );
  }

  if (error && activeTab === 'clients') {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900 mb-1">Erro ao carregar dados</h3>
              <p className="text-xs text-red-700 mb-4">{error}</p>
              <button
                onClick={() => loadMyClients()}
                className="text-xs px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-2">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-ai-border">
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'invitations'
              ? 'border-ai-text text-ai-text'
              : 'border-transparent text-ai-subtext hover:text-ai-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail size={16} />
            Convites para Clientes
          </div>
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'clients'
              ? 'border-ai-text text-ai-text'
              : 'border-transparent text-ai-subtext hover:text-ai-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} />
            Meus Clientes
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'invitations' ? (
        <InvitationManager role="analyst" onToast={addToast} />
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-ai-border shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18} /></div>
                <span className="text-xs font-bold text-ai-subtext uppercase">Total Clientes</span>
              </div>
              <div className="text-2xl font-mono font-bold text-ai-text">{stats.total}</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">Clientes cadastrados</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-ai-border shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity size={18} /></div>
                <span className="text-xs font-bold text-ai-subtext uppercase">Ativos</span>
              </div>
              <div className="text-2xl font-mono font-bold text-ai-text">{stats.active}</div>
              <div className="text-xs text-ai-subtext font-medium mt-1">Clientes ativos</div>
            </div>
          </div>

          {/* Main Table Area */}
          <div className="flex-1 bg-white rounded-xl border border-ai-border shadow-sm flex flex-col overflow-hidden">
            {/* Table Header / Toolbar */}
            <div className="p-4 border-b border-ai-border flex justify-between items-center">
              <h2 className="text-sm font-bold text-ai-text">Meus Clientes</h2>
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ai-subtext" />
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-ai-border rounded-md bg-ai-surface focus:outline-none focus:border-ai-text transition-colors"
                />
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-ai-surface sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Cliente</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Plano</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Último Acesso</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ai-border">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-ai-subtext">
                        {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente atribuído'}
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-ai-surface/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-ai-text text-white flex items-center justify-center text-xs font-bold mr-3">
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-ai-text">{client.name}</div>
                              <div className="text-xs text-ai-subtext">{client.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                            ${client.plan === 'enterprise' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                              client.plan === 'pro' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              'bg-gray-50 text-gray-600 border-gray-200'}
                          `}>
                            {client.plan === 'enterprise' ? 'Enterprise' : client.plan === 'pro' ? 'Pro' : 'Básico'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {client.status === 'active' 
                              ? <CheckCircle2 size={14} className="text-emerald-500 mr-1.5" /> 
                              : <XCircle size={14} className="text-rose-500 mr-1.5" />
                            }
                            <span className={`text-xs ${client.status === 'active' ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {client.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-ai-subtext">
                          {formatLastLogin(client.lastLogin)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-ai-subtext hover:text-ai-text p-1 rounded hover:bg-ai-border/50 transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 border-t border-ai-border bg-ai-surface/30 text-xs text-ai-subtext text-center">
              Mostrando {filteredClients.length} de {stats.total} clientes
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg border text-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalystDashboard;

