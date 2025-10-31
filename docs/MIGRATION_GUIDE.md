# Migration Guide: Dual-Login to Single-Login Model

## Overview

DuckForce has migrated from a dual-organization authentication model to a single-login model with persistent caching. This guide explains the changes and how they affect your workflow.

## What Changed?

### Before (Dual-Login Model)
- Users had to authenticate with both source and target orgs simultaneously
- Session data was stored in browser cookies
- Switching organizations required re-authentication
- No persistent cache of organization data
- Limited to exactly 2 organizations at a time

### After (Single-Login Model)
- Users authenticate with one organization at a time
- All organization data is cached in Supabase
- Can connect and manage multiple organizations
- Switch between organizations without re-authentication
- Select any two cached organizations as source/target for migration

## Key Benefits

1. **Persistent Cache**: Organization data persists across sessions
2. **Multiple Organizations**: Connect and manage unlimited organizations
3. **Flexible Selection**: Choose any two orgs as source/target
4. **Better Performance**: Cached component data loads instantly
5. **Improved UX**: No need to re-authenticate when switching orgs

## New Workflow

### 1. Connect Organizations

Instead of connecting source and target simultaneously:

```
Old: Connect Source → Connect Target → Proceed
New: Connect Org 1 → Connect Org 2 → ... → Select Source & Target → Proceed
```

### 2. Organization Management

New features available:
- **View All Orgs**: See all connected organizations in one place
- **Refresh Data**: Update component data for any organization
- **Delete Org**: Remove organizations from cache
- **Set Active**: Switch which organization is currently active

### 3. Migration Path Selection

After connecting organizations:
1. View all cached organizations
2. Select source organization from dropdown
3. Select target organization from dropdown
4. Proceed with migration

## Technical Changes

### API Endpoints

#### New Endpoints
- `GET /api/orgs` - List all cached organizations
- `GET /api/orgs/[orgId]` - Get organization details
- `POST /api/orgs/[orgId]/activate` - Set active organization
- `POST /api/orgs/[orgId]/sync` - Refresh organization data
- `DELETE /api/orgs/[orgId]` - Remove organization from cache

#### Modified Endpoints
- `GET /api/auth/salesforce/login` - No longer requires `org` parameter
- `GET /api/auth/salesforce/callback` - Now saves to Supabase
- `GET /api/auth/salesforce/status` - Returns all cached orgs
- `POST /api/auth/salesforce/logout` - Clears active session only

### Data Storage

#### Before
```typescript
// Cookies (browser-side)
sf_source_access_token
sf_source_refresh_token
sf_target_access_token
sf_target_refresh_token
```

#### After
```sql
-- Supabase (server-side)
organizations (
  id, user_id, org_id, org_name,
  access_token, refresh_token,
  last_synced_at, is_active
)

salesforce_components (
  id, organization_id, component_type,
  api_name, metadata
)
```

### UI Components

#### New Components
- `OrgCard.svelte` - Display organization with actions
- `CachedOrgsList.svelte` - List all cached organizations
- `OrgSelector.svelte` - Dropdown to select organization
- `SyncProgress.svelte` - Show sync progress

#### Modified Components
- `ConfigureOrgs.svelte` - Redesigned for new workflow

### Store Changes

#### WizardState Interface
```typescript
// New fields
cachedOrgs: CachedOrganization[]
activeOrgId: string | null
selectedSourceOrgId: string | null
selectedTargetOrgId: string | null

// Deprecated (kept for compatibility)
sourceOrg: OrgConnection
targetOrg: OrgConnection
```

#### New Methods
```typescript
wizardStore.loadCachedOrgs()
wizardStore.switchActiveOrg(orgId)
wizardStore.refreshOrgData(orgId)
wizardStore.deleteOrg(orgId)
wizardStore.connectNewOrg()
wizardStore.setSelectedSourceOrg(orgId)
wizardStore.setSelectedTargetOrg(orgId)
```

## Migration Checklist

For existing users:

- [ ] Your existing cookie-based sessions will be cleared
- [ ] You'll need to re-authenticate with your organizations
- [ ] Component data will be fetched and cached in Supabase
- [ ] You can now connect additional organizations if needed

## Backward Compatibility

The following are maintained for backward compatibility:
- `OrgType` type (marked as deprecated)
- Cookie management functions (marked as deprecated)
- `sourceOrg` and `targetOrg` in WizardState (will be removed in v2.0)

## Breaking Changes

None for end users. The migration is transparent and requires no code changes for users of the application.

For developers extending DuckForce:
- Cookie-based session management is deprecated
- Direct use of `OrgType` should be replaced with organization IDs
- Use Supabase queries instead of cookie functions

## Troubleshooting

### Issue: Can't see my organizations
**Solution**: Click "Connect New Org" to authenticate with your organizations again.

### Issue: Component data is outdated
**Solution**: Click the refresh icon on the organization card to sync latest data.

### Issue: Can't select source/target
**Solution**: Ensure you have at least 2 organizations connected.

## Support

For issues or questions:
- Check the [README](../README.md)
- Review [API Documentation](./api/ENDPOINTS.md)
- Open an issue on GitHub

## Timeline

- **v1.0**: Dual-login model
- **v1.5**: Single-login model (current)
- **v2.0**: Remove deprecated dual-login code (planned)

