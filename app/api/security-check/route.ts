import { NextRequest, NextResponse } from 'next/server';
import { checkPackageSecurity } from '@/lib/data-fetchers/security';

/**
 * Check security advisories for a specific package version
 * GET /api/security-check?package=react&version=18.2.0
 * POST /api/security-check { "packageName": "react", "version": "18.2.0" }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packageName = searchParams.get('package');
    const version = searchParams.get('version');

    if (!packageName) {
      return NextResponse.json(
        { error: 'Package name is required. Use ?package=package-name' },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: 'Version is required. Use ?version=1.0.0' },
        { status: 400 }
      );
    }

    const validPackageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    if (!validPackageNameRegex.test(packageName)) {
      return NextResponse.json(
        { error: 'Invalid package name format' },
        { status: 400 }
      );
    }

    const security = await checkPackageSecurity(packageName, version);

    return NextResponse.json({
      packageName,
      version,
      security,
    });
  } catch (error: any) {
    console.error('Security check failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check package security' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageName, version } = body;

    if (!packageName) {
      return NextResponse.json(
        { error: 'packageName is required' },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: 'version is required' },
        { status: 400 }
      );
    }

    const validPackageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    if (!validPackageNameRegex.test(packageName)) {
      return NextResponse.json(
        { error: 'Invalid package name format' },
        { status: 400 }
      );
    }

    const security = await checkPackageSecurity(packageName, version);

    return NextResponse.json({
      packageName,
      version,
      security,
    });
  } catch (error: any) {
    console.error('Security check failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check package security' },
      { status: 500 }
    );
  }
}
