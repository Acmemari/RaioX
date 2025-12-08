# Migrations do Banco de Dados - RaioX

Este diretório contém as migrations SQL para o banco de dados do projeto RaioX.

## 📋 Estrutura do Schema

### Tabelas Principais

1. **user_profiles** - Perfis estendidos dos usuários
   - Relacionada com `auth.users` (Supabase Auth)
   - Contém informações como nome, email, role, plan, status, etc.

2. **organizations** - Organizações/fazendas
   - Cada usuário pode ter uma organização
   - Possui um owner (proprietário)

3. **chat_messages** - Mensagens do chat
   - Histórico de conversas com os agentes de IA
   - Suporte para anexos

4. **cattle_scenarios** - Cenários salvos da calculadora de gado
   - Permite salvar e recuperar cálculos de lucro
   - Armazena inputs e results em JSONB

## 🚀 Como Aplicar as Migrations

### Opção 1: Via Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **RaioX**
3. Vá em **SQL Editor**
4. Copie e cole o conteúdo do arquivo `000_initial_schema.sql`
5. Clique em **Run**

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref udoyldenxzuzurxvqrbn

# Aplicar migrations
supabase db push
```

### Opção 3: Via MCP (se disponível)

As migrations podem ser aplicadas via MCP usando a função `apply_migration`.

## 📝 Ordem de Execução

Execute as migrations na seguinte ordem:

1. `000_initial_schema.sql` - Schema inicial completo
2. `001_chat_messages.sql` - (Já incluído no schema inicial)
3. `002_cattle_scenarios.sql` - (Já incluído no schema inicial)
4. `003_add_phone_to_user_profiles.sql` - Adiciona campo phone (já incluído no schema inicial)

**Nota:** O arquivo `000_initial_schema.sql` já inclui tudo, então você só precisa executar esse arquivo. Os outros são mantidos para referência histórica.

## 🔒 Segurança (RLS)

Todas as tabelas têm Row Level Security (RLS) habilitado com as seguintes políticas:

- **SELECT:** Usuários veem apenas seus próprios dados (admins veem tudo)
- **INSERT:** Usuários autenticados podem inserir seus próprios dados
- **UPDATE:** Usuários podem atualizar apenas seus próprios dados
- **DELETE:** Usuários podem deletar apenas seus próprios dados

### Políticas Especiais

- Admins têm acesso completo a todas as tabelas
- Usuários podem ver perfis de outros usuários na mesma organização
- Organizações podem ser visualizadas por todos os membros

## 🔧 Funções e Triggers

### Funções

- `update_updated_at_column()` - Atualiza automaticamente o campo `updated_at`
- `create_user_profile_if_missing(user_id UUID)` - Cria perfil e organização padrão

### Triggers

- Atualização automática de `updated_at` em todas as tabelas
- (Opcional) Criação automática de perfil quando usuário é criado no auth.users

## 📊 Índices

Todas as tabelas possuem índices otimizados para:

- Buscas por user_id
- Ordenação por created_at
- Filtros por role, plan, status
- Queries de organização

## ✅ Checklist de Aplicação

Após executar a migration, verifique:

- [ ] Todas as tabelas foram criadas
- [ ] RLS está habilitado em todas as tabelas
- [ ] Índices foram criados
- [ ] Triggers estão funcionando (teste atualizando um registro)
- [ ] A função `create_user_profile_if_missing` está acessível
- [ ] Políticas RLS permitem acesso adequado

## 🐛 Troubleshooting

### Erro: "permission denied for schema public"

Execute como superuser ou verifique as permissões do usuário do Supabase.

### Erro: "type already exists"

Os ENUMs podem já existir. O código usa `CREATE TYPE ... IF NOT EXISTS`, então deve ser seguro executar novamente.

### RLS bloqueando queries

Verifique se:
1. O usuário está autenticado
2. As políticas estão corretas
3. O `auth.uid()` está retornando o ID correto

### Função não encontrada

Certifique-se de que a função `create_user_profile_if_missing` foi criada. Você pode testá-la executando:

```sql
SELECT create_user_profile_if_missing('SEU_USER_ID_AQUI');
```

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth)

