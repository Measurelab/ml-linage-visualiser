# Deployment Checklist

## Pre-Deployment Setup

### 1. Database Schema Verification
- [ ] Verify `portal_name` column exists in `projects` table
- [ ] Confirm unique constraint on `portal_name, name` combination exists
- [ ] Verify all required tables exist: `projects`, `tables`, `lineages`, `dashboards`, `dashboard_tables`
- [ ] Test database connection from application

### 2. Environment Variables
Set the following in your Vercel/hosting environment:

**Required:**
- [ ] `VITE_SUPABASE_URL=your_supabase_project_url`
- [ ] `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`
- [ ] `VITE_REQUIRE_AUTH=true`
- [ ] `VITE_TOOL_SECRET=your_secure_shared_secret` (32+ chars)
- [ ] `VITE_ALLOWED_ORIGIN=https://your-main-site.vercel.app`

**Optional:**
- [ ] `VITE_DEV_PASSWORD=your_dev_password` (for dev login fallback)

### 3. Main Site Integration
- [ ] Update main site proxy with correct `TOOL_URL` and `TOOL_SECRET`
- [ ] Configure portal names in main site routing
- [ ] Test iframe embedding with authentication headers

## Portal Configuration

### 4. Portal Setup
- [ ] Configure EDF Energy portal: `?portal=EDF%20Energy`
- [ ] Configure Digital Science portal: `?portal=Digital%20Science`
- [ ] Configure additional client portals as needed
- [ ] Configure Measurelab admin portal: `?portal=measurelab`

### 5. Portal Testing
- [ ] Test EDF Energy portal shows only EDF projects
- [ ] Test Digital Science portal shows only Digital Science projects
- [ ] Test Measurelab admin portal shows ALL projects
- [ ] Verify "MEASURELAB ADMIN" badge appears in admin mode
- [ ] Test project creation assigns correct portal_name

## Security Validation

### 6. Authentication Testing
- [ ] Verify direct access is blocked (shows login or unauthorized)
- [ ] Test iframe access works through main site proxy
- [ ] Confirm HMAC signature validation is working
- [ ] Test timestamp validation (5-minute window)
- [ ] Verify CORS headers allow only specified origin

### 7. Data Isolation Testing
- [ ] Create test project in EDF portal - should have `portal_name = "EDF Energy"`
- [ ] Create test project in Digital Science portal - should have `portal_name = "Digital Science"`
- [ ] Create test project in admin portal - should have `portal_name = null`
- [ ] Verify each portal sees only their own projects
- [ ] Confirm admin portal sees all projects

## Performance & Functionality

### 8. Application Testing
- [ ] Test Excel file upload in each portal
- [ ] Test CSV file upload in each portal
- [ ] Verify D3.js visualization renders correctly
- [ ] Test project switching functionality
- [ ] Confirm table details panel works
- [ ] Test search and filtering features
- [ ] Verify dashboard integration works

### 9. Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on mobile devices (responsive design)

## Production Deployment

### 10. Build and Deploy
- [ ] Run `npm run build` successfully
- [ ] Deploy to Vercel/hosting platform
- [ ] Verify all environment variables are set
- [ ] Test production URL directly (should be blocked)
- [ ] Test iframe access through main site

### 11. Post-Deployment Verification
- [ ] Monitor application logs for errors
- [ ] Test all portal configurations
- [ ] Verify SSL certificate is valid
- [ ] Confirm performance is acceptable
- [ ] Test data upload and project creation

## Documentation

### 12. Final Documentation
- [ ] Update README.md with production URLs
- [ ] Confirm MAIN_SITE_INTEGRATION.md is accurate
- [ ] Update any API documentation
- [ ] Create user guides if needed
- [ ] Document troubleshooting steps

## Rollback Plan

### 13. Rollback Preparation
- [ ] Document current production configuration
- [ ] Keep backup of previous deployment
- [ ] Prepare rollback environment variables
- [ ] Test rollback procedure in staging if available

---

## Quick Portal Test Commands

**Test EDF Portal:**
```bash
curl -H "X-Portal-Name: EDF Energy" https://your-app.vercel.app/api/auth-check
```

**Test Admin Portal:**
```bash
curl -H "X-Portal-Name: measurelab" https://your-app.vercel.app/api/auth-check
```

**Test Authentication:**
```bash
# Should return 401 Unauthorized
curl https://your-app.vercel.app/api/auth-check
```

## Support Contacts

- **Technical Issues**: GitHub Issues
- **Deployment Support**: Vercel Support
- **Database Issues**: Supabase Support