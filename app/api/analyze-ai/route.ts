import { NextRequest, NextResponse } from 'next/server';
import { analyzePackage } from '@/lib/data-fetchers/package-analyzer';
import { analyzePackageWithAI } from '@/lib/ai/analyzer';
import type { PackageAnalysisResult } from '@/lib/types/package-data';

/**
 * Calculate a custom quality score based on multiple factors
 */
function calculateQualityScore(packageData: PackageAnalysisResult): number {
  let score = 0;
  let factors = 0;

  // GitHub stars (0-25 points) or dependents (0-25 points) - use whichever is higher for popularity
  const starsScore = packageData.github?.stars !== undefined
    ? (packageData.github.stars >= 5000 ? 25 : packageData.github.stars >= 1000 ? 22 : packageData.github.stars >= 500 ? 18 : packageData.github.stars >= 100 ? 14 : packageData.github.stars >= 10 ? 10 : 5)
    : 0;
  const dependentsScore = packageData.popularity?.dependents
    ? (packageData.popularity.dependents >= 10000 ? 25 : packageData.popularity.dependents >= 1000 ? 22 : packageData.popularity.dependents >= 100 ? 18 : packageData.popularity.dependents >= 10 ? 14 : 5)
    : 0;
  if (starsScore > 0 || dependentsScore > 0) {
    score += Math.max(starsScore, dependentsScore);
    factors++;
  }

  // Downloads (0-25 points)
  if (packageData.downloads?.downloads) {
    const downloads = packageData.downloads.downloads;
    if (downloads >= 10000000) score += 25;
    else if (downloads >= 1000000) score += 20;
    else if (downloads >= 100000) score += 15;
    else if (downloads >= 10000) score += 10;
    else score += 5;
    factors++;
  }

  // Maintenance - days since last release (0-25 points)
  if (packageData.npm?.time && packageData.npm.version) {
    const lastPublished = packageData.npm.time[packageData.npm.version];
    if (lastPublished) {
      const daysSince = Math.floor((Date.now() - new Date(lastPublished).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 90) score += 25;
      else if (daysSince < 180) score += 20;
      else if (daysSince < 365) score += 15;
      else if (daysSince < 730) score += 10;
      else score += 5;
      factors++;
    }
  }

  // Security (0-20 points) - deduct for issues
  if (packageData.security) {
    const issues = packageData.security.totalCount || 0;
    if (issues === 0) score += 20;
    else if (issues <= 2) score += 15;
    else if (issues <= 5) score += 10;
    else score += 5;
    factors++;
  }

  // Calculate final score as percentage
  return factors > 0 ? Math.round((score / (factors * 25)) * 100) : 0;
}

/**
 * Enhanced package analysis with AI insights
 * GET/POST /api/analyze-ai?package=package-name
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packageName = searchParams.get('package');

    if (!packageName) {
      return NextResponse.json(
        { error: 'Package name is required. Use ?package=package-name' },
        { status: 400 }
      );
    }

    // Validate package name format
    const validPackageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    if (!validPackageNameRegex.test(packageName)) {
      return NextResponse.json(
        { error: 'Invalid package name format' },
        { status: 400 }
      );
    }

    console.log(`Analyzing package with AI: ${packageName}`);
    
    // Step 1: Fetch all package data
    const packageData = await analyzePackage(packageName);

    // Step 2: Generate AI analysis
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzePackageWithAI(packageData);
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      // Continue without AI if it fails
      packageData.errors = {
        ...packageData.errors,
        ai: error.message,
      };
    }

    // Step 3: Combine results with enhanced package info
    // Calculate days since last release
    let daysSinceLastRelease = null;
    if (packageData.npm?.time && packageData.npm?.version) {
      const lastPublished = packageData.npm.time[packageData.npm.version];
      if (lastPublished) {
        daysSinceLastRelease = Math.floor(
          (Date.now() - new Date(lastPublished).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    const response = {
      ...packageData,
      ai: aiAnalysis,
      packageInfo: {
        name: packageName,
        latestVersion: packageData.npm?.version || 'Unknown',
        license: packageData.npm?.license || 'Unknown',
        npmUrl: `https://www.npmjs.com/package/${packageName}`,
        description: packageData.npm?.description || '',
        homepage: packageData.npm?.homepage,
        repository: packageData.npm?.repository?.url,
        daysSinceLastRelease,
        dependents: packageData.popularity?.dependents,
        popularityScore: packageData.popularity?.popularityScore,
      },
      metrics: {
        downloads: packageData.downloads?.downloads || 0,
        stars: packageData.github?.stars || 0,
        openIssues: packageData.github?.open_issues || 0,
        qualityScore: calculateQualityScore(packageData),
        securityIssues: packageData.security?.totalCount || 0,
        ...(aiAnalysis?.overallScore ? { aiScore: aiAnalysis.overallScore } : {}),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error analyzing package:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze package' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageName } = body;

    if (!packageName) {
      return NextResponse.json(
        { error: 'Package name is required' },
        { status: 400 }
      );
    }

    // Validate package name format
    const validPackageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    if (!validPackageNameRegex.test(packageName)) {
      return NextResponse.json(
        { error: 'Invalid package name format' },
        { status: 400 }
      );
    }

    console.log(`Analyzing package with AI: ${packageName}`);
    
    // Step 1: Fetch all package data
    const packageData = await analyzePackage(packageName);

    // Step 2: Generate AI analysis
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzePackageWithAI(packageData);
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      packageData.errors = {
        ...packageData.errors,
        ai: error.message,
      };
    }

    // Step 3: Combine results with enhanced package info
    // Calculate days since last release
    let daysSinceLastRelease = null;
    if (packageData.npm?.time && packageData.npm?.version) {
      const lastPublished = packageData.npm.time[packageData.npm.version];
      if (lastPublished) {
        daysSinceLastRelease = Math.floor(
          (Date.now() - new Date(lastPublished).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    const response = {
      ...packageData,
      ai: aiAnalysis,
      packageInfo: {
        name: packageName,
        latestVersion: packageData.npm?.version || 'Unknown',
        license: packageData.npm?.license || 'Unknown',
        npmUrl: `https://www.npmjs.com/package/${packageName}`,
        description: packageData.npm?.description || '',
        homepage: packageData.npm?.homepage,
        repository: packageData.npm?.repository?.url,
        daysSinceLastRelease,
        dependents: packageData.popularity?.dependents,
        popularityScore: packageData.popularity?.popularityScore,
      },
      metrics: {
        downloads: packageData.downloads?.downloads || 0,
        stars: packageData.github?.stars || 0,
        openIssues: packageData.github?.open_issues || 0,
        qualityScore: calculateQualityScore(packageData),
        securityIssues: packageData.security?.totalCount || 0,
        ...(aiAnalysis?.overallScore ? { aiScore: aiAnalysis.overallScore } : {}),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error analyzing package:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze package' },
      { status: 500 }
    );
  }
}
