# API Endpoints Documentation

## Authentication Endpoints

### Login to Salesforce

Initiates OAuth flow to connect a Salesforce organization.

```http
GET /api/auth/salesforce/login
```

**Response**: Redirects to Salesforce OAuth authorization page

**Example**:
```javascript
// Redirect user to login
window.location.href = '/api/auth/salesforce/login';
```

---

### OAuth Callback

Handles OAuth callback from Salesforce and saves organization to Supabase.

```http
GET /api/auth/salesforce/callback?code={code}&state={state}
```

**Query Parameters**:
- `code` (string, required): OAuth authorization code
- `state` (string, required): OAuth state for CSRF protection

**Response**: Redirects to `/wizard` on success

**What it does**:
1. Exchanges authorization code for access token
2. Fetches organization details from Salesforce
3. Saves organization to Supabase
4. Fetches all components (LWC, Apex, Objects, etc.)
5. Saves components to Supabase
6. Sets organization as active session

---

### Get Auth Status

Returns current authentication status and all cached organizations.

```http
GET /api/auth/salesforce/status
```

**Response**:
```json
{
  "isAuthenticated": true,
  "activeOrg": {
    "id": "uuid",
    "org_id": "00D...",
    "org_name": "Production Org",
    "instance_url": "https://mycompany.my.salesforce.com",
    "org_type": "production",
    "is_active": true,
    "last_synced_at": "2024-01-15T10:30:00Z"
  },
  "organizations": [
    {
      "id": "uuid",
      "org_id": "00D...",
      "org_name": "Production Org",
      "instance_url": "https://mycompany.my.salesforce.com",
      "org_type": "production",
      "is_active": true,
      "last_synced_at": "2024-01-15T10:30:00Z",
      "component_counts": {
        "lwc": 45,
        "apex": 120,
        "objects": 30,
        "fields": 250,
        "triggers": 15,
        "visualforce": 8,
        "flows": 12
      }
    }
  ]
}
```

---

### Logout

Clears active session (does not delete cached organizations).

```http
POST /api/auth/salesforce/logout
```

**Response**:
```json
{
  "success": true
}
```

---

## Organization Management Endpoints

### List Organizations

Get all cached organizations for the current user.

```http
GET /api/orgs
```

**Response**:
```json
{
  "organizations": [
    {
      "id": "uuid",
      "org_id": "00D...",
      "org_name": "Production Org",
      "instance_url": "https://mycompany.my.salesforce.com",
      "org_type": "production",
      "color": "#2563eb",
      "icon": "building-2",
      "is_active": true,
      "last_connected_at": "2024-01-15T10:30:00Z",
      "last_synced_at": "2024-01-15T10:30:00Z",
      "component_counts": {
        "lwc": 45,
        "apex": 120,
        "objects": 30
      }
    }
  ]
}
```

---

### Get Organization Details

Get detailed information about a specific organization.

```http
GET /api/orgs/[orgId]
```

**Path Parameters**:
- `orgId` (string, required): Organization UUID

**Response**:
```json
{
  "id": "uuid",
  "org_id": "00D...",
  "org_name": "Production Org",
  "instance_url": "https://mycompany.my.salesforce.com",
  "org_type": "production",
  "color": "#2563eb",
  "icon": "building-2",
  "is_active": true,
  "last_connected_at": "2024-01-15T10:30:00Z",
  "last_synced_at": "2024-01-15T10:30:00Z",
  "component_counts": {
    "lwc": 45,
    "apex": 120,
    "objects": 30,
    "fields": 250,
    "triggers": 15,
    "visualforce": 8,
    "flows": 12
  }
}
```

**Error Responses**:
- `404`: Organization not found
- `403`: Not authorized to access this organization

---

### Activate Organization

Set an organization as the active session.

```http
POST /api/orgs/[orgId]/activate
```

**Path Parameters**:
- `orgId` (string, required): Organization UUID

**Response**:
```json
{
  "success": true,
  "activeOrgId": "uuid"
}
```

**What it does**:
1. Sets `is_active = true` for the specified organization
2. Sets `is_active = false` for all other organizations
3. Updates active session cookie

---

### Sync Organization Data

Refresh component data from Salesforce for an organization.

```http
POST /api/orgs/[orgId]/sync
```

**Path Parameters**:
- `orgId` (string, required): Organization UUID

**Response**:
```json
{
  "success": true,
  "synced_at": "2024-01-15T10:35:00Z",
  "component_counts": {
    "lwc": 45,
    "apex": 120,
    "objects": 30,
    "fields": 250,
    "triggers": 15,
    "visualforce": 8,
    "flows": 12
  }
}
```

**What it does**:
1. Fetches latest component data from Salesforce
2. Updates components in Supabase
3. Updates `last_synced_at` timestamp

**Note**: This operation may take several seconds depending on org size.

---

### Delete Organization

Remove an organization and all its cached data.

```http
DELETE /api/orgs/[orgId]
```

**Path Parameters**:
- `orgId` (string, required): Organization UUID

**Response**:
```json
{
  "success": true
}
```

**What it does**:
1. Deletes all cached components for the organization
2. Deletes the organization record
3. If this was the active org, clears active session

**Warning**: This action cannot be undone. You'll need to re-authenticate to restore the organization.

---

## Component Endpoints

### Get Components

Get all components for an organization.

```http
GET /api/orgs/[orgId]/components?type={type}
```

**Path Parameters**:
- `orgId` (string, required): Organization UUID

**Query Parameters**:
- `type` (string, optional): Filter by component type (lwc, apex, object, field, trigger, visualforce, flow)

**Response**:
```json
{
  "components": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "component_type": "lwc",
      "api_name": "myComponent",
      "metadata": {
        "description": "My Lightning Web Component",
        "isExposed": true,
        "targets": ["lightning__AppPage"]
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "error": "Not authorized to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## Rate Limiting

Salesforce API calls are subject to Salesforce's rate limits:
- Standard: 15,000 API calls per 24 hours
- Sync operations count as multiple API calls

Monitor your API usage in Salesforce Setup → System Overview → API Usage.

---

## Authentication

All endpoints (except `/api/auth/salesforce/login` and `/api/auth/salesforce/callback`) require authentication.

Authentication is handled via:
1. Session cookies (httpOnly, secure)
2. Supabase user session

Unauthenticated requests will receive a `401 Unauthorized` response.

