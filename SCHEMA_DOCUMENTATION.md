# 📊 Documentação do Schema do Banco de Dados - RaioX

## Contexto do Projeto

O **RaioX** é um sistema de gestão de precisão para fazendas pecuárias, oferecendo:
- Calculadoras inteligentes para análise de lucro
- Chat com agentes de IA especializados
- Gestão de organizações/fazendas
- Sistema de assinaturas (Básico, Pro, Enterprise)
- Histórico de cenários e conversas

## 📋 Entidades/Tabelas

### 1. **user_profiles**
Perfis estendidos dos usuários autenticados, contendo informações adicionais além do `auth.users` do Supabase.

**Campos:**
- `id` (UUID, PK, FK → auth.users)
- `name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL, UNIQUE)
- `role` (ENUM: 'admin' | 'client')
- `plan` (ENUM: 'basic' | 'pro' | 'enterprise')
- `status` (ENUM: 'active' | 'inactive')
- `avatar` (TEXT, opcional)
- `organization_id` (UUID, FK → organizations)
- `phone` (TEXT, opcional)
- `last_login` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

### 2. **organizations**
Organizações/fazendas dos usuários. Cada usuário pode pertencer a uma organização.

**Campos:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `plan` (ENUM: 'basic' | 'pro' | 'enterprise')
- `owner_id` (UUID, FK → auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

### 3. **chat_messages**
Mensagens do chat persistidas para histórico e contexto.

**Campos:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `role` (TEXT: 'user' | 'model')
- `text` (TEXT, NOT NULL)
- `attachment_name` (TEXT, opcional)
- `attachment_mime_type` (TEXT, opcional)
- `created_at`, `updated_at` (TIMESTAMP)

### 4. **cattle_scenarios**
Cenários salvos da calculadora de lucro de gado.

**Campos:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `name` (TEXT, NOT NULL)
- `inputs` (JSONB, NOT NULL) - CattleCalculatorInputs
- `results` (JSONB, opcional) - CalculationResults
- `created_at`, `updated_at` (TIMESTAMP)

## 🔗 Relacionamentos

```
auth.users (Supabase Auth)
    ↓ (1:1)
user_profiles
    ↓ (N:1)
organizations
    ↑ (1:1)
owner_id → auth.users

user_profiles (1:N) → chat_messages
user_profiles (1:N) → cattle_scenarios
```

## 🔒 Segurança (RLS Policies)

### user_profiles
- ✅ Usuários veem seu próprio perfil
- ✅ Usuários veem perfis da mesma organização
- ✅ Admins veem todos os perfis
- ✅ Usuários atualizam apenas seu próprio perfil
- ✅ Admins podem atualizar qualquer perfil

### organizations
- ✅ Usuários veem organizações das quais fazem parte
- ✅ Owners podem atualizar suas organizações
- ✅ Admins podem gerenciar todas as organizações

### chat_messages
- ✅ Usuários veem apenas suas próprias mensagens
- ✅ Admins veem todas as mensagens
- ✅ Usuários podem inserir/atualizar/deletar apenas suas mensagens

### cattle_scenarios
- ✅ Usuários veem apenas seus próprios cenários
- ✅ Admins veem todos os cenários
- ✅ Usuários gerenciam apenas seus próprios cenários

## 🎯 Índices Criados

### user_profiles
- `idx_user_profiles_email` - Busca por email
- `idx_user_profiles_organization_id` - Filtros por organização
- `idx_user_profiles_role` - Filtros por role
- `idx_user_profiles_plan` - Filtros por plan
- `idx_user_profiles_status` - Filtros por status
- `idx_user_profiles_created_at` - Ordenação por data

### organizations
- `idx_organizations_owner_id` - Busca por owner
- `idx_organizations_plan` - Filtros por plan
- `idx_organizations_created_at` - Ordenação por data

### chat_messages
- `idx_chat_messages_user_id` - Busca por usuário
- `idx_chat_messages_created_at` - Ordenação por data
- `idx_chat_messages_user_created` - Query composta (user + data)

### cattle_scenarios
- `idx_cattle_scenarios_user_id` - Busca por usuário
- `idx_cattle_scenarios_created_at` - Ordenação por data
- `idx_cattle_scenarios_user_created` - Query composta (user + data)

## ⚙️ Funções e Triggers

### Funções

1. **update_updated_at_column()**
   - Atualiza automaticamente o campo `updated_at`
   - Usada por todos os triggers de atualização

2. **create_user_profile_if_missing(user_id UUID)**
   - Cria perfil de usuário se não existir
   - Cria organização padrão automaticamente
   - Associa usuário à organização criada
   - Retorna `TRUE` se criado, `FALSE` se já existia

### Triggers

- **update_user_profiles_updated_at** - Atualiza `updated_at` em user_profiles
- **update_organizations_updated_at** - Atualiza `updated_at` em organizations
- **update_chat_messages_updated_at** - Atualiza `updated_at` em chat_messages
- **update_cattle_scenarios_updated_at** - Atualiza `updated_at` em cattle_scenarios

## 🚀 Como Usar

### Criar Perfil de Usuário

```sql
-- Manualmente após criação do usuário no auth.users
SELECT create_user_profile_if_missing('user-uuid-aqui');
```

### Consultar Perfil

```javascript
// No código da aplicação
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### Inserir Mensagem de Chat

```javascript
const { data, error } = await supabase
  .from('chat_messages')
  .insert({
    user_id: userId,
    role: 'user',
    text: 'Mensagem do usuário'
  });
```

### Salvar Cenário

```javascript
const { data, error } = await supabase
  .from('cattle_scenarios')
  .insert({
    user_id: userId,
    name: 'Cenário de Teste',
    inputs: { pesoCompra: 300, valorCompra: 10.5, ... },
    results: { resultadoPorBoi: 500, ... }
  });
```

## 📝 Notas Importantes

1. **UUID como Primary Key:** Todas as tabelas usam UUID v4 como chave primária
2. **Timestamps:** Todos os timestamps são `TIMESTAMP WITH TIME ZONE`
3. **Cascades:** Deleções em `auth.users` fazem CASCADE para `user_profiles`
4. **Constraints:** Validações de email, nomes não vazios, etc.
5. **SECURITY DEFINER:** A função `create_user_profile_if_missing` usa `SECURITY DEFINER` para bypass de RLS durante criação inicial

## 🔄 Próximas Migrations

Possíveis melhorias futuras:
- Tabela de `subscriptions` (histórico de assinaturas)
- Tabela de `notifications`
- Tabela de `audit_logs`
- Suporte a múltiplas organizações por usuário
- Tabela de `payments`

