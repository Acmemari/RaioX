import React, { useState, useEffect } from 'react';
import { Mail, Copy, CheckCircle2, XCircle, Clock, X, Loader2, Plus, AlertCircle } from 'lucide-react';
import { Invitation, createInvitation, getMyInvitations, cancelInvitation, formatInvitationStatus, generateInvitationLink, isInvitationValid } from '../lib/invitations';
import { useAuth } from '../contexts/AuthContext';

interface InvitationManagerProps {
  role: 'admin' | 'analyst';
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const InvitationManager: React.FC<InvitationManagerProps> = ({ role, onToast }) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvitationEmail, setNewInvitationEmail] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetRole = role === 'admin' ? 'analyst' : 'client';

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyInvitations();
      setInvitations(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar convites');
      if (onToast) {
        onToast(err.message || 'Erro ao carregar convites', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newInvitationEmail.trim()) {
      setError('Por favor, informe um email válido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newInvitationEmail)) {
      setError('Por favor, informe um email válido');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      
      const invitation = await createInvitation({
        email: newInvitationEmail.trim(),
        role: targetRole,
        expires_in_days: 7
      });

      setInvitations([invitation, ...invitations]);
      setNewInvitationEmail('');
      setShowCreateModal(false);
      
      if (onToast) {
        onToast(`Convite criado com sucesso para ${invitation.email}`, 'success');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar convite');
      if (onToast) {
        onToast(err.message || 'Erro ao criar convite', 'error');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este convite?')) {
      return;
    }

    try {
      await cancelInvitation(invitationId);
      setInvitations(invitations.map(inv => 
        inv.id === invitationId 
          ? { ...inv, status: 'cancelled' as const }
          : inv
      ));
      
      if (onToast) {
        onToast('Convite cancelado com sucesso', 'success');
      }
    } catch (err: any) {
      if (onToast) {
        onToast(err.message || 'Erro ao cancelar convite', 'error');
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    if (onToast) {
      onToast('Código copiado para a área de transferência', 'success');
    }
  };

  const handleCopyLink = (code: string) => {
    const link = generateInvitationLink(code);
    navigator.clipboard.writeText(link);
    if (onToast) {
      onToast('Link copiado para a área de transferência', 'success');
    }
  };

  const getStatusIcon = (invitation: Invitation) => {
    if (!isInvitationValid(invitation)) {
      if (invitation.status === 'accepted') {
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      }
      if (invitation.status === 'expired') {
        return <Clock size={14} className="text-amber-500" />;
      }
      return <XCircle size={14} className="text-rose-500" />;
    }
    return <Clock size={14} className="text-blue-500" />;
  };

  const getStatusColor = (invitation: Invitation) => {
    if (!isInvitationValid(invitation)) {
      if (invitation.status === 'accepted') {
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      }
      if (invitation.status === 'expired') {
        return 'text-amber-700 bg-amber-50 border-amber-200';
      }
      return 'text-rose-700 bg-rose-50 border-rose-200';
    }
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expirado';
    if (diffDays === 0) return 'Expira hoje';
    if (diffDays === 1) return 'Expira amanhã';
    return `Expira em ${diffDays} dias`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ai-subtext" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-ai-text">
            Convites para {targetRole === 'analyst' ? 'Analistas' : 'Clientes'}
          </h2>
          <p className="text-xs text-ai-subtext mt-1">
            Gerencie convites para {targetRole === 'analyst' ? 'analistas' : 'clientes'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ai-text text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Criar Convite
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Invitations List */}
      <div className="flex-1 bg-white rounded-xl border border-ai-border shadow-sm overflow-hidden flex flex-col">
        {invitations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Mail size={48} className="mx-auto text-ai-subtext opacity-30 mb-4" />
              <p className="text-sm text-ai-subtext">Nenhum convite criado ainda</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-sm text-ai-text hover:underline"
              >
                Criar primeiro convite
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-ai-surface sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">
                    Email
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">
                    Código
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">
                    Status
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">
                    Expiração
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ai-border">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-ai-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-ai-text">{invitation.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-ai-surface px-2 py-1 rounded border border-ai-border">
                          {invitation.invitation_code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(invitation.invitation_code)}
                          className="p-1 text-ai-subtext hover:text-ai-text transition-colors"
                          title="Copiar código"
                        >
                          {copiedCode === invitation.invitation_code ? (
                            <CheckCircle2 size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(invitation)}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getStatusColor(invitation)}`}>
                          {formatInvitationStatus(invitation.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-ai-subtext">
                      {formatExpiresAt(invitation.expires_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isInvitationValid(invitation) && (
                          <button
                            onClick={() => handleCopyLink(invitation.invitation_code)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                            title="Copiar link"
                          >
                            Copiar Link
                          </button>
                        )}
                        {invitation.status === 'pending' && (
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Cancelar convite"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invitation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-ai-border shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-ai-text">
                Criar Convite para {targetRole === 'analyst' ? 'Analista' : 'Cliente'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewInvitationEmail('');
                  setError(null);
                }}
                className="p-1 text-ai-subtext hover:text-ai-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ai-text mb-1.5">
                  Email do {targetRole === 'analyst' ? 'Analista' : 'Cliente'}
                </label>
                <input
                  type="email"
                  value={newInvitationEmail}
                  onChange={(e) => {
                    setNewInvitationEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder={`exemplo@${targetRole === 'analyst' ? 'analyst' : 'client'}.com`}
                  className="w-full px-3 py-2 border border-ai-border rounded-lg bg-ai-surface focus:outline-none focus:border-ai-text transition-colors text-sm"
                  required
                  disabled={isCreating}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-medium mb-1">Informações:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>O convite expira em 7 dias</li>
                  <li>O link de registro será gerado automaticamente</li>
                  <li>Você pode cancelar convites pendentes a qualquer momento</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewInvitationEmail('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm border border-ai-border rounded-lg hover:bg-ai-surface transition-colors"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-ai-text text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Criando...
                    </span>
                  ) : (
                    'Criar Convite'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationManager;

