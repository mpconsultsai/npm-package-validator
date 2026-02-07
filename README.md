# NPM Package Validator

A full-stack application that validates npm packages based on security, quality, and reliability criteria before installation.

## Features

- 🔒 **Security Analysis** - GitHub Advisory Database with intelligent filtering (excludes patched vulnerabilities)
- 📊 **Quality Metrics** - Custom quality score based on stars, downloads, maintenance, and security
- 🤖 **AI-Powered** - Triple-layer fallback (Gemini Flash → Flash-Lite → Groq) for maximum reliability
- 📈 **GitHub Integration** - Analyses stars, forks, issues, and repository activity
- 📦 **npm Registry** - Fetches download stats, package metadata, and README content
- 📝 **README Analysis** - Detects deprecation notices and maintenance warnings
- ⏰ **Release Tracking** - Shows days since last release

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **AI**: Google Gemini 2.5 (Flash + Flash-Lite) + Groq (Llama 3.3 70B)
- **APIs**: npm Registry, GitHub GraphQL, GitHub Advisory Database

## Key Improvements

### Smart Security Filtering
Only displays vulnerabilities that affect the **latest version** of a package. Historical vulnerabilities that have been patched are automatically excluded, giving users an accurate security assessment.

### AI Resilience
Triple-layer automatic fallback system ensures maximum uptime:
1. **Gemini Flash**: 20 requests/day (primary)
2. **Gemini Flash-Lite**: 20 requests/day (first fallback)
3. **Groq (Llama 3.3 70B)**: 14,400 requests/day (final fallback - 720x capacity!)

This provides effectively unlimited AI analysis for most users.

### Custom Quality Scoring
Replaced outdated npms.io (last updated 2023) with a real-time quality algorithm that considers:
- Current GitHub metrics
- Recent download statistics
- Active maintenance status
- Security posture

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google API Key (for Gemini - primary AI provider)
- Groq API Key (optional but recommended - provides 14,400 AI requests/day as fallback)
- GitHub Personal Access Token (optional, for higher rate limits on security scanning)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.local.example` to `.env.local` and add your API keys:

```bash
cp .env.local.example .env.local
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
npm-package-validator/
├── app/
│   ├── api/
│   │   ├── analyze/       # Standard package analysis
│   │   ├── analyze-ai/    # AI-powered analysis
│   │   └── health/        # API health check
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main analysis interface
│   └── globals.css        # Global styles
├── lib/
│   ├── ai/
│   │   └── analyzer.ts    # AI integration (Gemini + Groq) with triple-layer fallback
│   ├── data-fetchers/
│   │   ├── npm-registry.ts   # npm package & download data
│   │   ├── github.ts         # GitHub repository data
│   │   ├── security.ts       # Security vulnerability scanning
│   │   └── package-analyzer.ts  # Orchestrates all data sources
│   └── types/
│       └── package-data.ts   # TypeScript interfaces

```

## Development Status

- ✅ Next.js 15 setup with TypeScript and Tailwind CSS 4.0
- ✅ API data fetching layer (npm Registry, GitHub GraphQL, GitHub Advisory Database)
- ✅ Google Gemini 2.5 Flash AI with automatic Flash-Lite fallback
- ✅ Custom quality score algorithm (removed outdated npms.io dependency)
- ✅ Smart security filtering (excludes vulnerabilities already patched in latest version)
- ✅ README parsing for deprecation detection
- ✅ Interactive UI with color-coded severity badges and filtering
- ✅ Enhanced error handling and graceful AI degradation
- ✅ UK English localisation throughout

## API Endpoints

### Analysis Endpoints

- **`GET /api/analyze-ai?package=<name>`** - Full analysis with AI insights
  - Returns: Package info, metrics, security vulnerabilities, AI recommendations
  - Requires: `GOOGLE_API_KEY` environment variable
  - Features: Automatic Gemini Flash → Flash-Lite fallback on rate limits
  
- **`GET /api/analyze?package=<name>`** - Standard analysis (no AI)
  - Returns: Package info, metrics, security vulnerabilities
  - No API keys required (uses public APIs)
  
- **`GET /api/health`** - Health check
  - Returns: API status and configured environment variables

### Example Request

```bash
curl "http://localhost:3000/api/analyze-ai?package=react"
```

## Usage

Simply enter any npm package name (e.g., `react`, `express`, `lodash`) and click **Analyse Package** to get:

- **Package Information**: Name, latest version, license, days since last release
- **Metrics**: 
  - Monthly downloads
  - GitHub stars
  - Custom quality score (0-100) based on popularity, maintenance, and security
  - Security issues breakdown (Critical/High/Moderate/Low)
- **AI Analysis**: 
  - Intelligent recommendations (recommended/use-with-caution/not-recommended)
  - Key strengths and concerns
  - Overall AI score with security, quality, and maintenance ratings
  - Reasoning for the recommendation
- **Security Vulnerabilities**: 
  - Only shows issues affecting the latest version
  - Interactive color-coded severity badges with filtering
  - Detailed advisory information with GitHub links
- **Maintenance Detection**: 
  - Analyses README for deprecation notices
  - Considers publish/commit frequency
  - Flags unmaintained packages

## Quality Score Algorithm

The quality score (0-100) is calculated from:

1. **GitHub Stars** (30 points max)
   - 10,000+ stars: 30 pts
   - 5,000+: 25 pts
   - 1,000+: 20 pts
   - 500+: 15 pts
   - 100+: 10 pts

2. **Downloads** (25 points max)
   - 10M+/month: 25 pts
   - 1M+: 20 pts
   - 100K+: 15 pts
   - 10K+: 10 pts

3. **Maintenance** (25 points max)
   - Last release < 90 days: 25 pts
   - < 180 days: 20 pts
   - < 365 days: 15 pts
   - < 730 days: 10 pts

4. **Security** (20 points max)
   - 0 vulnerabilities: 20 pts
   - 1-2: 15 pts
   - 3-5: 10 pts
   - 6+: 5 pts

## Deployment

### Render
Use the included `render.yaml` or configure manually:
- **Type**: Web Service (not Static Site)
- **Build**: `npm install && npm run build`
- **Start**: `npm start`
- **Environment**: Add `GOOGLE_API_KEY`, `GROQ_API_KEY` (optional), and `GITHUB_TOKEN`

### Vercel
Automatic detection with `vercel.json` included. Add environment variables in project settings.

### Netlify
Use `netlify.toml` with `@netlify/plugin-nextjs`. Add environment variables in site settings.

## License

MIT
