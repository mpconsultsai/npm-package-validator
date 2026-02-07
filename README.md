# NPM Package Validator

A full-stack application that validates npm packages based on security, quality, and reliability criteria before installation.

## Features

- 🔒 **Security Analysis** - Checks for vulnerabilities using Snyk and other sources
- 📊 **Quality Metrics** - Evaluates maintenance status, popularity, and code quality
- 🤖 **AI-Powered** - Uses Google Gemini and LangChain for intelligent analysis
- 📈 **GitHub Integration** - Analyzes stars, releases, and repository activity
- 📦 **npm Registry** - Fetches download stats and package metadata

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Gemini + LangChain
- **APIs**: npm Registry, GitHub, Snyk/npms.io, Libraries.io

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

## Development Roadmap

- [x] Step 1: Next.js setup with TypeScript and Tailwind
- [x] Step 2: API data fetching layer ✅
- [ ] Step 3: LangChain + Gemini integration
- [ ] Step 4: Results page and scoring system
- [ ] Step 5: Enhanced UI and error handling

## API Endpoints

- `GET/POST /api/analyze?package=<name>` - Analyze an npm package
- `GET /api/health` - Check API status and configured keys

See [API_SETUP_GUIDE.md](./API_SETUP_GUIDE.md) for detailed setup instructions.

## License

MIT
