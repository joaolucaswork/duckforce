# Configuração do Salesforce Connected App para DuckForce

## 🎯 Objetivo

Configurar um Connected App no Salesforce que permita aos usuários fazer login em **QUALQUER org Salesforce** sem precisar instalar o Connected App em cada org.

## 📋 Pré-requisitos

- Uma org Salesforce (Production, Developer Edition, ou Sandbox)
- Permissões de administrador na org

---

## 🔧 Passo a Passo

### 1. Criar o Connected App

1. **Faça login** na sua org Salesforce (onde você vai hospedar o Connected App)
2. Clique no ícone de **engrenagem** (⚙️) → **Setup**
3. Na busca rápida (Quick Find), digite: **App Manager**
4. Clique em **New Connected App**

### 2. Informações Básicas

Preencha os campos básicos:

- **Connected App Name**: `DuckForce Migration Tool`
- **API Name**: `DuckForce_Migration_Tool` (gerado automaticamente)
- **Contact Email**: seu email

### 3. Configurar OAuth Settings

Marque a opção: **✅ Enable OAuth Settings**

#### Callback URL
```
http://localhost:5173/api/auth/salesforce/callback
```

**Importante**: Para produção, adicione também sua URL de produção:
```
https://seu-dominio.com/api/auth/salesforce/callback
```

Você pode adicionar múltiplas URLs separadas por linha.

#### Selected OAuth Scopes

Adicione os seguintes scopes (arraste da esquerda para a direita):

- ✅ **Access and manage your data (api)**
- ✅ **Perform requests on your behalf at any time (refresh_token, offline_access)**

#### PKCE Configuration (CRÍTICO!)

Marque as seguintes opções:

- ✅ **Enable Proof Key for Code Exchange (PKCE) Extension**
- ✅ **Require Proof Key for Code Exchange (PKCE) Extension for Supported Authorization Flows**

**IMPORTANTE**: Estas opções são essenciais para permitir login sem Client Secret!

#### Client Credentials Flow

**NÃO marque** esta opção. Deixe desmarcada.

### 4. Configurações Adicionais Importantes

#### Permitted Users
Selecione: **All users may self-authorize**

Isso permite que qualquer usuário de qualquer org Salesforce possa fazer login.

#### IP Relaxation
Selecione: **Relax IP restrictions**

Isso permite login de qualquer IP (útil para desenvolvimento e para usuários em diferentes locais).

#### Refresh Token Policy
Selecione: **Refresh token is valid until revoked**

Isso mantém os usuários conectados até que façam logout explicitamente.

### 5. Salvar e Obter Credenciais

1. Clique em **Save**
2. Aguarde 2-10 minutos para as mudanças propagarem
3. Clique em **Manage Consumer Details**
4. Você pode precisar verificar sua identidade (código por email/SMS)
5. **Copie o Consumer Key** (você vai precisar dele)

**IMPORTANTE**: Você **NÃO precisa** do Consumer Secret quando usa PKCE!

---

## 🔑 Configurar o Arquivo .env

No seu projeto DuckForce, edite o arquivo `.env`:

```bash
# Consumer Key do Connected App
SALESFORCE_CLIENT_ID=seu_consumer_key_aqui

# Client Secret NÃO é necessário quando usando PKCE
# SALESFORCE_CLIENT_SECRET=

# Callback URL (deve corresponder ao configurado no Connected App)
SALESFORCE_CALLBACK_URL=http://localhost:5173/api/auth/salesforce/callback

# Login URL padrão
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

---

## ✅ Checklist Final

Antes de testar, verifique se:

- ✅ Connected App criado
- ✅ OAuth Settings habilitado
- ✅ Callback URL configurada corretamente
- ✅ Scopes `api` e `refresh_token` adicionados
- ✅ **PKCE habilitado e obrigatório**
- ✅ Permitted Users = "All users may self-authorize"
- ✅ IP Relaxation = "Relax IP restrictions"
- ✅ Consumer Key copiado para o `.env`
- ✅ Aguardou 2-10 minutos após salvar

---

## 🧪 Testar a Configuração

1. **Reinicie o servidor de desenvolvimento**:
   ```bash
   pnpm dev
   ```

2. **Acesse**: `http://localhost:5173/wizard`

3. **Clique em "Limpar Cookies OAuth"** (botão amarelo no topo)

4. **Tente conectar uma org**:
   - Pode ser a mesma org onde criou o Connected App
   - Pode ser uma org completamente diferente
   - Pode ser Production, Sandbox, Developer Edition, etc.

5. **Você será redirecionado** para a tela de login do Salesforce

6. **Após fazer login**, você verá uma tela pedindo permissão:
   - "DuckForce Migration Tool is requesting access to your Salesforce data"
   - Clique em **Allow**

7. **Você será redirecionado** de volta para o DuckForce com a org conectada!

---

## 🎉 Como Funciona

### Fluxo OAuth com PKCE (sem Client Secret)

1. **Usuário clica em "Connect"** no DuckForce
2. **DuckForce gera**:
   - Code Verifier (string aleatória)
   - Code Challenge (hash SHA256 do verifier)
3. **Usuário é redirecionado** para Salesforce com o Code Challenge
4. **Usuário faz login** em qualquer org Salesforce
5. **Salesforce retorna** um código de autorização
6. **DuckForce troca** o código + Code Verifier por tokens de acesso
7. **Salesforce valida** que o Code Verifier corresponde ao Code Challenge
8. **Conexão estabelecida!**

### Por que isso funciona em qualquer org?

- **PKCE elimina a necessidade do Client Secret**
- O Connected App só precisa existir na org onde foi criado
- Qualquer usuário de qualquer org pode autorizar o app
- A segurança é garantida pelo PKCE (Code Verifier + Challenge)

---

## 🔒 Segurança

### PKCE (Proof Key for Code Exchange)

- Protege contra ataques de interceptação de código
- Não requer Client Secret (que poderia vazar em apps públicos)
- Cada fluxo OAuth usa um Code Verifier único
- Impossível reutilizar códigos de autorização

### Refresh Tokens

- Armazenados em cookies httpOnly (não acessíveis via JavaScript)
- Válidos até serem revocados
- Permitem renovar o acesso sem novo login

---

## ❓ Troubleshooting

### Erro: "invalid_client" ou "invalid client credentials" ⚠️ MAIS COMUM

**Causa**: O Connected App tem "Require Secret for Web Server Flow" habilitado, mas você não forneceu o Client Secret no `.env`

**Solução**: Você tem duas opções:

**Opção 1 (Recomendada)**: Desabilitar a exigência do Client Secret
1. Vá em Setup → App Manager
2. Encontre seu Connected App → Edit
3. **DESMARQUE** "Require Secret for Web Server Flow"
4. **DESMARQUE** "Require Secret for Refresh Token Flow"
5. **MARQUE** "Enable for Device Flow" (isso habilita PKCE)
6. Salve e aguarde 2-10 minutos
7. Reinicie o servidor: `pnpm dev`

**Opção 2**: Adicionar o Client Secret no `.env`
1. Vá em Setup → App Manager
2. Encontre seu Connected App → View
3. Clique em "Manage Consumer Details"
4. Copie o "Consumer Secret"
5. No arquivo `.env`, descomente e adicione:
   ```bash
   SALESFORCE_CLIENT_SECRET=seu_consumer_secret_aqui
   ```
6. Reinicie o servidor: `pnpm dev`

**Nota**: A Opção 1 é melhor para permitir login em qualquer org Salesforce. A Opção 2 requer que o Connected App esteja instalado em cada org.

### Erro: "missing required code challenge"

**Causa**: PKCE não está habilitado no Connected App

**Solução**: Volte ao Connected App e marque as opções de PKCE (veja passo 3 acima)

### Erro: "invalid code verifier"

**Causa**: Cookies OAuth temporários ficaram desatualizados (ex: após reiniciar o servidor)

**Solução**: Clique no botão "Limpar Cookies OAuth" no topo da página

### Erro: "Cross-org OAuth flows are not supported"

**Causa**: Você já está autenticado em uma org Salesforce e está tentando conectar a outra org diferente. Salesforce bloqueia fluxos OAuth entre orgs por segurança.

**Soluções**:

**Opção 1 - Usar Janelas Privadas/Anônimas (Recomendado para Testes)**:
1. Conecte a **primeira org** em uma janela normal do navegador
2. Conecte a **segunda org** em uma janela anônima/privada (Ctrl+Shift+N no Chrome, Cmd+Shift+N no Safari)
3. Isso mantém as sessões separadas

**Opção 2 - Limpar Sessão do Salesforce Entre Conexões**:
1. Conecte a primeira org
2. Antes de conectar a segunda org, faça logout do Salesforce visitando: `https://login.salesforce.com/secur/logout.jsp`
3. Depois conecte a segunda org

**Opção 3 - Usar Perfis de Navegador Diferentes**:
1. Crie dois perfis no seu navegador (Chrome, Firefox, etc.)
2. Use um perfil para cada org

### Erro: "redirect_uri_mismatch"

**Causa**: A Callback URL no `.env` não corresponde à configurada no Connected App

**Solução**: Verifique se as URLs são exatamente iguais (incluindo http/https, porta, etc.)

### Erro: "invalid_client_id"

**Causa**: Consumer Key incorreto no `.env`

**Solução**: Copie novamente o Consumer Key do Connected App

---

## 📚 Referências

- [Salesforce OAuth 2.0 Documentation](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Salesforce Connected Apps](https://help.salesforce.com/s/articleView?id=sf.connected_app_overview.htm)

---

## 🦆 Pronto!

Agora você pode conectar **qualquer org Salesforce** sem precisar instalar o Connected App em cada uma delas!

