import semver from "semver";
import type { GitHubReleaseData } from "@/lib/types/package-data";

export interface BreakingNoteItem {
  text: string;
  /** Optional commit / docs link extracted from the release note */
  url?: string;
}

export interface BreakingReleaseNote {
  version: string;
  tag: string;
  title: string;
  url?: string;
  items: BreakingNoteItem[];
  /** True when we only know it's a major bump, no explicit notes found */
  inferredMajor?: boolean;
}

/** Strip a leading v from tags like v18.2.0; also supports package@version tags. */
export function versionFromTag(
  tag: string,
  packageName?: string,
): string | null {
  const t = tag.trim();
  if (!t) return null;

  const clean = (raw: string) =>
    semver.clean(raw) ?? (semver.valid(raw) ? raw : null);

  if (packageName) {
    const prefix = `${packageName}@`;
    if (t.toLowerCase().startsWith(prefix.toLowerCase())) {
      return clean(t.slice(prefix.length));
    }
  }

  // name@version or @scope/name@version
  const at = t.lastIndexOf("@");
  if (at > 0) {
    const maybe = clean(t.slice(at + 1));
    if (maybe) return maybe;
  }

  return clean(t.replace(/^v/i, ""));
}

function stripMarkdownDecorations(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // images / badges
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → label
    .replace(/<\/?[^>]+>/g, "") // bare HTML
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMarkdownUrl(text: string): string | undefined {
  const nested = text.match(
    /\[(?:!\[[^\]]*\]\([^)]+\)|[^\]]+)\]\((https?:\/\/[^)\s]+)\)/,
  );
  if (nested?.[1]) return nested[1];
  const plain = text.match(
    /\((https?:\/\/(?:github\.com|angular\.dev)[^)\s]+)\)/i,
  );
  return plain?.[1];
}

function isBadgeLabel(text: string): boolean {
  return (
    /^fix\b/i.test(text) ||
    /^[a-f0-9]{7,40}$/i.test(text) ||
    /img\.shields\.io/i.test(text) ||
    /^badge$/i.test(text)
  );
}

function isNoise(text: string): boolean {
  if (text.length < 8) return true;
  if (/^#{1,6}\s/.test(text)) return true;
  if (
    /^(breaking changes?|migration|changelog|type|description|commit)\s*:?$/i.test(
      text,
    )
  ) {
    return true;
  }
  if (isBadgeLabel(text)) return true;
  if (/^:?-+:?$/.test(text)) return true;
  return false;
}

function parseTableRow(line: string): BreakingNoteItem | null {
  if (!line.includes("|")) return null;
  if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line)) return null;

  const cells = line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  if (cells.length < 2) return null;

  let url: string | undefined;
  const labels: string[] = [];

  for (const cell of cells) {
    const cellUrl = extractMarkdownUrl(cell);
    if (cellUrl && /github\.com\/[^/]+\/[^/]+\/commit\//i.test(cellUrl)) {
      url = cellUrl;
    } else if (cellUrl && !url) {
      url = cellUrl;
    }

    const label = stripMarkdownDecorations(cell);
    if (label && !isBadgeLabel(label) && !isNoise(label)) {
      labels.push(label);
    }
  }

  // Prefer the rightmost descriptive cell (Angular tables: commit | description)
  const text = labels[labels.length - 1];
  if (!text) return null;
  return { text, url };
}

function cleanLine(line: string): BreakingNoteItem | null {
  const tableItem = parseTableRow(line);
  if (tableItem) return tableItem;

  const url = extractMarkdownUrl(line);
  const text = stripMarkdownDecorations(line);
  if (!text || isNoise(text)) return null;
  return { text, url };
}

/**
 * Pull likely breaking-change bullets from a GitHub release body.
 */
export function extractBreakingItems(
  body: string | null | undefined,
): BreakingNoteItem[] {
  if (!body || !body.trim()) return [];

  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const items: BreakingNoteItem[] = [];
  let inBreakingSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (
      /^#{1,6}\s+.*breaking/i.test(line) ||
      /^breaking changes?\s*:?$/i.test(line)
    ) {
      inBreakingSection = true;
      continue;
    }

    if (inBreakingSection && /^#{1,6}\s+/.test(line) && !/breaking/i.test(line)) {
      inBreakingSection = false;
    }

    const looksBreaking =
      inBreakingSection ||
      /breaking\s*change/i.test(line) ||
      /\bBREAKING\b/.test(line) ||
      /⚠|⚠️/.test(line) ||
      /\bmigration guide\b/i.test(line) ||
      /\bthis (release|version) (includes )?breaking\b/i.test(line);

    if (!looksBreaking) continue;

    if (
      /^[-*+]\s+/.test(line) ||
      /^\d+\.\s+/.test(line) ||
      line.includes("|") ||
      inBreakingSection
    ) {
      const item = cleanLine(line);
      if (item) items.push(item);
      continue;
    }

    if (/breaking\s*change|⚠|⚠️|migration guide/i.test(line)) {
      const item = cleanLine(line);
      if (item) items.push(item);
    }
  }

  const seen = new Set<string>();
  const unique: BreakingNoteItem[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 24) break;
  }
  return unique;
}

export function collectBreakingNotes(input: {
  from: string;
  to: string;
  releases: GitHubReleaseData[];
  packageName?: string;
}): {
  notes: BreakingReleaseNote[];
  matchedReleases: number;
  scannedReleases: number;
} {
  const from = semver.clean(input.from) ?? (semver.valid(input.from) ? input.from : null);
  const to = semver.clean(input.to) ?? (semver.valid(input.to) ? input.to : null);
  if (!from || !to || !semver.lt(from, to)) {
    return { notes: [], matchedReleases: 0, scannedReleases: input.releases.length };
  }

  const notes: BreakingReleaseNote[] = [];
  let matchedReleases = 0;

  for (const release of input.releases) {
    if (release.draft || release.prerelease) continue;
    const version = versionFromTag(release.tag_name, input.packageName);
    if (!version) continue;
    if (!semver.gt(version, from) || !semver.lte(version, to)) continue;
    matchedReleases += 1;

    const items = extractBreakingItems(release.body);
    const isMajorLine =
      semver.minor(version) === 0 && semver.patch(version) === 0;

    if (items.length === 0 && !isMajorLine) continue;

    notes.push({
      version,
      tag: release.tag_name,
      title: release.name || release.tag_name,
      url: release.html_url,
      items:
        items.length > 0
          ? items
          : [
              {
                text: "Major release — treat as potentially breaking (no explicit breaking-change notes found in the GitHub release body).",
              },
            ],
      inferredMajor: items.length === 0 && isMajorLine,
    });
  }

  notes.sort((a, b) => semver.compare(a.version, b.version));
  return {
    notes,
    matchedReleases,
    scannedReleases: input.releases.length,
  };
}

export type PeerChange =
  | { kind: "added"; name: string; range: string }
  | { kind: "removed"; name: string; range: string }
  | { kind: "changed"; name: string; from: string; to: string };

export function diffPeerDependencies(
  fromPeers?: Record<string, string> | null,
  toPeers?: Record<string, string> | null,
): PeerChange[] {
  const a = fromPeers ?? {};
  const b = toPeers ?? {};
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changes: PeerChange[] = [];

  for (const name of [...names].sort((x, y) =>
    x.localeCompare(y, undefined, { sensitivity: "base" }),
  )) {
    const left = a[name];
    const right = b[name];
    if (left && !right) {
      changes.push({ kind: "removed", name, range: left });
    } else if (!left && right) {
      changes.push({ kind: "added", name, range: right });
    } else if (left && right && left !== right) {
      changes.push({ kind: "changed", name, from: left, to: right });
    }
  }
  return changes;
}
