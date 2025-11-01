I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

The project is a SvelteKit 2 + Svelte 5 application using pnpm with no existing Salesforce dependencies. The codebase has well-defined TypeScript types for Salesforce components and wizard state in `src/lib/types/salesforce.ts` and `src/lib/types/wizard.ts`. The `OrgConnection` interface already includes `accessToken` and `instanceUrl` fields, indicating OAuth flow is anticipated. No environment configuration files or `app.d.ts` exist yet. The `.gitignore` already covers environment files appropriately.


### Approach

Install the `@jsforce/jsforce-node` package (Node.js-optimized version) via pnpm. Create `.env.example` as a template with all required Salesforce OAuth 2.0 variables. Add a new `src/app.d.ts` file to declare environment variable types for TypeScript safety using SvelteKit's `App.Env` namespace. Update the README with a comprehensive Salesforce Connected App setup guide including OAuth configuration steps, required permissions, and environment variable instructions.


### Reasoning

Listed the repository structure to understand the project layout. Read `package.json` and `README.md` to confirm no Salesforce dependencies exist. Searched for and confirmed no `app.d.ts` or `.env` files exist. Examined the TypeScript types in `src/lib/types/salesforce.ts` and `src/lib/types/wizard.ts` to understand the expected data structures. Verified the `.gitignore` already covers environment files. Searched the web to confirm `@jsforce/jsforce-node` is the recommended package for Node.js/SvelteKit environments in 2025.


## Proposed File Changes

### package.json(MODIFY)

Add `@jsforce/jsforce-node` to the `dependencies` section. This is the Node.js-optimized version of jsforce (version ^3.10.0 or latest) that avoids browser bundle artifacts and is specifically designed for server-side use in Node.js environments like SvelteKit. This package will be used in subsequent phases to implement OAuth authentication, metadata retrieval, and deployment operations.

### .env.example(NEW)

References: 

- .gitignore

Create an environment variable template file with comprehensive documentation. Include the following variables with descriptive comments:

- `SALESFORCE_CLIENT_ID`: The Consumer Key from the Salesforce Connected App (OAuth Client ID)
- `SALESFORCE_CLIENT_SECRET`: The Consumer Secret from the Salesforce Connected App
- `SALESFORCE_CALLBACK_URL`: The OAuth callback URL (e.g., `http://localhost:5173/api/auth/salesforce/callback` for development)
- `SALESFORCE_LOGIN_URL`: The Salesforce login endpoint (use `https://login.salesforce.com` for production orgs or `https://test.salesforce.com` for sandboxes)

Add inline comments explaining each variable's purpose, where to obtain the values, and example formats. Include a header comment instructing developers to copy this file to `.env` and fill in their actual credentials. Note that `.env` is already gitignored per the existing `.gitignore` configuration.

### src/app.d.ts(NEW)

Create the SvelteKit ambient type declaration file to provide TypeScript type safety for environment variables. Declare the `App` namespace with a `Env` interface containing the four Salesforce environment variables as string types:

- `SALESFORCE_CLIENT_ID: string`
- `SALESFORCE_CLIENT_SECRET: string`
- `SALESFORCE_CALLBACK_URL: string`
- `SALESFORCE_LOGIN_URL: string`

This follows SvelteKit's convention for typing environment variables accessible via `$env/dynamic/private` and `$env/static/private`. The file should use TypeScript's ambient module declaration syntax with `declare global` and the `App` namespace. This ensures type checking and autocomplete when accessing environment variables in server-side code throughout the application.

### README.md(MODIFY)

References: 

- .env.example(NEW)
- .gitignore

Add a comprehensive "Salesforce Integration Setup" section after the existing "Getting Started" section and before "Adding Components". This new section should include:

**Prerequisites subsection**: Explain that users need a Salesforce org (production, sandbox, or developer edition) with System Administrator or API Enabled User permissions.

**Connected App Setup subsection**: Provide step-by-step instructions for creating a Salesforce Connected App:
1. Navigate to Setup → App Manager → New Connected App
2. Fill in basic information (Connected App Name, API Name, Contact Email)
3. Enable OAuth Settings
4. Set the Callback URL (matching the `SALESFORCE_CALLBACK_URL` environment variable)
5. Select OAuth Scopes: `api`, `refresh_token`, `web`, and `full` (explain each scope's purpose)
6. Save and note the Consumer Key and Consumer Secret
7. Important: Wait 2-10 minutes for the Connected App to propagate

**Environment Configuration subsection**: Instruct users to:
1. Copy `.env.example` to `.env`
2. Fill in the four required variables with values from their Connected App
3. Choose the correct `SALESFORCE_LOGIN_URL` based on org type
4. Never commit `.env` to version control (already handled by `.gitignore`)

**Verification subsection**: Mention that after completing these steps, users will be ready to proceed with the OAuth authentication implementation in subsequent phases.

Reference the existing `.env.example` file for the complete list of required variables.