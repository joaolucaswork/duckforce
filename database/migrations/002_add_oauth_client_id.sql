-- ============================================================================
-- Migration: Add oauth_client_id to organizations table
-- ============================================================================
-- This migration adds a field to store which OAuth Client ID (Connected App)
-- was used to authenticate each organization. This is necessary because:
-- 1. Different orgs may use different Connected Apps
-- 2. When refreshing tokens, we must use the same Client ID that was used
--    during the initial authentication
-- 3. Salesforce rejects refresh token requests if the Client ID doesn't match
-- ============================================================================

-- Add oauth_client_id column to organizations table
ALTER TABLE organizations
ADD COLUMN oauth_client_id TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN organizations.oauth_client_id IS 
'The OAuth Client ID (Consumer Key) of the Connected App used to authenticate this org. Required for token refresh operations.';

-- Create index for faster lookups by client_id (useful for debugging)
CREATE INDEX idx_organizations_oauth_client_id ON organizations(oauth_client_id);

-- ============================================================================
-- Data Migration: Set default Client ID for existing organizations
-- ============================================================================
-- For existing organizations that don't have a client_id set, we'll set it
-- to NULL. Users will need to re-authenticate these orgs to populate the field.
-- Alternatively, you could set a default value if you know which Client ID
-- was used for existing orgs.
-- ============================================================================

-- Example: If all existing orgs used the same Client ID, you could set it:
-- UPDATE organizations 
-- SET oauth_client_id = 'YOUR_DEFAULT_CLIENT_ID_HERE'
-- WHERE oauth_client_id IS NULL;

-- ============================================================================
-- Notes:
-- ============================================================================
-- - This field is optional (NULL allowed) to maintain backward compatibility
-- - New authentications will automatically populate this field
-- - Orgs without this field will fall back to the default SALESFORCE_CLIENT_ID
-- - For production, consider making this field NOT NULL after data migration
-- ============================================================================

