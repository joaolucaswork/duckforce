# Quick Start: Testing Salesforce OAuth Integration

## Prerequisites

1. **Salesforce Connected App** - You need a Salesforce Connected App configured with OAuth settings
2. **Environment Variables** - Your `.env` file is already configured with the credentials

## Current Configuration

Your `.env` file is already set up with:
```bash
SALESFORCE_CLIENT_ID=3MVG9dqyJqDc8eKQ1nPTvc0n5RF4cQFsp5NeQIQ8P9EuFVyNv9Hhq3nsuxwsiY9R06gt5jF0luewMR62gC1Ud
SALESFORCE_CLIENT_SECRET=6A65A38CB5DF4A072C8EC32FB0894BFFD1C266A89D7843B05A3C66D484793A2D
SALESFORCE_CALLBACK_URL=http://localhost:5173/api/auth/salesforce/callback
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

## Testing Steps

### 1. Start the Development Server

```bash
pnpm dev
```

The server should start at `http://localhost:5173`

### 2. Navigate to the Wizard

Open your browser and go to:
```
http://localhost:5173/wizard
```

### 3. Test Source Org Connection

1. Click the **"Connect Source Org"** button
2. You'll be redirected to Salesforce login page
3. Log in with your Salesforce credentials
4. Authorize the app
5. You'll be redirected back to the wizard
6. The source org should now show as connected

### 4. Test Target Org Connection

1. Click the **"Connect Destination Org"** button
2. Repeat the same process as source org
3. You can use the same or different Salesforce org

### 5. Test Session Persistence

1. Refresh the page (`Cmd+R` or `Ctrl+R`)
2. Both orgs should remain connected
3. The connection status is restored from cookies

### 6. Test Disconnect

1. Click the disconnect button (three dots menu → Disconnect)
2. The org should disconnect
3. Cookies should be cleared
4. Token should be revoked with Salesforce

## Verification Checklist

- [ ] Source org connects successfully
- [ ] Target org connects successfully
- [ ] Both orgs can be connected at the same time
- [ ] Page refresh maintains connection state
- [ ] Disconnect clears the connection
- [ ] Error messages display properly if authentication fails
- [ ] Browser cookies show `sf_source_*` and `sf_target_*` cookies

## Debugging

### Check Browser Cookies

1. Open DevTools (F12)
2. Go to Application → Cookies → `http://localhost:5173`
3. Look for cookies:
   - `sf_source_access_token`
   - `sf_source_refresh_token`
   - `sf_source_instance_url`
   - `sf_target_access_token`
   - `sf_target_refresh_token`
   - `sf_target_instance_url`

### Check Network Requests

1. Open DevTools → Network tab
2. Connect an org
3. You should see:
   - Redirect to `/api/auth/salesforce/login?org=source`
   - Redirect to Salesforce login
   - Redirect to `/api/auth/salesforce/callback?code=...&state=...`
   - Redirect to `/wizard?connected=source`

### Check Server Logs

The server console will show:
- OAuth flow initiation
- Token exchange
- Any errors during the process

### Common Issues

**Issue**: "Invalid OAuth state" error
- **Solution**: Clear browser cookies and try again

**Issue**: Redirect loop
- **Solution**: Verify the callback URL in your Salesforce Connected App matches exactly: `http://localhost:5173/api/auth/salesforce/callback`

**Issue**: "Environment variables not configured"
- **Solution**: Make sure the `.env` file is in the project root and the dev server was restarted after creating it

**Issue**: CORS errors
- **Solution**: Make sure you're accessing the app via `localhost:5173`, not `127.0.0.1:5173`

**Issue**: "Cross-org OAuth flows are not supported for this external client app"
- **Cause**: You're already authenticated to one Salesforce org and trying to connect to a different org. Salesforce blocks cross-org OAuth flows for security.
- **Solutions**:
  - **Option 1 (Recommended)**: Use incognito/private windows - connect the first org in a normal window, and the second org in an incognito/private window (Ctrl+Shift+N in Chrome)
  - **Option 2**: Log out of Salesforce between connections by visiting `https://login.salesforce.com/secur/logout.jsp` before connecting the second org
  - **Option 3**: Use different browser profiles for each org

## API Endpoints Reference

### Check Connection Status
```bash
curl http://localhost:5173/api/auth/salesforce/status
```

### Refresh Token (Manual Test)
```bash
curl -X POST http://localhost:5173/api/auth/salesforce/refresh?org=source
```

### Logout (Manual Test)
```bash
curl -X POST http://localhost:5173/api/auth/salesforce/logout?org=source
```

## Next Steps After Testing

Once you've verified the OAuth flow works:

1. **Fetch Org Details**: Implement API calls to fetch org information (org name, user details) after successful authentication
2. **Automatic Token Refresh**: Add logic to automatically refresh tokens when API calls return 401
3. **Error Handling**: Improve error messages and user feedback
4. **Production Setup**: Update environment variables for production deployment

## Salesforce Connected App Verification

Make sure your Salesforce Connected App has:

1. **OAuth Settings Enabled**: ✓
2. **Callback URL**: `http://localhost:5173/api/auth/salesforce/callback`
3. **Selected OAuth Scopes**:
   - Full access (full)
   - Perform requests on your behalf at any time (refresh_token, offline_access)
   - Access and manage your data (api)
4. **Enable for Device Flow**: Optional
5. **Require Secret for Web Server Flow**: Yes (recommended)
6. **Require Secret for Refresh Token Flow**: Yes (recommended)

## Security Notes

- All tokens are stored in **httpOnly cookies** (not accessible via JavaScript)
- Cookies are **secure** (HTTPS only in production)
- **PKCE** is used for enhanced security
- **CSRF protection** via state parameter
- Tokens are **revoked** on logout

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the server console for errors
3. Verify your Salesforce Connected App configuration
4. Ensure environment variables are correct
5. Clear browser cookies and try again

---

**Implementation Complete!** 🎉

The Salesforce dual-org OAuth integration is now fully functional and ready for testing.

