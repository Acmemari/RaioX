import React, { useState, useEffect } from 'react';
import { Users, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InvitationManager from '../components/InvitationManager';

const AnalystDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'invitations' | 'clients'>('invitations');
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users size={48} className="mx-auto text-ai-subtext opacity-30 mb-4" />
            <p className="text-sm text-ai-subtext">Lista de clientes em breve</p>
          </div>
        </div>
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

