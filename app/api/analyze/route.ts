import { NextRequest, NextResponse } from 'next/server';
import { analyzePackage } from '@/lib/data-fetchers/package-analyzer';

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

    console.log(`Analyzing package: ${packageName}`);
    const analysis = await analyzePackage(packageName);

    return NextResponse.json(analysis, { status: 200 });
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

    console.log(`Analyzing package: ${packageName}`);
    const analysis = await analyzePackage(packageName);

    return NextResponse.json(analysis, { status: 200 });
  } catch (error: any) {
    console.error('Error analyzing package:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze package' },
      { status: 500 }
    );
  }
}
