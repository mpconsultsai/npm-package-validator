# Data Fetchers API

This directory contains modules for fetching package data from various sources.

## Data Sources

### 1. npm Registry (`npm-registry.ts`)
- **No API key required**
- Fetches package metadata, versions, dependencies
- Fetches download statistics

### 2. GitHub (`github.ts`)
- **Optional**: `GITHUB_TOKEN` for higher rate limits
- Fetches repository stats (stars, forks, issues)
- Fetches release information
- Rate limits: 60/hour (unauthenticated), 5000/hour (authenticated)

### 3. npms.io (`npmsio.ts`)
- **No API key required**
- Provides quality, popularity, and maintenance scores
- Rate limits: 200 requests/10 seconds

### 4. Snyk (`snyk.ts`)
- **Optional**: `SNYK_TOKEN` for vulnerability scanning
- Tests packages for security vulnerabilities
- Categorizes vulnerabilities by severity

## Usage

### Analyze a Single Package

```typescript
import { analyzePackage } from '@/lib/data-fetchers/package-analyzer';

const result = await analyzePackage('react');
console.log(result);
```

### Use Individual Fetchers

```typescript
import { fetchNpmPackageData } from '@/lib/data-fetchers/npm-registry';
import { fetchGitHubDataFromUrl } from '@/lib/data-fetchers/github';
import { fetchNpmsIoData } from '@/lib/data-fetchers/npmsio';

const npmData = await fetchNpmPackageData('lodash');
const npmsData = await fetchNpmsIoData('lodash');
```

## API Routes

### `GET /api/analyze?package=package-name`
Analyzes a package and returns comprehensive data from all sources.

**Example:**
```bash
curl "http://localhost:3000/api/analyze?package=react"
```

### `POST /api/analyze`
Same as GET but accepts package name in request body.

**Example:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"packageName": "react"}'
```

### `GET /api/health`
Health check endpoint that shows API status and which API keys are configured.

**Example:**
```bash
curl http://localhost:3000/api/health
```

## Error Handling

All fetchers handle errors gracefully:
- If a data source fails, it's logged in the `errors` object
- Missing API keys are handled without breaking the analysis
- The analysis continues even if some sources fail

## Rate Limiting

Be aware of rate limits:
- **npm Registry**: Very generous, no key needed
- **GitHub**: 60/hour without token, 5000/hour with token
- **npms.io**: 200 requests per 10 seconds
- **Snyk**: Depends on your plan
