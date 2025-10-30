# Duckforce

A modern SvelteKit application with shadcn-svelte components.

## Tech Stack

- **Svelte 5** - Latest version with runes
- **SvelteKit 2** - Full-stack framework
- **Tailwind CSS v4** - Latest version
- **shadcn-svelte** - Beautiful UI components
- **TypeScript** - Type safety
- **Vite 6** - Fast build tool
- **pnpm** - Fast, disk space efficient package manager

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (installed globally)

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start dev server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Salesforce Integration Setup

This application integrates with Salesforce to retrieve and deploy Lightning Web Components (LWC). Follow these steps to configure the Salesforce integration.

### ⚠️ IMPORTANTE: Conectando Múltiplas Orgs

**Se você precisa conectar a DUAS orgs diferentes** (source e target), você DEVE criar um Connected App em CADA org e usar Client IDs diferentes.

📖 **Leia o guia completo**: [MULTI_ORG_SETUP.md](./MULTI_ORG_SETUP.md)

**Por quê?** Não existe "Connected App global" no Salesforce. Um Connected App criado em uma org não funciona em outras orgs. Você receberá o erro `"Cross-org OAuth flows are not supported"` se tentar usar o mesmo Client ID para orgs diferentes.

### Prerequisites

To use this application with Salesforce, you need:

- A Salesforce org (production, sandbox, or Developer Edition)
- System Administrator permissions or API Enabled User permissions
- Ability to create Connected Apps in your Salesforce org
- **Para múltiplas orgs**: Um Connected App em CADA org que você quer conectar

If you don't have a Salesforce org, you can sign up for a free Developer Edition at [developer.salesforce.com/signup](https://developer.salesforce.com/signup).

### Connected App Setup

You must create a Salesforce Connected App to enable OAuth 2.0 authentication:

1. **Navigate to App Manager**
   - Log in to your Salesforce org
   - Go to **Setup** (gear icon in top right)
   - In the Quick Find box, search for "App Manager"
   - Click **App Manager**

2. **Create New Connected App**
   - Click **New Connected App** button
   - Fill in the basic information:
     - **Connected App Name**: `Duckforce` (or your preferred name)
     - **API Name**: Will auto-populate based on the name
     - **Contact Email**: Your email address

3. **Enable OAuth Settings**
   - Check the box **Enable OAuth Settings**
   - **Callback URL**: Enter your callback URL
     - For local development: `http://localhost:5173/api/auth/salesforce/callback`
     - For production: `https://yourdomain.com/api/auth/salesforce/callback`
   - **Selected OAuth Scopes**: Add the following scopes (use the arrow to move them to "Selected OAuth Scopes"):
     - **Access and manage your data (api)** - Required for API access to read and write data
     - **Perform requests on your behalf at any time (refresh_token, offline_access)** - Required to refresh access tokens
     - **Access the identity URL service (id, profile, email, address, phone)** - Required for user identity information
     - **Full access (full)** - Required for metadata API access to retrieve and deploy components

4. **Save and Retrieve Credentials**
   - Click **Save**
   - Click **Continue** on the warning about the callback URL
   - **Important**: Wait 2-10 minutes for the Connected App to propagate through Salesforce's systems
   - After waiting, click **Manage Consumer Details** to view your credentials
   - You may need to verify your identity (email verification code)
   - Copy the **Consumer Key** (this is your `SALESFORCE_CLIENT_ID`)
   - Copy the **Consumer Secret** (this is your `SALESFORCE_CLIENT_SECRET`)

### Environment Configuration

1. **Copy the environment template**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your Salesforce credentials**

   Open the `.env` file and fill in the four required variables:

   - **SALESFORCE_CLIENT_ID**: Paste the Consumer Key from your Connected App
   - **SALESFORCE_CLIENT_SECRET**: Paste the Consumer Secret from your Connected App
   - **SALESFORCE_CALLBACK_URL**: Use the same callback URL you configured in the Connected App
     - Development: `http://localhost:5173/api/auth/salesforce/callback`
     - Production: `https://yourdomain.com/api/auth/salesforce/callback`
   - **SALESFORCE_LOGIN_URL**: Choose based on your org type:
     - Production orgs and Developer Edition: `https://login.salesforce.com`
     - Sandbox orgs: `https://test.salesforce.com`

3. **Security Note**

   Never commit your `.env` file to version control. The `.env` file is already included in `.gitignore` to prevent accidental commits. See `.env.example` for the complete list of required variables with detailed documentation.

### Verification

After completing the above steps, your Salesforce integration is configured and ready to use. The application will use these credentials to:

- Authenticate users via OAuth 2.0
- Retrieve Lightning Web Components from your Salesforce org
- Display component dependencies and relationships
- Deploy components back to Salesforce

You can now proceed with running the application and authenticating with your Salesforce org.

## Adding Components

To add more shadcn-svelte components:

```bash
pnpm dlx shadcn-svelte@latest add [component-name]
```

Available components: https://www.shadcn-svelte.com/docs/components

## Project Structure

```
salesduck/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── ui/          # shadcn-svelte components
│   │   └── utils/           # Utility functions
│   ├── routes/              # SvelteKit routes
│   ├── app.css              # Global styles
│   └── app.html             # HTML template
├── static/                  # Static assets
└── package.json
```

## License

Private

