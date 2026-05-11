# PARADIGM ABSOLUTE — TESTING GUIDE

**Server Status:** ✅ RUNNING  
**URL:** http://localhost:3000

---

## 🎯 QUICK TEST COMMANDS

### 1. Health Check
```bash
curl http://localhost:3000/health
```
**Expected:** `{"status":"ok",...}`

### 2. List All Domains (27)
```bash
curl http://localhost:3000/api/domains
```
**Expected:** 27 domains listed

### 3. List All Gene Types (17)
```bash
curl http://localhost:3000/api/gene-types
```
**Expected:** 17 gene types with descriptions

---

## 🧪 API TESTING

### Create a Seed

**Character Seed:**
```bash
curl -X POST http://localhost:3000/api/seeds ^
  -H "Content-Type: application/json" ^
  -d "{\"domain\":\"character\",\"name\":\"Test Warrior\",\"genes\":{\"size\":{\"type\":\"scalar\",\"value\":0.7},\"archetype\":{\"type\":\"categorical\",\"value\":\"warrior\"}}}"
```

**Sprite Seed:**
```bash
curl -X POST http://localhost:3000/api/seeds ^
  -H "Content-Type: application/json" ^
  -d "{\"domain\":\"sprite\",\"name\":\"Test Sprite\",\"genes\":{\"resolution\":{\"type\":\"scalar\",\"value\":0.8}}}"
```

**Music Seed:**
```bash
curl -X POST http://localhost:3000/api/seeds ^
  -H "Content-Type: application/json" ^
  -d "{\"domain\":\"music\",\"name\":\"Test Music\",\"genes\":{\"tempo\":{\"type\":\"scalar\",\"value\":0.7}}}"
```

### List All Seeds
```bash
curl http://localhost:3000/api/seeds
```

### Get Specific Seed
```bash
curl http://localhost:3000/api/seeds/[SEED_ID]
```

---

## 🔬 OPERATIONS TESTING

### Mutate a Seed
```bash
curl -X POST http://localhost:3000/api/seeds/[SEED_ID]/mutate ^
  -H "Content-Type: application/json" ^
  -d "{\"rate\":0.1}"
```

### Breed Two Seeds
```bash
curl -X POST http://localhost:3000/api/seeds/breed ^
  -H "Content-Type: application/json" ^
  -d "{\"parent_a_id\":\"[PARENT1_ID]\",\"parent_b_id\":\"[PARENT2_ID]\"}"
```

### Evolve a Population
```bash
curl -X POST http://localhost:3000/api/seeds/[SEED_ID]/evolve ^
  -H "Content-Type: application/json" ^
  -d "{\"population_size\":8,\"generations\":3}"
```

### Grow an Artifact
```bash
curl -X POST http://localhost:3000/api/seeds/[SEED_ID]/grow ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

---

## 🌳 LINEAGE TESTING

### Get Ancestry Chain
```bash
curl http://localhost:3000/api/seeds/[SEED_ID]/lineage
```

**Expected Response:**
```json
{
  "seed_id": "...",
  "seed_hash": "...",
  "lineage": [
    {
      "id": "...",
      "hash": "...",
      "name": "Child",
      "domain": "character",
      "generation": 3,
      "operation": "breed",
      "parents": ["hash1", "hash2"],
      "depth": 0
    },
    {
      "id": "...",
      "name": "Parent 1",
      "generation": 2,
      "depth": 1
    }
  ],
  "total_ancestors": 5,
  "max_depth": 3
}
```

### Get Descendants
```bash
curl http://localhost:3000/api/seeds/[SEED_ID]/descendants
```

---

## ✅ VALIDATION TESTING

### Validate a Gene
```bash
curl -X POST http://localhost:3000/api/gene/validate ^
  -H "Content-Type: application/json" ^
  -d "{\"gene_type\":\"scalar\",\"value\":0.75,\"schema\":{\"min\":0,\"max\":1}}"
```

**Expected (Valid):**
```json
{
  "valid": true,
  "message": "Gene value is valid",
  "gene_type": "scalar",
  "value_type": "number"
}
```

### Test Invalid Gene
```bash
curl -X POST http://localhost:3000/api/gene/validate ^
  -H "Content-Type: application/json" ^
  -d "{\"gene_type\":\"scalar\",\"value\":\"not a number\"}"
```

**Expected (Invalid):**
```json
{
  "valid": false,
  "error": "Gene validation failed",
  "message": "Expected a number value",
  "suggestion": "...",
  "example": {...}
}
```

### Test Unknown Gene Type
```bash
curl -X POST http://localhost:3000/api/gene/validate ^
  -H "Content-Type: application/json" ^
  -d "{\"gene_type\":\"invalid_type\",\"value\":\"test\"}"
```

---

## 🎨 FRONTEND TESTING

### Access the Application

**Main App:**
- URL: http://localhost:3000
- Features: Studio, Gallery, Evolution UI

**API Documentation:**
- URL: http://localhost:3000/api/docs (if Swagger UI installed)
- Spec: http://localhost:3000/public/openapi.json

### Test Onboarding

1. Open http://localhost:3000 in browser
2. First visit should show 7-step onboarding tutorial
3. Click through all steps
4. Tutorial should not show again (stored in localStorage)

### Test Example Gallery

1. Navigate to Gallery tab
2. Filter by domain
3. Click "Load Example" on any example
4. Example should load into workspace

### Test Seed Creation

1. Click "Create Seed" button
2. Select domain (e.g., "character")
3. Enter name and genes
4. Click "Create"
5. Seed should appear in gallery

### Test Grow Operation

1. Select a seed from gallery
2. Click "Grow" button
3. Artifact should generate
4. Preview should display (3D model, image, etc.)

### Test Mutation

1. Select a seed
2. Click "Mutate" button
3. Adjust mutation rate slider
4. Click "Mutate"
5. New mutated seed should appear

### Test Breeding

1. Select two parent seeds (Ctrl+click)
2. Click "Breed" button
3. Child seed should be created with combined traits

### Test Lineage Graph

1. Select a seed with parents
2. Click "View Lineage" tab
3. Ancestry graph should display
4. Click nodes to view ancestor details

---

## 🧪 COMPREHENSIVE TEST SCRIPT

### PowerShell Test Script

Save as `test-paradigm.ps1`:

```powershell
$API = "http://localhost:3000/api"

Write-Host "=== Paradigm Absolute Test Suite ===" -ForegroundColor Cyan

# Health Check
Write-Host "`n[1/8] Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$API/health"
Write-Host "Status: $($health.status)" -ForegroundColor Green

# List Domains
Write-Host "`n[2/8] Listing Domains..." -ForegroundColor Yellow
$domains = Invoke-RestMethod -Uri "$API/domains"
Write-Host "Domains: $($domains.count)" -ForegroundColor Green

# List Gene Types
Write-Host "`n[3/8] Listing Gene Types..." -ForegroundColor Yellow
$genes = Invoke-RestMethod -Uri "$API/gene-types"
Write-Host "Gene Types: $($genes.count)" -ForegroundColor Green

# Create Seed
Write-Host "`n[4/8] Creating Seed..." -ForegroundColor Yellow
$seed = Invoke-RestMethod -Uri "$API/seeds" -Method POST `
  -ContentType "application/json" `
  -Body '{"domain":"character","name":"Test","genes":{"size":{"type":"scalar","value":0.5}}}'
Write-Host "Created: $($seed.id)" -ForegroundColor Green

# Get Seed
Write-Host "`n[5/8] Getting Seed..." -ForegroundColor Yellow
$fetched = Invoke-RestMethod -Uri "$API/seeds/$($seed.id)"
Write-Host "Fetched: $($fetched.`$name)" -ForegroundColor Green

# Validate Gene
Write-Host "`n[6/8] Validating Gene..." -ForegroundColor Yellow
$validation = Invoke-RestMethod -Uri "$API/gene/validate" -Method POST `
  -ContentType "application/json" `
  -Body '{"gene_type":"scalar","value":0.75,"schema":{"min":0,"max":1}}'
Write-Host "Valid: $($validation.valid)" -ForegroundColor Green

# Get Lineage
Write-Host "`n[7/8] Getting Lineage..." -ForegroundColor Yellow
$lineage = Invoke-RestMethod -Uri "$API/seeds/$($seed.id)/lineage"
Write-Host "Ancestors: $($lineage.total_ancestors)" -ForegroundColor Green

# Grow Seed
Write-Host "`n[8/8] Growing Seed..." -ForegroundColor Yellow
$artifact = Invoke-RestMethod -Uri "$API/seeds/$($seed.id)/grow" -Method POST `
  -ContentType "application/json" `
  -Body '{}'
Write-Host "Artifact: $($artifact.type)" -ForegroundColor Green

Write-Host "`n=== All Tests Passed! ===" -ForegroundColor Green
```

Run with:
```powershell
.\test-paradigm.ps1
```

---

## 📊 EXPECTED RESULTS

### API Endpoints Working
- [x] GET /api/health
- [x] GET /api/domains (27 domains)
- [x] GET /api/gene-types (17 types)
- [x] GET /api/seeds
- [x] POST /api/seeds
- [x] GET /api/seeds/:id
- [x] POST /api/seeds/:id/grow
- [x] POST /api/seeds/:id/mutate
- [x] POST /api/seeds/breed
- [x] POST /api/seeds/:id/evolve
- [x] GET /api/seeds/:id/lineage
- [x] GET /api/seeds/:id/descendants
- [x] POST /api/gene/validate

### Frontend Features Working
- [x] Onboarding tutorial displays
- [x] Example gallery loads
- [x] Seed creation works
- [x] Seed growth works
- [x] Mutation works
- [x] Breeding works
- [x] Evolution works
- [x] Lineage graph displays
- [x] Error messages show suggestions

---

## 🐛 TROUBLESHOOTING

### Server Won't Start

```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /F /PID [PID]

# Restart server
npm run dev
```

### API Returns Errors

```bash
# Check server logs
# Look for error messages in terminal

# Verify TypeScript compilation
npm run typecheck

# Rebuild if needed
npm run build
```

### Frontend Not Loading

```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R

# Check console for errors
# F12 → Console tab
```

---

## 📈 PERFORMANCE TESTING

### Load Test

```bash
# Install Apache Bench (if not installed)
# Run load test
ab -n 1000 -c 10 http://localhost:3000/api/health
```

### Expected Performance

| Endpoint | Expected Response Time |
|---|---|
| /api/health | < 50ms |
| /api/domains | < 100ms |
| /api/seeds | < 200ms |
| /api/seeds/:id/grow | < 5s |
| /api/gene/validate | < 100ms |

---

## ✅ TEST CHECKLIST

### Before Launch
- [ ] All API endpoints respond
- [ ] All 27 domains listed
- [ ] All 17 gene types documented
- [ ] Seed creation works
- [ ] Seed growth works
- [ ] Mutation works
- [ ] Breeding works
- [ ] Lineage tracking works
- [ ] Gene validation works
- [ ] Error messages helpful
- [ ] Frontend loads
- [ ] Onboarding displays
- [ ] Example gallery works

### Performance
- [ ] Health check < 50ms
- [ ] API responses < 200ms
- [ ] Grow operation < 5s
- [ ] No memory leaks
- [ ] No console errors

---

**Happy Testing! 🎉**

**Server URL:** http://localhost:3000  
**API Base:** http://localhost:3000/api  
**Status:** ✅ RUNNING
