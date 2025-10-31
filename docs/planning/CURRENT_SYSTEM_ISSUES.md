# Current Authentication System: Issues & Bugs

This document identifies the specific problems, bugs, and complexity issues with the current dual-org authentication implementation.

---

## Critical Issues

### 1. Cross-Org OAuth Blocking (MOST SEVERE)

**Error Message:**
```
OAUTH_AUTHORIZATION_BLOCKED Cross-org OAuth flows are not supported for this external client app
```

**Root Cause:**
Salesforce blocks OAuth flows when trying to authenticate to a different organization using a Connected App that was created in another org.

**Current Workaround:**
The system requires creating **separate Connected Apps** in each organization:
- One Connected App in Source Org → `SALESFORCE_SOURCE_CLIENT_ID`
- One Connected App in Target Org → `SALESFORCE_TARGET_CLIENT_ID`

**Why This Is Problematic:**

1. **User Burden**: Every user must:
   - Create a Connected App in their source org
   - Create a Connected App in their target org
   - Configure both with identical settings
   - Manage two sets of credentials

2. **Configuration Complexity**: 
   - Two environment variables to manage
   - Easy to mix up Client IDs
   - Difficult to troubleshoot when one is wrong

3. **Scalability Issues**:
   - What if user wants to connect 3 orgs? 5 orgs? 10 orgs?
   - Current system only supports exactly 2 orgs
   - Would need `SALESFORCE_ORG_1_CLIENT_ID`, `SALESFORCE_ORG_2_CLIENT_ID`, etc.

4. **Production Deployment**:
   - Each customer needs to create Connected Apps in their orgs
   - Support burden increases significantly
   - No way to provide a "one-click" setup

**Evidence in Code:**

<augment_code_snippet path="src/lib/server/salesforce/config.ts" mode="EXCERPT">
```typescript
export function getClientIdForOrg(org: 'source' | 'target'): string {
	// Try to get org-specific Client ID from environment
	const orgSpecificClientId = getEnvVar(
		org === 'source' ? 'SALESFORCE_SOURCE_CLIENT_ID' : 'SALESFORCE_TARGET_CLIENT_ID'
	);
	
	if (orgSpecificClientId && orgSpecificClientId.trim() !== '') {
		console.log(`[Config] Using org-specific Client ID for ${org}`);
		return orgSpecificClientId;
	}
	
	// Otherwise, fall back to the default Client ID
	console.log(`[Config] Using default Client ID for ${org}`);
	return SALESFORCE_CLIENT_ID;
}
```
</augment_code_snippet>

---

### 2. Hardcoded Source/Target Paradigm

**Problem:**
The entire system is built around the assumption of exactly 2 orgs: "source" and "target".

**Evidence:**

<augment_code_snippet path="src/lib/server/salesforce/cookies.ts" mode="EXCERPT">
```typescript
export type OrgType = 'source' | 'target';

const COOKIE_NAMES = {
	accessToken: (org: OrgType) => `sf_${org}_access_token`,
	refreshToken: (org: OrgType) => `sf_${org}_refresh_token`,
	instanceUrl: (org: OrgType) => `sf_${org}_instance_url`,
	// ... 8 different cookie types per org
};
```
</augment_code_snippet>

**Limitations:**

1. **Cannot support 3+ orgs**: The type system literally prevents it
2. **Cannot swap roles**: Once an org is "source", it can't become "target"
3. **Rigid workflow**: Forces a linear source → target migration pattern
4. **No exploratory analysis**: Can't compare data across multiple orgs

**Real-World Use Cases That Fail:**

- ❌ Migrate from 2 source orgs into 1 target org (consolidation)
- ❌ Migrate from 1 source org into 2 target orgs (split)
- ❌ Compare configurations across 3+ orgs for audit purposes
- ❌ Maintain a library of org configurations for reference

---

### 3. No Data Persistence

**Problem:**
When a user logs out of an org, ALL cached data is immediately deleted.

**Evidence:**

<augment_code_snippet path="src/lib/server/salesforce/cookies.ts" mode="EXCERPT">
```typescript
export function clearOrgSessionCookies(cookies: Cookies, org: OrgType): void {
	const cookieOptions = { path: '/' };
	cookies.delete(COOKIE_NAMES.accessToken(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.refreshToken(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.instanceUrl(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.orgId(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.orgName(org), cookieOptions);
	// ... deletes everything
}
```
</augment_code_snippet>

**Impact:**

1. **Poor User Experience**:
   - User logs into Org A
   - Fetches 500 components (takes 2 minutes)
   - Logs out to connect to Org B
   - Logs back into Org A
   - Must re-fetch all 500 components again

2. **Wasted API Calls**:
   - Salesforce has API limits
   - Re-fetching the same data wastes quota
   - Could hit daily limits on large orgs

3. **No Historical Data**:
   - Cannot compare "before" and "after" states
   - Cannot track changes over time
   - Cannot maintain audit trail

4. **Session Timeout Issues**:
   - If session expires during work, all data is lost
   - User must start over from scratch

---

### 4. Cookie Management Complexity

**Problem:**
Managing 16+ cookies (8 per org) is complex and error-prone.

**Current Cookie Structure:**
```
Source Org (8 cookies):
- sf_source_access_token
- sf_source_refresh_token
- sf_source_instance_url
- sf_source_org_id
- sf_source_org_name
- sf_source_org_type
- sf_source_color
- sf_source_icon

Target Org (8 cookies):
- sf_target_access_token
- sf_target_refresh_token
- sf_target_instance_url
- sf_target_org_id
- sf_target_org_name
- sf_target_org_type
- sf_target_color
- sf_target_icon

OAuth State (2 cookies):
- sf_source_oauth_state
- sf_target_oauth_state
```

**Issues:**

1. **Cookie Size Limits**: Browsers limit cookie size (4KB per cookie)
2. **Cookie Count Limits**: Browsers limit total cookies per domain
3. **Synchronization**: Keeping 16 cookies in sync is difficult
4. **Debugging**: Hard to inspect and troubleshoot cookie issues
5. **Security**: More cookies = larger attack surface

---

### 5. Tight Coupling Between UI and Auth

**Problem:**
The wizard UI is tightly coupled to the dual-org authentication model.

**Evidence:**

<augment_code_snippet path="src/lib/stores/wizard.svelte.ts" mode="EXCERPT">
```typescript
export interface WizardState {
	currentStep: WizardStep;
	completedSteps: Set<WizardStep>;
	sourceOrg: OrgConnection;  // Hardcoded "source"
	targetOrg: OrgConnection;  // Hardcoded "target"
	componentSelection: ComponentSelection;
	dependencyReview: DependencyReview;
	migrationExecution: MigrationExecution;
}
```
</augment_code_snippet>

**Problems:**

1. **Cannot extend**: Adding a 3rd org requires changing the entire state structure
2. **Duplicated logic**: Separate methods for source and target that do the same thing
3. **Difficult to test**: Mocking requires setting up both orgs
4. **Hard to maintain**: Changes to auth flow require UI changes

---

### 6. No Offline Capability

**Problem:**
The system requires active Salesforce sessions to view any data.

**Scenarios That Fail:**

1. **Network Issues**: If Salesforce is down, user can't access cached data
2. **Token Expiration**: If tokens expire, all data becomes inaccessible
3. **Comparison Work**: Can't compare orgs side-by-side without 2 active sessions
4. **Reporting**: Can't generate reports from historical data

---

### 7. State Cookie Staleness Bug

**Known Issue:**
OAuth state cookies can become stale after server restart during development.

**Evidence:**

<augment_code_snippet path="src/routes/api/auth/salesforce/clear-temp/+server.ts" mode="EXCERPT">
```typescript
/**
 * Clear temporary OAuth state cookies
 * 
 * This is useful when OAuth flow gets interrupted or when cookies become stale
 * (e.g., after server restart during development)
 */
export const POST: RequestHandler = async ({ cookies }) => {
	clearOAuthStateCookies(cookies, 'source');
	clearOAuthStateCookies(cookies, 'target');
	// ...
};
```
</augment_code_snippet>

**Impact:**
- Users get "invalid code verifier" errors
- Must manually clear cookies to fix
- Confusing error messages
- Poor developer experience

---

## Summary of Issues

| Issue | Severity | Impact | Workaround Exists? |
|-------|----------|--------|-------------------|
| Cross-org OAuth blocking | 🔴 Critical | Requires 2 Connected Apps | Yes, but complex |
| Hardcoded source/target | 🔴 Critical | Cannot support 3+ orgs | No |
| No data persistence | 🟠 High | Data lost on logout | No |
| Cookie complexity | 🟠 High | Hard to debug | No |
| Tight UI coupling | 🟡 Medium | Hard to extend | No |
| No offline capability | 🟡 Medium | Requires active sessions | No |
| State cookie staleness | 🟡 Medium | OAuth errors | Yes, manual clear |

---

## Recommended Solution

Migrate to a **single-login model with persistent database caching** as outlined in `AUTHENTICATION_MIGRATION_PLAN.md`.

This solves ALL of the above issues:

✅ **No cross-org issues** - Each login is independent
✅ **Unlimited orgs** - Database can store any number of orgs
✅ **Data persists** - Logout doesn't delete cached data
✅ **Simple cookies** - Only 1 active session at a time
✅ **Decoupled UI** - Wizard works with cached data
✅ **Offline capable** - Can view cached data anytime
✅ **No state bugs** - Database is source of truth

---

## Next Steps

See `AUTHENTICATION_MIGRATION_PLAN.md` for the complete migration strategy and `IMPLEMENTATION_EXAMPLES.md` for code examples.

