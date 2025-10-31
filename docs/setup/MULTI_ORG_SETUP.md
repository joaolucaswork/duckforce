# Configuração Multi-Org - DuckForce

## O Problema

Quando você tenta usar o **mesmo Connected App** (mesmo Client ID) para autenticar em **duas orgs Salesforce diferentes**, você recebe o erro:

```
OAUTH_AUTHORIZATION_BLOCKED Cross-org OAuth flows are not supported for this external client app
```

Isso acontece porque:
- Um Connected App criado em uma org **não existe** em outras orgs
- O Salesforce bloqueia tentativas de usar um Connected App de uma org para autenticar em outra org
- **Não existe "Connected App global"** que funcione automaticamente em qualquer org

## A Solução

Você precisa **criar um Connected App em CADA org** que deseja conectar e configurar Client IDs diferentes para cada uma.

---

## Passo 1: Criar Connected Apps em Cada Org

### 1.1 Criar Connected App na Org SOURCE

1. Faça login na sua **org SOURCE** (a org de onde você vai migrar dados)
2. Vá para **Setup** → **App Manager**
3. Clique em **New Connected App**
4. Preencha os campos:
   - **Connected App Name**: `DuckForce Source`
   - **API Name**: `DuckForce_Source`
   - **Contact Email**: seu email
5. Em **API (Enable OAuth Settings)**:
   - ✅ Marque **Enable OAuth Settings**
   - **Callback URL**: `http://localhost:5173/api/auth/salesforce/callback`
   - **Selected OAuth Scopes**:
     - `Full access (full)`
     - `Perform requests at any time (refresh_token, offline_access)`
   - ✅ Marque **Require Proof Key for Code Exchange (PKCE) Extension for Supported Authorization Flows**
   - ❌ **NÃO** marque "Require Secret for Web Server Flow" (deixe desmarcado)
6. Clique em **Save**
7. Clique em **Continue**
8. **IMPORTANTE**: Copie o **Consumer Key** - você vai precisar dele!

### 1.2 Criar Connected App na Org TARGET

1. Faça login na sua **org TARGET** (a org para onde você vai migrar dados)
2. Repita **exatamente os mesmos passos** acima
3. Use o nome `DuckForce Target` para diferenciar
4. **IMPORTANTE**: Copie o **Consumer Key** desta org também!

### 1.3 Configurar "Permitted Users" (Importante!)

Em **AMBAS** as orgs:

1. Vá para **Setup** → **App Manager**
2. Encontre o Connected App que você criou
3. Clique no menu ▼ → **Manage**
4. Clique em **Edit Policies**
5. Em **OAuth Policies** → **Permitted Users**:
   - Mude de `Admin approved users are pre-authorized` para **`All users may self-authorize`**
6. Clique em **Save**

---

## Passo 2: Configurar as Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

```bash
# Client ID padrão (opcional - pode deixar vazio se usar os específicos abaixo)
SALESFORCE_CLIENT_ID=

# Client ID específico para a org SOURCE
# Cole aqui o Consumer Key do Connected App criado na org SOURCE
SALESFORCE_SOURCE_CLIENT_ID=3MVG9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Client ID específico para a org TARGET
# Cole aqui o Consumer Key do Connected App criado na org TARGET
SALESFORCE_TARGET_CLIENT_ID=3MVG9yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Callback URL (mesmo para ambas as orgs)
SALESFORCE_CALLBACK_URL=http://localhost:5173/api/auth/salesforce/callback

# Login URL (padrão)
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

### Exemplo Completo

```bash
# Deixe vazio se usar os específicos
SALESFORCE_CLIENT_ID=

# Consumer Key da org SOURCE
SALESFORCE_SOURCE_CLIENT_ID=3MVG9dqyJqDc8eKQ1nPTvc0n5RF4cQFsp5NeQIQ8P9EuFVyNv9Hhq3nsuxwsiY9R06gt5jF0luewMR62gC1Ud

# Consumer Key da org TARGET
SALESFORCE_TARGET_CLIENT_ID=3MVG9aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5cD6eF7gH8iJ9kL0mN1oP2qR3sT4uV5wX6yZ7aB8

SALESFORCE_CALLBACK_URL=http://localhost:5173/api/auth/salesforce/callback
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

---

## Passo 3: Como Funciona

Quando você clica em "Connect Source Org" ou "Connect Target Org":

1. O sistema detecta qual org você está conectando (`source` ou `target`)
2. Busca o Client ID específico para aquela org:
   - Se `SALESFORCE_SOURCE_CLIENT_ID` estiver configurado, usa ele para source
   - Se `SALESFORCE_TARGET_CLIENT_ID` estiver configurado, usa ele para target
   - Se não houver específico, usa o `SALESFORCE_CLIENT_ID` padrão
3. Inicia o fluxo OAuth com o Client ID correto
4. Cada org autentica usando seu próprio Connected App

---

## Passo 4: Testar

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:5173`

3. Clique em **"Connect Source Org"**
   - Você será redirecionado para o login da org SOURCE
   - Faça login e autorize o app
   - Você será redirecionado de volta com sucesso ✅

4. Clique em **"Connect Target Org"**
   - Você será redirecionado para o login da org TARGET
   - Faça login e autorize o app
   - Você será redirecionado de volta com sucesso ✅

---

## Troubleshooting

### Erro: "Cross-org OAuth flows are not supported"

**Causa**: Você não criou Connected Apps em ambas as orgs, ou está usando o mesmo Client ID para ambas.

**Solução**: 
1. Verifique se você criou Connected Apps em **AMBAS** as orgs
2. Verifique se configurou `SALESFORCE_SOURCE_CLIENT_ID` e `SALESFORCE_TARGET_CLIENT_ID` com valores **diferentes**
3. Verifique se os Client IDs estão corretos (copie novamente do Salesforce)

### Erro: "Invalid client_id"

**Causa**: O Client ID está incorreto ou foi copiado errado.

**Solução**:
1. Vá para Setup → App Manager → [Seu Connected App] → View
2. Copie o **Consumer Key** novamente
3. Cole no `.env` com cuidado (sem espaços extras)

### Erro: "redirect_uri_mismatch"

**Causa**: A Callback URL no `.env` não corresponde à configurada no Connected App.

**Solução**:
1. Verifique se `SALESFORCE_CALLBACK_URL` no `.env` é exatamente: `http://localhost:5173/api/auth/salesforce/callback`
2. Verifique se a Callback URL no Connected App é a mesma
3. Edite o Connected App se necessário e salve

---

## Produção

Para produção, você precisará:

1. Atualizar a **Callback URL** em ambos os Connected Apps para sua URL de produção:
   ```
   https://seudominio.com/api/auth/salesforce/callback
   ```

2. Atualizar o `.env` de produção:
   ```bash
   SALESFORCE_CALLBACK_URL=https://seudominio.com/api/auth/salesforce/callback
   ```

3. Instruir seus clientes a criar Connected Apps em suas próprias orgs e fornecer os Client IDs

---

## Resumo

✅ **Não existe Connected App global** - você precisa criar um em cada org

✅ **Use Client IDs diferentes** - configure `SALESFORCE_SOURCE_CLIENT_ID` e `SALESFORCE_TARGET_CLIENT_ID`

✅ **Configure "All users may self-authorize"** - permite que usuários se autorizem sem aprovação do admin

✅ **Use PKCE** - mais seguro e não requer Client Secret

✅ **Teste em ambas as orgs** - verifique se ambas as conexões funcionam

---

## Perguntas Frequentes

**P: Por que não posso usar o mesmo Connected App para ambas as orgs?**

R: Porque cada org Salesforce é completamente isolada. Um Connected App criado em uma org não existe em outras orgs. É uma limitação de segurança do Salesforce.

**P: Existe alguma forma de criar um Connected App que funcione em qualquer org?**

R: Não para aplicações customizadas. Apenas parceiros Salesforce oficiais ou apps do AppExchange podem ter Connected Apps pré-instalados em múltiplas orgs.

**P: E se eu tiver 10 orgs diferentes?**

R: Você precisará criar um Connected App em cada uma das 10 orgs e configurar Client IDs específicos, ou instruir seus usuários a criar seus próprios Connected Apps.

**P: Posso usar o mesmo Client ID para source e target se forem a mesma org?**

R: Sim! Se você está migrando dados dentro da mesma org (ex: de um objeto para outro), pode usar o mesmo Client ID. Mas para orgs diferentes, precisa de Client IDs diferentes.

