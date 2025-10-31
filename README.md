# Duckforce

A modern Salesforce migration tool built with SvelteKit. Easily migrate Lightning Web Components, Apex classes, and other metadata between Salesforce organizations with intelligent dependency tracking.

## Features

- 🔐 **Single-Login Authentication** - Connect multiple Salesforce orgs with persistent caching
- 📦 **Component Discovery** - Automatically fetch and cache LWC, Apex, Objects, and more
- 🔄 **Flexible Migration** - Select any two cached orgs as source and target
- 🌳 **Dependency Tracking** - Intelligent dependency graph visualization
- 💾 **Persistent Cache** - Organization data persists across sessions via Supabase
- 🎨 **Modern UI** - Beautiful interface built with shadcn-svelte components

## Tech Stack

- **Svelte 5** - Latest version with runes
- **SvelteKit 2** - Full-stack framework
- **Supabase** - Backend database and authentication
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

### Salesforce Prerequisites

To use this application with Salesforce, you need:

- A Salesforce org (production, sandbox, or Developer Edition)
- System Administrator permissions or API Enabled User permissions
- Ability to create a Connected App in your Salesforce org
- A Supabase account (free tier available)

If you don't have a Salesforce org, you can sign up for a free Developer Edition at [developer.salesforce.com/signup](https://developer.salesforce.com/signup).

### How It Works

DuckForce uses a **single-login model** with persistent caching:

1. **Connect Organizations**: Authenticate with each Salesforce org one at a time
2. **Automatic Caching**: Component data is fetched and stored in Supabase
3. **Select Migration Path**: Choose any two cached orgs as source and target
4. **Migrate**: Transfer components with intelligent dependency resolution

All organization data persists across sessions, so you only need to authenticate once per org.

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

## Documentation

📚 **Complete documentation is available in the [`docs/`](./docs/) folder:**

- **[Migration Guide](./docs/MIGRATION_GUIDE.md)** - Upgrading from dual-login to single-login model
- **[API Endpoints](./docs/api/ENDPOINTS.md)** - Complete API reference
- **[Setup Guides](./docs/setup/)** - Salesforce integration and OAuth configuration
- **[User Guides](./docs/guides/)** - Quick start and implementation examples
- **[Planning Docs](./docs/planning/)** - Architecture and migration plans

## Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up Supabase**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the schema from `database/supabase-schema.sql`
   - Copy your Supabase URL and anon key

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Fill in your Salesforce and Supabase credentials
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Connect your first org**
   - Navigate to `/wizard`
   - Click "Connect New Org"
   - Authenticate with Salesforce
   - Wait for components to sync

6. **Connect additional orgs and start migrating!**

## Adding Components

To add more shadcn-svelte components:

```bash
pnpm dlx shadcn-svelte@latest add [component-name]
```

Available components: https://www.shadcn-svelte.com/docs/components

## Project Structure

```
duckforce/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── ui/          # shadcn-svelte components
│   │   └── utils/           # Utility functions
│   ├── routes/              # SvelteKit routes
│   ├── app.css              # Global styles
│   └── app.html             # HTML template
├── docs/                    # Documentation
│   ├── setup/               # Setup guides
│   ├── guides/              # User guides
│   └── planning/            # Planning documents
├── database/                # Database schemas
├── static/                  # Static assets
├── scripts/                 # Build and utility scripts
└── package.json
```

## License

Private
