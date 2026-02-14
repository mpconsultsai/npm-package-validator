import { NextRequest, NextResponse } from 'next/server';
import { fetchNpmPackageData, fetchSimilarPackages } from '@/lib/data-fetchers/npm-registry';
import { extractPackageName, validatePackageName } from '@/lib/validation';

/**
 * GET /api/similar-packages?package=react
 * GET /api/similar-packages?package=react&keywords=react,ui
 * Returns packages similar to the given one (same keywords/category).
 * If keywords are provided, skips fetching package metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('package') || '';
    const packageName = extractPackageName(raw);
    const keywordsParam = request.nextUrl.searchParams.get('keywords');
    const keywords = keywordsParam
      ? keywordsParam.split(',').map((k) => k.trim()).filter(Boolean)
      : null;

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

    let keywordList = keywords;
    if (!keywordList?.length) {
      const npmData = await fetchNpmPackageData(packageName);
      keywordList = npmData.keywords ?? null;
    }

    const similar = await fetchSimilarPackages(
      packageName,
      keywordList,
      6
    );

    return NextResponse.json({ packages: similar }, { status: 200 });
  } catch (error: any) {
    console.error('Similar packages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch similar packages' },
      { status: 500 }
    );
  }
}
