import { NextResponse } from 'next/server';

/**
 * Health check endpoint to verify API is running
 * Also checks which API keys are configured
 */
export async function GET() {
  const apiKeys = {
    google: !!process.env.GOOGLE_API_KEY,
    github: !!process.env.GITHUB_TOKEN,
  };

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeys,
    message: 'API is running',
  });
}
