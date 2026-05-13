# CSP DEBUGGING GUIDE

## Problem
The CSP is not updating even after changing the middleware.ts file.

## Current Situation

**File has correct code:**
```typescript
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

**Server is sending:**
```
script-src 'unsafe-eval' 'nonce-...' 'strict-dynamic' 'self'
```

## Possible Causes

1. **Server Cache** - Node.js might be caching the old module
2. **Multiple CSP Sources** - Another file might be setting CSP
3. **Middleware Not Called** - The securityHeaders middleware might not be executing

## Debugging Steps

### 1. Check if Middleware is Called

Add console.log to middleware.ts:

```typescript
export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    console.log('🔒 securityHeaders middleware called'); // ADD THIS
    // ... rest of code
```

### 2. Check for Other CSP Sources

```bash
# Search for CSP in all files
findstr /S /I /C:"Content-Security-Policy" *.ts *.js
```

### 3. Clear All Caches

```bash
# Kill all node processes
taskkill /F /IM node.exe

# Clear Vite cache
rm -rf node_modules/.vite

# Clear any other caches
rm -rf .vite
rm -rf dist
rm -rf build

# Restart
npm run dev
```

### 4. Test with Minimal CSP

Replace the entire CSP in middleware.ts with:

```typescript
res.setHeader('Content-Security-Policy', "default-src 'unsafe-inline' 'unsafe-eval' 'self'");
```

This is the most permissive CSP possible - if this doesn't work, the middleware isn't being called.

### 5. Check Middleware Order

In server.ts, check the order of middleware:

```typescript
app.use(securityHeaders()); // Should be early
app.use(corsMiddleware(...));
// ...
```

## Quick Fix

If nothing else works, try this minimal CSP in middleware.ts:

```typescript
res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https: http: localhost:3000");
```

No nonce, no strict-dynamic, just simple development CSP.

## Test Page

After fixing, test at:
- http://localhost:3000/test.html (bypasses React, tests API)
- http://localhost:3000 (full React app)

Check browser console (F12) for CSP errors.
