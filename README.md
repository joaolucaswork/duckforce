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

