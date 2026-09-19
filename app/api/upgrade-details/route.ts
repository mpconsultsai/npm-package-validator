import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import semver from "semver";
import {
  fetchGitHubReleaseByTag,
  fetchGitHubReleases,
  parseGitHubUrl,
} from "@/lib/data-fetchers/github";
import { fetchNpmPackageData } from "@/lib/data-fetchers/npm-registry";
import { extractPackageName, validatePackageName } from "@/lib/validation";
import {
  collectBreakingNotes,
  diffPeerDependencies,
  type BreakingReleaseNote,
} from "@/lib/upgrade-release-notes";
import {
  extractChangelogBreakingNotes,
  fetchPackageChangelog,
} from "@/lib/upgrade-changelog";
import { listStableVersions } from "@/lib/upgrade-advisor";
import type { GitHubReleaseData } from "@/lib/types/package-data";

async function fetchVersionPeers(
  packageName: string,
  version: string,
): Promise<Record<string, string> | null> {
  try {
    const encodedName = packageName.startsWith("@")
      ? packageName.replace("/", "%2F")
      : packageName;
    const response = await axios.get(
      `https://registry.npmjs.org/${encodedName}/${encodeURIComponent(version)}`,
      { timeout: 12_000 },
    );
    const peers = response.data?.peerDependencies;
    if (peers && typeof peers === "object") {
      return peers as Record<string, string>;
    }
    return {};
  } catch {
    return null;
  }
}

/** Key versions to fetch by tag: target + first release of each crossed major. */
function keyVersionsForNotes(
  from: string,
  to: string,
  allVersions: string[],
): string[] {
  const fromClean = semver.clean(from) ?? (semver.valid(from) ? from : null);
  const toClean = semver.clean(to) ?? (semver.valid(to) ? to : null);
  if (!fromClean || !toClean || !semver.lt(fromClean, toClean)) return [];

  const keys = new Set<string>([toClean]);
  const fromMajor = semver.major(fromClean);
  const toMajor = semver.major(toClean);

  for (let major = fromMajor + 1; major <= toMajor; major++) {
    const firstOfMajor = [...allVersions]
      .reverse()
      .find((v) => semver.valid(v) && semver.major(v) === major);
    if (
      firstOfMajor &&
      semver.gt(firstOfMajor, fromClean) &&
      semver.lte(firstOfMajor, toClean)
    ) {
      keys.add(firstOfMajor);
    }
    const zero = `${major}.0.0`;
    if (
      allVersions.includes(zero) &&
      semver.gt(zero, fromClean) &&
      semver.lte(zero, toClean)
    ) {
      keys.add(zero);
    }
  }

  return [...keys].sort((a, b) => semver.compare(a, b)).slice(0, 8);
}

function mergeReleases(batches: GitHubReleaseData[][]): GitHubReleaseData[] {
  const byTag = new Map<string, GitHubReleaseData>();
  for (const batch of batches) {
    for (const release of batch) {
      const key = release.tag_name.toLowerCase();
      const existing = byTag.get(key);
      if (!existing || (release.body && !existing.body)) {
        byTag.set(key, release);
      }
    }
  }
  return [...byTag.values()];
}

function mergeNotes(
  primary: BreakingReleaseNote[],
  secondary: BreakingReleaseNote[],
): BreakingReleaseNote[] {
  const byVersion = new Map<string, BreakingReleaseNote>();
  for (const note of [...secondary, ...primary]) {
    const existing = byVersion.get(note.version);
    if (!existing) {
      byVersion.set(note.version, note);
      continue;
    }
    // Prefer notes with real (non-inferred) items
    const existingScore =
      (existing.inferredMajor ? 0 : existing.items.length) +
      (existing.url ? 0.5 : 0);
    const nextScore =
      (note.inferredMajor ? 0 : note.items.length) + (note.url ? 0.5 : 0);
    if (nextScore >= existingScore) byVersion.set(note.version, note);
  }
  return [...byVersion.values()].sort((a, b) =>
    semver.compare(a.version, b.version),
  );
}

/**
 * GET /api/upgrade-details?package=next&from=14.0.0&to=15.1.0
 * Breaking-change notes from GitHub releases / CHANGELOG + peerDependency diff.
 */
export async function GET(request: NextRequest) {
  try {
    const packageName = extractPackageName(
      request.nextUrl.searchParams.get("package") || "",
    );
    const from = (request.nextUrl.searchParams.get("from") || "").trim();
    const to = (request.nextUrl.searchParams.get("to") || "").trim();

    if (!packageName) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 },
      );
    }
    const validation = validatePackageName(packageName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    if (!from || !to) {
      return NextResponse.json(
        { error: "Both from and to versions are required" },
        { status: 400 },
      );
    }

    const { data: npm } = await fetchNpmPackageData(packageName);
    const repoUrl = npm.repository?.url;
    const directory = npm.repository?.directory;
    const parsed = repoUrl ? parseGitHubUrl(repoUrl) : null;
    const allVersions = listStableVersions(npm.time);

    const [peerPair, recentReleases, taggedReleases, changelog] =
      await Promise.all([
        Promise.all([
          fetchVersionPeers(packageName, from),
          fetchVersionPeers(packageName, to),
        ]),
        parsed
          ? fetchGitHubReleases(parsed.owner, parsed.repo, 100, {
              includeBody: true,
            }).catch(() => [] as GitHubReleaseData[])
          : Promise.resolve([] as GitHubReleaseData[]),
        parsed
          ? Promise.all(
              keyVersionsForNotes(from, to, allVersions).map((version) =>
                fetchGitHubReleaseByTag(
                  parsed.owner,
                  parsed.repo,
                  version,
                  packageName,
                ),
              ),
            ).then((rows) =>
              rows.filter((r): r is GitHubReleaseData => Boolean(r)),
            )
          : Promise.resolve([] as GitHubReleaseData[]),
        parsed
          ? fetchPackageChangelog({
              owner: parsed.owner,
              repo: parsed.repo,
              directory,
            })
          : Promise.resolve(null),
      ]);

    const [fromPeers, toPeers] = peerPair;
    const peerChanges =
      fromPeers && toPeers ? diffPeerDependencies(fromPeers, toPeers) : [];

    const releases = mergeReleases([recentReleases, taggedReleases]);
    const fromGithub = collectBreakingNotes({
      from,
      to,
      releases,
      packageName,
    });

    const changelogUrl =
      parsed && changelog
        ? `https://github.com/${parsed.owner}/${parsed.repo}/blob/${changelog.branch}/${changelog.path}`
        : null;

    const fromChangelog = changelog
      ? extractChangelogBreakingNotes({
          changelog: changelog.markdown,
          from,
          to,
          packageName,
          changelogUrl: changelogUrl ?? undefined,
        })
      : [];

    const notes = mergeNotes(fromGithub.notes, fromChangelog);
    const source =
      fromChangelog.length > 0 && fromGithub.notes.length === 0
        ? "changelog"
        : fromChangelog.length > 0
          ? "mixed"
          : fromGithub.notes.length > 0
            ? "github-releases"
            : "none";

    const compareUrl =
      parsed && from !== to
        ? `https://github.com/${parsed.owner}/${parsed.repo}/compare/${encodeURIComponent(`${packageName}@${from.replace(/^v/i, "")}`)}...${encodeURIComponent(`${packageName}@${to.replace(/^v/i, "")}`)}`
        : null;

    const releasesUrl = parsed
      ? `https://github.com/${parsed.owner}/${parsed.repo}/releases`
      : null;

    return NextResponse.json({
      packageName,
      from,
      to,
      github: parsed
        ? {
            owner: parsed.owner,
            repo: parsed.repo,
            directory: directory ?? null,
            compareUrl,
            releasesUrl,
            changelogUrl,
          }
        : null,
      breaking: {
        notes,
        matchedReleases: fromGithub.matchedReleases,
        scannedReleases: fromGithub.scannedReleases,
        changelogVersions: fromChangelog.length,
        source,
        hasNotes: notes.some((n) => n.items.length > 0 && !n.inferredMajor),
      },
      peers: {
        available: Boolean(fromPeers && toPeers),
        changes: peerChanges,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load upgrade details";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
