# NPM Package Validator

A full-stack application that validates npm packages based on security, quality, and reliability criteria before installation.

## Features

- 🔒 **Security Analysis** - GitHub Advisory Database for vulnerability scanning
- 📊 **Quality Metrics** - Evaluates maintenance status, popularity, and code quality
- 🤖 **AI-Powered** - Uses Google Gemini 2.5 Flash for intelligent package analysis
- 📈 **GitHub Integration** - Analyzes stars, releases, and repository activity
- 📦 **npm Registry** - Fetches download stats and package metadata
- 📝 **README Analysis** - Detects deprecation notices and maintenance warnings
- ⏰ **Release Tracking** - Shows days since last release

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **AI**: Google Gemini 2.5 Flash
- **APIs**: npm Registry, GitHub GraphQL, npms.io, GitHub Advisory Database

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google API Key (for Gemini)
- GitHub Personal Access Token (optional, for higher rate limits)

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
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── lib/                   # Utility functions
│   ├── data-fetchers/    # API clients for external services
│   └── ai/               # LangChain + Gemini integration
└── types/                # TypeScript type definitions
```

## Development Status

- ✅ Next.js setup with TypeScript and Tailwind CSS 4.0
- ✅ API data fetching layer (npm, GitHub, npms.io, security)
- ✅ Google Gemini 2.5 Flash AI integration
- ✅ README parsing for deprecation detection
- ✅ Results page with comprehensive scoring system
- ✅ Enhanced UI with gradient design and responsive layout
- ✅ Error handling and graceful degradation

## API Endpoints

- `GET /api/analyze-ai?package=<name>` - Comprehensive package analysis with AI insights
- `GET /api/analyze?package=<name>` - Standard package analysis (no AI)
- `GET /api/health` - Check API status and configured keys

## Usage

Simply enter any npm package name (e.g., `react`, `express`, `lodash`) and click **Analyze Package** to get:

- **Package Information**: Latest version, release date, license
- **Metrics**: Downloads, GitHub stars, quality score, security issues
- **AI Analysis**: Intelligent recommendations, strengths, concerns, and ratings
- **Security**: Vulnerability scanning from GitHub Advisory Database
- **Maintenance**: README parsing for deprecation notices

## License

MIT
