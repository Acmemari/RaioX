# 🏢 Documentação do Sistema Multi-Tenant - Hecttare

## Visão Geral

O Hecttare implementa um sistema multi-tenant com três níveis de acesso hierárquicos:

1. **Administrador (Admin)**: Acesso total ao sistema
2. **Analista (Analyst)**: Acesso aos dados dos seus clientes atribuídos
3. **Cliente (Client)**: Acesso apenas aos próprios dados

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### `user_profiles`
Armazena os perfis dos usuários com o campo `role` que pode ser:
- `admin`: Administrador do sistema
- `analyst`: Analista que gerencia clientes
- `client`: Cliente que utiliza o sistema

#### `analyst_clients`
Tabela de relacionamento muitos-para-muitos entre analistas e clientes:
- `analyst_id`: ID do analista
- `client_id`: ID do cliente
- Constraint de unicidade para evitar duplicatas

### Colunas Adicionais

As seguintes tabelas foram estendidas com `analyst_id` para rastrear qual analista criou/gerencia os dados:
- `chat_messages.analyst_id`: Analista que respondeu/criou a mensagem
- `cattle_scenarios.analyst_id`: Analista que criou o cenário

## 🔐 Políticas de Acesso (RLS)

### Administrador
- **SELECT**: Pode visualizar todos os registros de todas as tabelas
- **INSERT**: Pode criar qualquer registro
- **UPDATE**: Pode atualizar qualquer registro
- **DELETE**: Pode deletar qualquer registro

### Analista
- **SELECT**: Pode visualizar apenas dados dos seus clientes (via `analyst_clients`)
- **INSERT**: Pode criar dados em nome dos seus clientes (marcando `analyst_id`)
- **UPDATE**: Pode atualizar dados dos seus clientes
- **DELETE**: Pode deletar dados dos seus clientes

### Cliente
- **SELECT**: Pode visualizar apenas seus próprios dados
- **INSERT**: Pode criar apenas seus próprios dados
- **UPDATE**: Pode atualizar apenas seus próprios dados
- **DELETE**: Pode deletar apenas seus próprios dados

## 🔧 Funções Helper do Banco

### `is_admin(user_id UUID)`
Retorna `true` se o usuário é administrador.

### `is_analyst(user_id UUID)`
Retorna `true` se o usuário é analista.

### `analyst_has_client(analyst_id UUID, client_id UUID)`
Retorna `true` se o cliente pertence ao analista.

### `get_analyst_clients(analyst_id UUID)`
Retorna um SETOF UUID com os IDs dos clientes do analista.

## 💻 Funções Helper do Frontend

### `lib/auth/permissions.ts`

#### `isAdmin(user: User | null): boolean`
Verifica se o usuário é administrador.

#### `isAnalyst(user: User | null): boolean`
Verifica se o usuário é analista.

#### `isClient(user: User | null): boolean`
Verifica se o usuário é cliente.

### `lib/auth/analyst.ts`

#### `analystHasClient(analystId: string, clientId: string): Promise<boolean>`
Verifica se um cliente pertence a um analista.

#### `getAnalystClients(analystId: string): Promise<string[]>`
Obtém lista de IDs dos clientes de um analista.

#### `addClientToAnalyst(analystId: string, clientId: string): Promise<boolean>`
Associa um cliente a um analista.

#### `removeClientFromAnalyst(analystId: string, clientId: string): Promise<boolean>`
Remove associação de um cliente com um analista.

## 📝 Como Usar

### Criar um Analista

1. Criar usuário no Supabase Auth
2. Atualizar `user_profiles` com `role = 'analyst'`:

```sql
UPDATE user_profiles
SET role = 'analyst'
WHERE id = 'user_id_here';
```

### Associar Cliente a Analista

Via código:
```typescript
import { addClientToAnalyst } from './lib/auth/analyst';

await addClientToAnalyst(analystId, clientId);
```

Via SQL:
```sql
INSERT INTO analyst_clients (analyst_id, client_id)
VALUES ('analyst_id', 'client_id');
```

### Verificar Acesso

```typescript
import { isAdmin, isAnalyst, analystHasClient } from './lib/auth/permissions';

if (isAdmin(user)) {
  // Acesso total
}

if (isAnalyst(user)) {
  const hasAccess = await analystHasClient(user.id, clientId);
  if (hasAccess) {
    // Pode acessar dados do cliente
  }
}
```

## 🚀 Próximos Passos

Para implementar telas que respeitem essas permissões:

1. **Tela de Analistas**: Dashboard para analistas verem seus clientes
2. **Tela de Associação**: Interface para admins associarem clientes a analistas
3. **Filtros Automáticos**: As queries já são filtradas automaticamente pelo RLS
4. **UI Condicional**: Mostrar/ocultar funcionalidades baseado no role do usuário

## ⚠️ Notas Importantes

- As políticas RLS são aplicadas automaticamente em todas as queries
- Não é necessário filtrar manualmente no código - o Supabase faz isso
- Analistas só podem ver dados de clientes que foram explicitamente associados
- Clientes nunca podem ver dados de outros clientes
- Administradores têm bypass completo através das políticas

