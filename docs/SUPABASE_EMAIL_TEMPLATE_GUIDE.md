# 📧 Guia: Atualizar Template de Email no Supabase

## 🎯 Objetivo
Trocar o link de confirmação por um código OTP de 6 dígitos.

---

## 📋 Passo a Passo

### 1️⃣ Acessar o Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Faça login na sua conta
3. Selecione o projeto **DuckForce**

### 2️⃣ Navegar até Email Templates

1. No menu lateral, clique em **Authentication** (ícone de cadeado)
2. Clique na aba **Email Templates**
3. Você verá uma lista de templates

### 3️⃣ Editar o Template "Confirm signup"

1. Clique em **Confirm signup** na lista
2. Você verá o template atual:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

### 4️⃣ Substituir pelo Novo Template

**APAGUE TODO O CONTEÚDO** e cole este novo template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 40px;">🦆</span>
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Verificação de Email</h1>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <p style="margin-top: 0; font-size: 16px;">Olá!</p>
    
    <p style="font-size: 16px;">Use o código abaixo para confirmar seu email no <strong>DuckForce</strong>:</p>
    
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #ede9fe 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <div style="font-size: 48px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace; color: #1f2937;">{{ .Token }}</div>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; text-align: center;">Este código expira em <strong>60 minutos</strong></p>
  </div>

  <div style="text-align: center; font-size: 12px; color: #9ca3af;">
    <p>Se você não solicitou este código, ignore este email.</p>
    <p style="margin-top: 20px;">© 2025 DuckForce. Todos os direitos reservados.</p>
  </div>

</body>
</html>
```

### 5️⃣ Salvar as Alterações

1. Clique no botão **Save** (Salvar) no canto superior direito
2. Aguarde a confirmação de que foi salvo

---

## ✅ Verificar se Funcionou

### Teste 1: Criar uma Conta
1. Acesse: http://localhost:5175/signup
2. Preencha email e senha
3. Clique em "Create account"
4. Você deve ver a tela de verificação com 6 campos

### Teste 2: Verificar o Email
1. Abra seu email
2. Procure por um email do Supabase
3. Você deve ver:
   - Logo do DuckForce (🦆)
   - Título "Verificação de Email"
   - Código de 6 dígitos em destaque
   - Mensagem de expiração

### Teste 3: Inserir o Código
1. Copie o código de 6 dígitos do email
2. Cole ou digite na tela de verificação
3. O código deve ser validado automaticamente
4. Você deve ser redirecionado para `/wizard`

---

## 🎨 Variações do Template

### Versão Simples (Sem Estilo)

Se preferir um template mais simples:

```html
<h2>Confirme seu email</h2>

<p>Olá!</p>

<p>Use o código abaixo para confirmar seu email no DuckForce:</p>

<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
  <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; font-family: monospace;">{{ .Token }}</h1>
</div>

<p>Este código expira em <strong>60 minutos</strong>.</p>

<p style="color: #6b7280; font-size: 14px;">Se você não solicitou este código, ignore este email.</p>
```

### Versão em Inglês

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 40px;">🦆</span>
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Email Verification</h1>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <p style="margin-top: 0; font-size: 16px;">Hello!</p>
    
    <p style="font-size: 16px;">Use the code below to verify your email on <strong>DuckForce</strong>:</p>
    
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #ede9fe 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <div style="font-size: 48px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace; color: #1f2937;">{{ .Token }}</div>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; text-align: center;">This code expires in <strong>60 minutes</strong></p>
  </div>

  <div style="text-align: center; font-size: 12px; color: #9ca3af;">
    <p>If you didn't request this code, please ignore this email.</p>
    <p style="margin-top: 20px;">© 2025 DuckForce. All rights reserved.</p>
  </div>

</body>
</html>
```

---

## 🔑 Variáveis Disponíveis

O Supabase fornece estas variáveis para usar no template:

- `{{ .Token }}` - Código OTP de 6 dígitos ✅ **USE ESTA**
- `{{ .ConfirmationURL }}` - Link de confirmação (não usar com OTP)
- `{{ .SiteURL }}` - URL do seu site
- `{{ .Email }}` - Email do usuário

---

## 🐛 Problemas Comuns

### Email não chega
- Verifique a pasta de spam
- Confirme que o SMTP está configurado no Supabase
- Vá em Settings → Auth → SMTP Settings

### Código não funciona
- Certifique-se de que salvou o template
- Verifique se usou `{{ .Token }}` (com ponto)
- Teste criando uma nova conta

### Template não aparece estilizado
- Alguns clientes de email bloqueiam CSS inline
- Use a versão simples se necessário
- Teste em diferentes clientes (Gmail, Outlook, etc.)

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do Supabase
2. Teste com diferentes emails
3. Consulte a documentação: https://supabase.com/docs/guides/auth/auth-email-otp

---

**Pronto! Agora seu sistema usa códigos OTP de 6 dígitos! 🎉**

