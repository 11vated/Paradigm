# BLANK PAGE TROUBLESHOOTING

**Issue:** White/blank page when accessing http://localhost:3000

---

## ✅ SERVER STATUS

The server IS running correctly:
- Health endpoint works: http://localhost:3000/health
- API endpoints work: http://localhost:3000/api/domains
- Static files are being served

---

## 🔍 LIKELY CAUSES

### 1. React Component Error
The React app might have a runtime error that's preventing rendering.

**Check Browser Console:**
1. Open http://localhost:3000
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for errors (likely in red)

**Common Errors:**
- Module not found
- Cannot read property of undefined
- React component errors
- CSS import issues

### 2. Missing Dependencies
Some React components might be importing modules that don't exist.

**Check for these imports in App.tsx and StudioPage.jsx:**
```javascript
import { StudioPage } from '@/pages/StudioPage';
```

### 3. CSS Issues
The global CSS might have errors preventing rendering.

---

## 🛠️ FIXES

### Fix 1: Check Browser Console

**Most Important:** Open browser console (F12) and look for errors.

Share any error messages you see.

### Fix 2: Test Page

I've created a test page to verify the backend is working:

**Access:** http://localhost:3000/test.html

This page will:
- Show server health status
- Test API endpoints
- Create test seeds
- Help diagnose if it's a frontend or backend issue

### Fix 3: Simplify App.tsx

If the console shows errors, try simplifying App.tsx:

```typescript
// Temporary test - replace App.tsx content with:
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div style={{padding: 40, color: '#fff'}}>
            <h1>Paradigm Absolute is Running!</h1>
            <p>If you see this, React is working.</p>
            <a href="/api/health" style={{color: '#00E5FF'}}>API Health Check</a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Fix 4: Check StudioPage.jsx

The StudioPage might have errors. Check for:
- Missing imports
- Undefined variables
- Component rendering issues

### Fix 5: Clear Cache

Sometimes Vite cache causes issues:

```bash
# Stop server (Ctrl+C)
# Delete cache
rm -rf node_modules/.vite
# Restart
npm run dev
```

---

## 📋 DEBUGGING STEPS

1. **Open http://localhost:3000/test.html**
   - If this works → Backend is fine, frontend has issues
   - If this doesn't work → Backend has issues

2. **Check Browser Console (F12)**
   - Look for red errors
   - Share the error messages

3. **Check Network Tab (F12 → Network)**
   - Are JS/CSS files loading?
   - Any 404 errors?

4. **Try Simplified App**
   - Replace App.tsx with minimal version above
   - Reload page

---

## 🎯 QUICK FIX

If you just want to test the API:

```bash
# Test via command line
curl http://localhost:3000/api/domains
curl http://localhost:3000/api/gene-types
curl -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d "{\"domain\":\"character\",\"name\":\"Test\",\"genes\":{}}"
```

---

## 📞 NEXT STEPS

1. **Open http://localhost:3000/test.html** and tell me if it works
2. **Open browser console** (F12) and share any errors you see
3. **Try the simplified App.tsx** above and see if it renders

The backend is definitely working - the issue is in the React frontend rendering.
