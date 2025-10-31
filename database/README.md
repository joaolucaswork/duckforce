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

