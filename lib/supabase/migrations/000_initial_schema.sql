-- ============================================================================
-- MIGRATION: Initial Schema for Hecttare
-- Descrição: Criação do schema inicial do banco de dados para o projeto Hecttare
-- Data: 2025-12-08
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Enum para roles de usuário
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'client');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para planos de assinatura
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('basic', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status de usuário
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABELAS PRINCIPAIS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Organizations (Organizações)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'basic',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE organizations IS 'Organizações/fazendas dos usuários';
COMMENT ON COLUMN organizations.owner_id IS 'ID do usuário proprietário da organização';

-- ----------------------------------------------------------------------------
-- 2.2 User Profiles (Perfis de Usuários)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  plan subscription_plan DEFAULT 'basic',
  status user_status DEFAULT 'active',
  avatar TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  phone TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT user_profiles_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT user_profiles_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT user_profiles_email_unique UNIQUE (email)
);

COMMENT ON TABLE user_profiles IS 'Perfis estendidos dos usuários autenticados';
COMMENT ON COLUMN user_profiles.id IS 'ID do usuário (FK para auth.users)';
COMMENT ON COLUMN user_profiles.organization_id IS 'ID da organização à qual o usuário pertence';

-- ----------------------------------------------------------------------------
-- 2.3 Chat Messages (Mensagens de Chat)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  text TEXT NOT NULL,
  attachment_name TEXT,
  attachment_mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chat_messages_text_not_empty CHECK (length(trim(text)) > 0)
);

COMMENT ON TABLE chat_messages IS 'Mensagens do chat persistidas para histórico';
COMMENT ON COLUMN chat_messages.role IS 'Role da mensagem: user ou model';

-- ----------------------------------------------------------------------------
-- 2.4 Cattle Scenarios (Cenários da Calculadora de Gado)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cattle_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  inputs JSONB NOT NULL,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT cattle_scenarios_name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE cattle_scenarios IS 'Cenários salvos da calculadora de lucro de gado';
COMMENT ON COLUMN cattle_scenarios.inputs IS 'Entradas da calculadora (CattleCalculatorInputs)';
COMMENT ON COLUMN cattle_scenarios.results IS 'Resultados calculados (CalculationResults) - opcional';

-- ============================================================================
-- 3. ÍNDICES
-- ============================================================================

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON user_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Índices para organizations
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- Índices para chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages(user_id, created_at DESC);

-- Índices para cattle_scenarios
CREATE INDEX IF NOT EXISTS idx_cattle_scenarios_user_id ON cattle_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_cattle_scenarios_created_at ON cattle_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cattle_scenarios_user_created ON cattle_scenarios(user_id, created_at DESC);

-- ============================================================================
-- 4. FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Função genérica para atualizar o campo updated_at automaticamente';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cattle_scenarios_updated_at
  BEFORE UPDATE ON cattle_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil de usuário automaticamente
CREATE OR REPLACE FUNCTION create_user_profile_if_missing(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  user_exists BOOLEAN;
  new_org_id UUID;
BEGIN
  -- Verificar se o perfil já existe
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = user_id) INTO user_exists;
  
  IF user_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Obter informações do usuário do auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
  INTO user_email, user_name
  FROM auth.users
  WHERE id = user_id;
  
  -- Se não encontrou nome, usar email
  IF user_name IS NULL OR user_name = '' THEN
    user_name := split_part(user_email, '@', 1);
  END IF;
  
  -- Criar perfil de usuário
  INSERT INTO user_profiles (id, name, email, role, plan, status)
  VALUES (
    user_id,
    COALESCE(user_name, 'Usuário'),
    user_email,
    'client',
    'basic',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Criar organização padrão para o usuário
  INSERT INTO organizations (name, owner_id, plan)
  VALUES (
    COALESCE(user_name, 'Minha Organização') || ' - Organização',
    user_id,
    'basic'
  )
  RETURNING id INTO new_org_id;
  
  -- Associar usuário à organização criada
  UPDATE user_profiles
  SET organization_id = new_org_id
  WHERE id = user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_user_profile_if_missing(UUID) IS 'Cria perfil de usuário e organização padrão se não existir';

-- Trigger para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_user_profile_if_missing(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Handler para criar perfil quando novo usuário é criado no auth.users';

-- Trigger no auth.users (deve ser criado com cuidado)
-- NOTA: Este trigger só funciona se você tiver permissões de superuser
-- Caso contrário, use a função create_user_profile_if_missing manualmente
-- ou através de uma Edge Function do Supabase

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cattle_scenarios ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. POLICIES RLS - USER_PROFILES
-- ============================================================================

-- SELECT: Usuários podem ver seu próprio perfil e admins podem ver todos
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Apenas sistema pode inserir (através de triggers/functions)
CREATE POLICY "System can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true); -- RLS será verificado pela função SECURITY DEFINER

-- UPDATE: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE: Admins podem atualizar qualquer perfil (exceto role de outros admins)
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Apenas admins podem deletar perfis (normalmente via CASCADE do auth.users)
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 7. POLICIES RLS - ORGANIZATIONS
-- ============================================================================

-- SELECT: Usuários podem ver organizações das quais fazem parte
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

-- SELECT: Admins podem ver todas as organizações
CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Usuários autenticados podem criar organizações (geralmente via função)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Apenas o owner pode atualizar
CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Admins podem atualizar qualquer organização
CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Apenas owner ou admin pode deletar
CREATE POLICY "Owners and admins can delete organizations"
  ON organizations FOR DELETE
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 8. POLICIES RLS - CHAT_MESSAGES
-- ============================================================================

-- SELECT: Usuários podem ver suas próprias mensagens
CREATE POLICY "Users can view their own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Admins podem ver todas as mensagens
CREATE POLICY "Admins can view all messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Usuários podem inserir suas próprias mensagens
CREATE POLICY "Users can insert their own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuários podem atualizar suas próprias mensagens (limitado)
CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuários podem deletar suas próprias mensagens
CREATE POLICY "Users can delete their own messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- DELETE: Admins podem deletar qualquer mensagem
CREATE POLICY "Admins can delete all messages"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 9. POLICIES RLS - CATTLE_SCENARIOS
-- ============================================================================

-- SELECT: Usuários podem ver seus próprios cenários
CREATE POLICY "Users can view their own scenarios"
  ON cattle_scenarios FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Admins podem ver todos os cenários
CREATE POLICY "Admins can view all scenarios"
  ON cattle_scenarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Usuários podem inserir seus próprios cenários
CREATE POLICY "Users can insert their own scenarios"
  ON cattle_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuários podem atualizar seus próprios cenários
CREATE POLICY "Users can update their own scenarios"
  ON cattle_scenarios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuários podem deletar seus próprios cenários
CREATE POLICY "Users can delete their own scenarios"
  ON cattle_scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- DELETE: Admins podem deletar qualquer cenário
CREATE POLICY "Admins can delete all scenarios"
  ON cattle_scenarios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 10. GRANTS E PERMISSÕES
-- ============================================================================

-- Garantir que usuários autenticados podem usar as funções necessárias
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permitir que funções sejam executadas
GRANT EXECUTE ON FUNCTION create_user_profile_if_missing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

