# Configuração de OTP (One-Time Password) para Email

Este documento explica como configurar o Supabase para usar códigos OTP de 6 dígitos ao invés de links de confirmação por email.

## 🎯 O que foi implementado

- ✅ Componente de input de código OTP com 6 dígitos
- ✅ Tela de verificação após signup
- ✅ Funcionalidade de reenvio de código com cooldown de 60 segundos
- ✅ Validação automática ao completar os 6 dígitos
- ✅ Suporte para colar código do clipboard

## 📋 Configuração do Supabase

### Opção 1: Via Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Authentication** → **Email Templates**
4. Selecione o template **Confirm signup**
5. Certifique-se de que o template está configurado para enviar OTP

### Opção 2: Configuração Automática

O código já está configurado para solicitar OTP automaticamente:

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: undefined, // Desabilita link de confirmação
    data: {
      email_confirm_otp: true // Solicita OTP
    }
  }
});
```

## 🔧 Como funciona

### 1. Signup
Quando o usuário se cadastra:
- Email e senha são enviados para o Supabase
- Supabase envia um email com código de 6 dígitos
- Interface mostra tela de verificação

### 2. Verificação
Na tela de verificação:
- Usuário digita o código de 6 dígitos
- Código é validado automaticamente ao completar
- Se válido, usuário é redirecionado para `/wizard`
- Se inválido, mostra erro e limpa os campos

### 3. Reenvio
Se o usuário não receber o código:
- Pode clicar em "Reenviar código"
- Cooldown de 60 segundos entre reenvios
- Novo código é enviado para o mesmo email

## 📧 Template de Email

### Template Atual (Link de Confirmação)
```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

### ✅ Novo Template (Código OTP)

Substitua o template acima por este:

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

### 🎨 Template Estilizado (Opcional)

Para um visual ainda melhor, use este template com gradiente:

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

## 🎨 Componente OTPInput

O componente `OTPInput.svelte` oferece:

- **6 campos individuais** para cada dígito
- **Auto-focus** no próximo campo ao digitar
- **Navegação com teclado** (setas, backspace)
- **Suporte para colar** código completo
- **Validação automática** ao completar
- **Método clear()** para limpar os campos

### Uso do componente

```svelte
<OTPInput
  bind:this={otpInputRef}
  length={6}
  onComplete={handleVerifyOTP}
  disabled={loading}
/>
```

## 🔐 Segurança

- Códigos OTP expiram em 60 minutos
- Cooldown de 60 segundos entre reenvios
- Validação server-side via Supabase
- Códigos são de uso único

## 🐛 Troubleshooting

### Email não está chegando
1. Verifique a pasta de spam
2. Confirme que o email está correto
3. Verifique as configurações de SMTP no Supabase
4. Use "Reenviar código" após 60 segundos

### Código inválido
1. Certifique-se de digitar todos os 6 dígitos
2. Verifique se o código não expirou (60 minutos)
3. Solicite um novo código

### Erro ao verificar
1. Verifique a conexão com internet
2. Confirme que o Supabase está configurado corretamente
3. Verifique os logs do console para mais detalhes

## 📝 Próximos passos

Para melhorar ainda mais a experiência:

1. **Customizar template de email** no Supabase Dashboard
2. **Adicionar animações** na transição entre telas
3. **Implementar rate limiting** adicional
4. **Adicionar analytics** para monitorar taxa de conversão
5. **Testar em diferentes clientes de email**

## 🔗 Referências

- [Supabase Auth OTP Documentation](https://supabase.com/docs/guides/auth/auth-email-otp)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

