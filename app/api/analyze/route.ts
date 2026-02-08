import { NextRequest, NextResponse } from 'next/server';
import { analyzePackage } from '@/lib/data-fetchers/package-analyzer';
import { validatePackageName, extractPackageName } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packageName = extractPackageName(searchParams.get('package') || '');

    if (!packageName) {
      return NextResponse.json(
        { error: 'Package name is required. Use ?package=package-name' },
        { status: 400 }
      );
    }

    const validation = validatePackageName(packageName);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
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
    const packageName = extractPackageName(body.packageName || '');

    if (!packageName) {
      return NextResponse.json(
        { error: 'Package name is required' },
        { status: 400 }
      );
    }

    const validation = validatePackageName(packageName);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
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
