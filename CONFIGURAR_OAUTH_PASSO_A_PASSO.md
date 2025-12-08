# 🚀 Configuração de OAuth - Passo a Passo para RaioX

Este guia irá te ajudar a configurar o OAuth com Google no projeto RaioX.

## 📋 URLs Importantes

- **URL do Projeto Supabase:** `https://udoyldenxzuzurxvqrbn.supabase.co`
- **Callback URL:** `https://udoyldenxzuzurxvqrbn.supabase.co/auth/v1/callback`
- **URL Local (dev):** `http://localhost:3003` (ou a porta que estiver usando)

---

## 🔧 Passo 1: Configurar no Google Cloud Console

### 1.1 Criar/Criar Projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Faça login com sua conta Google
3. Clique no seletor de projeto no topo
4. Clique em **"Novo Projeto"** ou selecione um existente
5. Dê um nome (ex: "RaioX OAuth")
6. Clique em **Criar**

### 1.2 Configurar Tela de Consentimento OAuth

1. No menu lateral, vá em **APIs & Services** → **OAuth consent screen**
2. Selecione **External** (ou Internal se for conta corporativa)
3. Preencha:
   - **App name:** RaioX
   - **User support email:** Seu email
   - **Developer contact:** Seu email
4. Clique em **Save and Continue**
5. Na seção **Scopes**, clique em **Add or Remove Scopes**
   - Selecione: `email`, `profile`, `openid`
   - Clique em **Update** e depois **Save and Continue**
6. Em **Test users** (se em modo Test), adicione emails de teste
7. Clique em **Save and Continue** até finalizar

### 1.3 Criar Credenciais OAuth

1. Vá em **APIs & Services** → **Credentials**
2. Clique em **Create Credentials** → **OAuth client ID**
3. Selecione **Web application**
4. Configure:
   - **Name:** RaioX Web Client
   - **Authorized JavaScript origins:**
     - `https://udoyldenxzuzurxvqrbn.supabase.co`
     - `http://localhost:3003` (para desenvolvimento)
   - **Authorized redirect URIs:**
     - `https://udoyldenxzuzurxvqrbn.supabase.co/auth/v1/callback`
5. Clique em **Create**
6. **COPIE** o **Client ID** e **Client Secret** (você vai precisar!)

---

## 🔧 Passo 2: Configurar no Supabase Dashboard

### 2.1 Acessar Configurações de Autenticação

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Faça login
3. Selecione o projeto **RaioX**
4. No menu lateral, vá em **Authentication** → **Providers**

### 2.2 Habilitar Google Provider

1. Encontre **Google** na lista de providers
2. Clique no toggle para **ativar**
3. Cole as credenciais:
   - **Client ID (for OAuth):** Cole o Client ID do Google
   - **Client Secret (for OAuth):** Cole o Client Secret do Google
4. Clique em **Save**

### 2.3 Configurar URLs de Redirecionamento

1. Ainda em **Authentication**, vá em **URL Configuration**
2. Configure:
   - **Site URL:** `http://localhost:3003` (para desenvolvimento)
   - **Redirect URLs:** Adicione:
     - `http://localhost:3003`
     - `http://localhost:3000`
     - `http://localhost:3001`
     - `http://localhost:3002`
     - (Adicione outras portas se necessário)
3. Clique em **Save**

---

## ✅ Passo 3: Testar

1. Certifique-se que o servidor está rodando: `npm run dev`
2. Acesse `http://localhost:3003`
3. Na página de login, clique em **"Continuar com Google"**
4. Você será redirecionado para o Google para autorizar
5. Após autorizar, você será redirecionado de volta para a aplicação
6. Você deve estar logado! 🎉

---

## 🔍 Troubleshooting

### Erro: "redirect_uri_mismatch"

- Verifique se o redirect URI no Google Cloud está EXATAMENTE: `https://udoyldenxzuzurxvqrbn.supabase.co/auth/v1/callback`
- Verifique se adicionou a URL local no Supabase URL Configuration

### Erro: "invalid_client"

- Verifique se o Client ID e Client Secret estão corretos no Supabase
- Certifique-se que copiou as credenciais completas (sem espaços extras)

### Erro: "OAuth provider not enabled"

- Verifique se o toggle do Google está **ativado** no Supabase
- Recarregue a página do dashboard

### Usuário não aparece após login

- Verifique os logs do Supabase: **Logs** → **API**
- Certifique-se que os triggers do banco estão configurados
- Verifique se a tabela `user_profiles` existe e tem permissões corretas

---

## 📝 Checklist Final

- [ ] Projeto criado no Google Cloud Console
- [ ] Tela de consentimento OAuth configurada
- [ ] Credenciais OAuth criadas no Google Cloud
- [ ] Redirect URI configurado no Google: `https://udoyldenxzuzurxvqrbn.supabase.co/auth/v1/callback`
- [ ] Google Provider ativado no Supabase
- [ ] Client ID e Client Secret adicionados no Supabase
- [ ] Site URL configurada no Supabase
- [ ] Redirect URLs adicionadas no Supabase
- [ ] Testado login com Google

---

## 🎯 Próximos Passos (Opcional)

Depois que o Google estiver funcionando, você pode adicionar outros providers:
- **GitHub:** Segue processo similar
- **Microsoft/Azure:** Para contas corporativas
- **Apple:** Para iOS/Mac

Veja `OAUTH_SETUP.md` para mais detalhes.

