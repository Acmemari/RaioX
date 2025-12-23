import { Plan } from './types';

export const PLANS: Plan[] = [
    {
        id: 'basic',
        name: 'Básico',
        price: 0,
        features: ['Acesso básico ao sistema'],
        limits: { agents: 0, historyDays: 7, users: 1 }
    },
    {
        id: 'pro',
        name: 'Profissional',
        price: 97,
        features: ['Acesso completo ao sistema'],
        limits: { agents: 1, historyDays: 365, users: 3 }
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 299,
        features: ['Múltiplos Usuários', 'API Dedicada', 'Suporte Prioritário'],
        limits: { agents: 1, historyDays: 9999, users: 10 }
    }
];
