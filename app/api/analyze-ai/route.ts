import { NextRequest, NextResponse } from 'next/server';
import { analyzePackage } from '@/lib/data-fetchers/package-analyzer';
import { analyzePackageWithAI } from '@/lib/ai/analyzer';

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
      },
      metrics: {
        downloads: packageData.downloads?.downloads || 0,
        stars: packageData.github?.stars || 0,
        qualityScore: packageData.npmsio?.score?.final 
          ? Math.round(packageData.npmsio.score.final * 100) 
          : 0,
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
      },
      metrics: {
        downloads: packageData.downloads?.downloads || 0,
        stars: packageData.github?.stars || 0,
        qualityScore: packageData.npmsio?.score?.final 
          ? Math.round(packageData.npmsio.score.final * 100) 
          : 0,
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
