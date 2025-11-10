# Database Schema

Esta pasta contém os schemas e scripts de banco de dados do Duckforce.

## Arquivos

### `supabase-schema.sql`
Schema completo do banco de dados Supabase, incluindo:
- Tabela `organizations` - Metadados das organizações Salesforce conectadas
- Tabela `lwc_components` - Cache de componentes Lightning Web Components
- Tabela `component_dependencies` - Relacionamentos entre componentes
- Tabela `metadata_cache` - Cache de metadados do Salesforce
- Índices e constraints para performance

## Supabase Project

- **Project ID**: `ucoererotujfwjhhoxec`
- **Region**: `sa-east-1`
- **Name**: DuckForce - Salesforce Migration

## Como Aplicar o Schema

```bash
# Via Supabase CLI
supabase db reset

# Ou via SQL Editor no Supabase Dashboard
# Copie e cole o conteúdo de supabase-schema.sql
```

## Estrutura de Dados

### Organizations
Armazena informações sobre as organizações Salesforce conectadas, incluindo tokens OAuth e metadados.

### LWC Components
Cache local dos componentes Lightning Web Components recuperados do Salesforce.

### Component Dependencies
Mapeia as dependências entre componentes para visualização e análise.

### Metadata Cache
Cache de metadados gerais do Salesforce para melhorar performance.

### Component Notes
Stores user notes and to-do entries for components in the migration wizard.

**Purpose:**
- Allow users to add notes and to-do items to components during migration planning
- Support the To-Do Mode feature in the wizard
- Track migration-related information per component per user

**Key Features:**
- One note per user per component (enforced by unique constraint)
- Support for to-do status tracking
- Note history and archiving capabilities
- Row Level Security ensures user isolation

**Related Files:**
- Migration: `migrations/003_add_component_notes.sql`
- Database operations: `src/lib/server/db/notes.ts`
- API endpoint: `src/routes/api/notes/+server.ts`
- Client integration: `src/lib/stores/wizard.svelte.ts`

### Kanban Boards
Stores the kanban board state (which components are in which columns) for each user's To-Do Mode.

**Purpose:**
- Persist kanban board layout across page refreshes and sessions
- Enable users to organize components into workflow columns (Not Started, In Progress, Completed)
- Support the To-Do Mode feature in the wizard

**Key Features:**
- One kanban board per user (enforced by unique constraint)
- JSONB column stores flexible column structure: `[{columnId: string, componentIds: string[]}]`
- Automatic timestamps for tracking changes
- Row Level Security ensures user isolation

**Related Files:**
- Migration: `migrations/005_add_kanban_boards.sql`
- Database operations: `src/lib/server/db/kanban.ts`
- API endpoint: `src/routes/api/kanban/+server.ts`
- Client integration: `src/lib/stores/wizard.svelte.ts`

