-- ============================================================================
-- MIGRATION: Invitations System for Multi-Tenant Architecture
-- Descrição: Sistema de convites para administradores e analistas
-- Data: 2025-01-XX
-- ============================================================================

-- ============================================================================
-- 1. ATUALIZAR ENUM user_role para incluir 'analyst'
-- ============================================================================

-- Adicionar 'analyst' ao enum user_role se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'analyst' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'analyst';
  END IF;
END $$;

-- ============================================================================
-- 2. CRIAR ENUM PARA STATUS DE CONVITE
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. CRIAR TABELA DE CONVITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role user_role NOT NULL CHECK (role IN ('analyst', 'client')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_role user_role NOT NULL CHECK (invited_by_role IN ('admin', 'analyst')),
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT invitations_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT invitations_code_not_empty CHECK (length(trim(invitation_code)) > 0),
  CONSTRAINT invitations_role_inviter_match CHECK (
    (role = 'analyst' AND invited_by_role = 'admin') OR
    (role = 'client' AND invited_by_role = 'analyst')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

COMMENT ON TABLE invitations IS 'Sistema de convites para registro de usuários multi-tenant';
COMMENT ON COLUMN invitations.invitation_code IS 'Código único do convite usado para registro';
COMMENT ON COLUMN invitations.role IS 'Role do usuário que será criado ao aceitar o convite';
COMMENT ON COLUMN invitations.invited_by_role IS 'Role de quem criou o convite (admin para analyst, analyst para client)';
COMMENT ON COLUMN invitations.metadata IS 'Dados adicionais do convite (ex: nome da organização, notas)';

-- ============================================================================
-- 4. FUNÇÃO PARA GERAR CÓDIGO DE CONVITE ÚNICO
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Gerar código aleatório de 16 caracteres
    code := upper(
      substr(
        encode(gen_random_bytes(12), 'base64'),
        1, 16
      )
    );
    -- Remover caracteres especiais e garantir apenas alfanuméricos
    code := regexp_replace(code, '[^A-Z0-9]', '', 'g');
    code := substr(code, 1, 16);
    
    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM invitations WHERE invitation_code = code) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invitation_code() IS 'Gera um código de convite único de 16 caracteres';

-- ============================================================================
-- 5. FUNÇÃO PARA CRIAR CONVITE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_invitation(
  p_email TEXT,
  p_role user_role,
  p_invited_by UUID,
  p_invited_by_role user_role,
  p_expires_in_days INTEGER DEFAULT 7,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS invitations AS $$
DECLARE
  v_invitation invitations;
  v_code TEXT;
BEGIN
  -- Validar role do convite
  IF p_role NOT IN ('analyst', 'client') THEN
    RAISE EXCEPTION 'Role deve ser analyst ou client';
  END IF;
  
  -- Validar role do convitador
  IF (p_role = 'analyst' AND p_invited_by_role != 'admin') OR
     (p_role = 'client' AND p_invited_by_role != 'analyst') THEN
    RAISE EXCEPTION 'Permissão inválida: admin convida analyst, analyst convida client';
  END IF;
  
  -- Verificar se já existe convite pendente para este email
  IF EXISTS (
    SELECT 1 FROM invitations 
    WHERE email = p_email 
    AND status = 'pending' 
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este email';
  END IF;
  
  -- Gerar código único
  v_code := generate_invitation_code();
  
  -- Criar convite
  INSERT INTO invitations (
    invitation_code,
    email,
    role,
    invited_by,
    invited_by_role,
    expires_at,
    metadata
  ) VALUES (
    v_code,
    p_email,
    p_role,
    p_invited_by,
    p_invited_by_role,
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_metadata
  )
  RETURNING * INTO v_invitation;
  
  RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_invitation IS 'Cria um novo convite com validações';

-- ============================================================================
-- 6. FUNÇÃO PARA ACEITAR CONVITE
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_invitation(
  p_invitation_code TEXT,
  p_user_id UUID
)
RETURNS invitations AS $$
DECLARE
  v_invitation invitations;
  v_user_email TEXT;
BEGIN
  -- Buscar convite
  SELECT * INTO v_invitation
  FROM invitations
  WHERE invitation_code = p_invitation_code;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;
  
  -- Verificar status
  IF v_invitation.status != 'pending' THEN
    RAISE EXCEPTION 'Convite já foi usado ou cancelado';
  END IF;
  
  -- Verificar expiração
  IF v_invitation.expires_at < NOW() THEN
    -- Atualizar status para expirado
    UPDATE invitations
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_invitation.id;
    
    RAISE EXCEPTION 'Convite expirado';
  END IF;
  
  -- Verificar email do usuário
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_user_email != v_invitation.email THEN
    RAISE EXCEPTION 'Email do usuário não corresponde ao email do convite';
  END IF;
  
  -- Atualizar convite
  UPDATE invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = p_user_id,
    updated_at = NOW()
  WHERE id = v_invitation.id
  RETURNING * INTO v_invitation;
  
  -- Atualizar perfil do usuário com o role do convite
  UPDATE user_profiles
  SET 
    role = v_invitation.role,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_invitation IS 'Aceita um convite e atualiza o role do usuário';

-- ============================================================================
-- 7. FUNÇÃO PARA CANCELAR CONVITE
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_invitation(
  p_invitation_id UUID,
  p_user_id UUID
)
RETURNS invitations AS $$
DECLARE
  v_invitation invitations;
BEGIN
  -- Buscar convite
  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;
  
  -- Verificar permissão (apenas quem criou pode cancelar)
  IF v_invitation.invited_by != p_user_id THEN
    RAISE EXCEPTION 'Apenas quem criou o convite pode cancelá-lo';
  END IF;
  
  -- Verificar se já foi aceito
  IF v_invitation.status = 'accepted' THEN
    RAISE EXCEPTION 'Não é possível cancelar um convite já aceito';
  END IF;
  
  -- Cancelar convite
  UPDATE invitations
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_invitation_id
  RETURNING * INTO v_invitation;
  
  RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_invitation IS 'Cancela um convite pendente';

-- ============================================================================
-- 8. TRIGGER PARA ATUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins veem todos, analysts veem seus próprios convites, usuários veem convites para seu email
CREATE POLICY "Admins can view all invitations"
  ON invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Analysts can view their own invitations"
  ON invitations FOR SELECT
  USING (
    invited_by = auth.uid() OR
    (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'analyst'
    ) AND role = 'client')
  );

CREATE POLICY "Users can view invitations for their email"
  ON invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- INSERT: Admins podem criar convites para analysts, analysts podem criar para clients
CREATE POLICY "Admins can create analyst invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) AND role = 'analyst' AND invited_by = auth.uid() AND invited_by_role = 'admin'
  );

CREATE POLICY "Analysts can create client invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'analyst'
    ) AND role = 'client' AND invited_by = auth.uid() AND invited_by_role = 'analyst'
  );

-- UPDATE: Apenas quem criou pode atualizar (cancelar)
CREATE POLICY "Inviter can update their invitations"
  ON invitations FOR UPDATE
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- DELETE: Apenas admins podem deletar
CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 10. VIEW PARA CONVITES COM INFORMAÇÕES DO CONVITADOR
-- ============================================================================

CREATE OR REPLACE VIEW invitations_with_inviter AS
SELECT 
  i.*,
  up_inviter.name as inviter_name,
  up_inviter.email as inviter_email,
  up_accepted.name as accepted_by_name,
  up_accepted.email as accepted_by_email
FROM invitations i
LEFT JOIN user_profiles up_inviter ON i.invited_by = up_inviter.id
LEFT JOIN user_profiles up_accepted ON i.accepted_by = up_accepted.id;

COMMENT ON VIEW invitations_with_inviter IS 'View com informações completas dos convites incluindo dados do convitador';

