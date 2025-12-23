import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BrainCircuit, Lock, Mail, ArrowRight, Loader2, User, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getInvitationByCode, acceptInvitation, isInvitationValid, Invitation } from '../lib/invitations';
import { formatPhone, validatePhone } from '../lib/utils/phoneMask';

interface RegisterPageProps {
  invitationCode?: string;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onSuccess?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ invitationCode, onToast, onSuccess }) => {
  const { signup } = useAuth() as any;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invitationCode) {
      loadInvitation(invitationCode);
    } else {
      setIsLoadingInvitation(false);
      setInvitationError('Código de convite não fornecido');
    }
  }, [invitationCode]);

  const loadInvitation = async (code: string) => {
    try {
      setIsLoadingInvitation(true);
      setInvitationError(null);
      
      const inv = await getInvitationByCode(code);
      
      if (!inv) {
        setInvitationError('Convite não encontrado');
        return;
      }

      if (!isInvitationValid(inv)) {
        if (inv.status === 'accepted') {
          setInvitationError('Este convite já foi aceito');
        } else if (inv.status === 'expired') {
          setInvitationError('Este convite expirou');
        } else {
          setInvitationError('Este convite não é válido');
        }
        return;
      }

      setInvitation(inv);
    } catch (err: any) {
      setInvitationError(err.message || 'Erro ao carregar convite');
    } finally {
      setIsLoadingInvitation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!invitation) {
      setError('Convite inválido');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }

    if (!phone.trim()) {
      setError('Por favor, informe seu telefone.');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Por favor, informe um telefone válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Criar conta
      const signupResult = await signup(
        invitation.email,
        password,
        name,
        phone,
        organizationName
      );

      if (!signupResult.success) {
        setError(signupResult.error || 'Erro ao criar conta. Tente novamente.');
        setIsSubmitting(false);
        return;
      }

      // Aceitar convite
      try {
        await acceptInvitation(invitation.invitation_code);
        
        if (onToast) {
          onToast('Conta criada e convite aceito com sucesso!', 'success');
        }
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (invErr: any) {
        // Conta criada mas erro ao aceitar convite
        console.error('Erro ao aceitar convite:', invErr);
        if (onToast) {
          onToast('Conta criada, mas houve um erro ao aceitar o convite. Entre em contato com o suporte.', 'warning');
        }
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const passwordsMatch = confirmPassword === '' || password === confirmPassword;
  const passwordLengthValid = password === '' || password.length >= 6;

  if (isLoadingInvitation) {
    return (
      <div className="w-full min-h-screen bg-ai-bg text-ai-text font-sans flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-ai-subtext" />
          <p className="text-sm text-ai-subtext">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (invitationError || !invitation) {
    return (
      <div className="w-full min-h-screen bg-ai-bg text-ai-text font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-ai-border shadow-sm p-6">
          <div className="flex items-start gap-3 mb-4">
            <XCircle size={24} className="text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-ai-text mb-1">Erro ao carregar convite</h2>
              <p className="text-sm text-ai-subtext">{invitationError || 'Convite não encontrado'}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-ai-text text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-ai-bg text-ai-text font-sans overflow-y-auto">
      <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-8 pb-12">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="p-2 sm:p-3 rounded-xl bg-ai-text text-white mb-3 sm:mb-4">
            <BrainCircuit size={24} className="sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Hecttare</h1>
          <p className="text-ai-subtext text-xs sm:text-sm mt-1 sm:mt-2">Aceite seu convite e crie sua conta</p>
        </div>

        {/* Invitation Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Convite válido para {invitation.role === 'analyst' ? 'Analista' : 'Cliente'}
              </p>
              <p className="text-xs text-blue-700">
                Email: <strong>{invitation.email}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Expira em: {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-ai-border shadow-sm p-4 sm:p-6 md:p-8">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold">Criar sua conta</h2>
            <p className="text-[10px] sm:text-xs text-ai-subtext mt-1">
              Complete seu cadastro para aceitar o convite.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                  <User size={14} className="sm:w-4 sm:h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border border-ai-border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text focus:border-ai-text transition-all outline-none"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                  <Mail size={14} className="sm:w-4 sm:h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={invitation.email}
                  disabled
                  className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface/50 border border-ai-border rounded-lg text-xs sm:text-sm text-ai-subtext cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-ai-subtext mt-1">Este email foi definido no convite</p>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                Telefone / WhatsApp
                {phone && !validatePhone(phone) && (
                  <span className="text-rose-500 ml-1">(formato inválido)</span>
                )}
                {phone && validatePhone(phone) && (
                  <span className="text-green-600 ml-1">✓</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                  <User size={14} className="sm:w-4 sm:h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setPhone(formatted);
                  }}
                  className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text transition-all outline-none ${
                    phone && !validatePhone(phone)
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : phone && validatePhone(phone)
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                      : 'border-ai-border focus:border-ai-text'
                  }`}
                  placeholder="Ex: (55) 99999-9999"
                  maxLength={15}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                Senha
                {password && !passwordLengthValid && (
                  <span className="text-rose-500 ml-1">(mínimo 6 caracteres)</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                  <Lock size={14} className="sm:w-4 sm:h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text focus:border-ai-text transition-all outline-none ${
                    password && !passwordLengthValid
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-ai-border'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                Confirmar Senha
                {confirmPassword && !passwordsMatch && (
                  <span className="text-rose-500 ml-1">(senhas não coincidem)</span>
                )}
                {confirmPassword && passwordsMatch && password && (
                  <span className="text-green-600 ml-1">✓</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                  <Lock size={14} className="sm:w-4 sm:h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text transition-all outline-none ${
                    confirmPassword && !passwordsMatch
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : confirmPassword && passwordsMatch
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                      : 'border-ai-border focus:border-ai-text'
                  }`}
                  placeholder="Digite a senha novamente"
                />
              </div>
            </div>

            {invitation.role === 'client' && (
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                  Nome da Organização/Fazenda <span className="text-ai-subtext font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                    <User size={14} className="sm:w-4 sm:h-4" />
                  </div>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border border-ai-border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text focus:border-ai-text transition-all outline-none"
                    placeholder="Ex: Fazenda Santa Rita"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !passwordsMatch ||
                !passwordLengthValid ||
                !name.trim() ||
                !phone.trim() ||
                !validatePhone(phone)
              }
              className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 bg-ai-text text-white rounded-lg hover:bg-black transition-colors font-medium text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
              ) : (
                <>
                  <span>Criar conta e aceitar convite</span>
                  <ArrowRight size={14} className="sm:w-4 sm:h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

