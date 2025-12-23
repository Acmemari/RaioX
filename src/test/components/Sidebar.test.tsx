import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../../../components/Sidebar';
import { Agent, User } from '../../../types';

const mockAgents: Agent[] = [
  {
    id: 'admin-dashboard',
    name: 'Gestão de Clientes',
    description: 'Painel mestre administrativo',
    icon: 'users',
    category: 'admin',
    status: 'active',
  },
];

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'client',
  plan: 'basic',
};

describe('Sidebar', () => {
  const mockOnSelectAgent = vi.fn();
  const mockOnLogout = vi.fn();
  const mockToggleSidebar = vi.fn();

  it('should render sidebar with agents', () => {
    render(
      <Sidebar
        agents={mockAgents}
        activeAgentId="admin-dashboard"
        onSelectAgent={mockOnSelectAgent}
        isOpen={true}
        toggleSidebar={mockToggleSidebar}
        user={mockUser}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText('Hecttare')).toBeInTheDocument();
    expect(screen.getByText('Gestão de Clientes')).toBeInTheDocument();
  });

  it('should show user information', () => {
    render(
      <Sidebar
        agents={mockAgents}
        activeAgentId="admin-dashboard"
        onSelectAgent={mockOnSelectAgent}
        isOpen={true}
        toggleSidebar={mockToggleSidebar}
        user={mockUser}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});

