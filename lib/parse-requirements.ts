import { validatePackageNameForEcosystem } from "@/lib/validation";
import {
  parseDependencyList,
  PASTE_LIST_MAX_PACKAGES,
  type ParsedDependency,
  type ParseDependencyListResult,
} from "@/lib/parse-dependency-list";

const SKIP_LINE =
  /^\s*(-r|--requirement|-c|-e|-f|--find-links|-i|--index-url|--extra-index-url|--trusted-host)\s/i;

/** Strip PEP 508 environment marker and comments. */
function stripRequirementLine(raw: string): string {
  let line = raw.trim();
  if (!line || line.startsWith("#")) return "";
  const hash = line.indexOf("#");
  if (hash >= 0) line = line.slice(0, hash).trim();
  const marker = line.indexOf(";");
  if (marker >= 0) line = line.slice(0, marker).trim();
  return line;
}

function parsePep508NameAndSpec(line: string): ParsedDependency | null {
  let rest = line.trim();
  if (!rest || SKIP_LINE.test(rest)) return null;
  if (/^https?:\/\//i.test(rest) || /\s@\s*(git\+|https?:|ssh:)/i.test(rest)) {
    return null;
  }

  rest = rest.replace(/^-e\s+/, "").trim();
  if (rest.includes("@") && !rest.startsWith("@")) {
    const atUrl = rest.match(/^(.+?)\s@\s+\S+/);
    if (atUrl) rest = atUrl[1].trim();
  }

  const nameMatch = rest.match(
    /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(\[[^\]]*\])?\s*(.*)$/,
  );
  if (!nameMatch) return null;

  const name = nameMatch[1];
  const specPart = (nameMatch[3] || "").trim();
  const requested = specPart.length > 0 ? specPart : undefined;

  if (!validatePackageNameForEcosystem(name, "pypi").valid) return null;

  return { name, requested };
}

function addPyPiEntry(
  entry: ParsedDependency,
  seen: Map<string, ParsedDependency>,
) {
  const key = entry.name.toLowerCase();
  const existing = seen.get(key);
  if (existing) {
    if (!existing.requested && entry.requested) {
      seen.set(key, { name: entry.name, requested: entry.requested });
    }
    return;
  }
  seen.set(key, entry);
}

/**
 * Parse requirements.txt / PEP 508 lines into PyPI project entries.
 */
export function parseRequirementsList(input: string): ParseDependencyListResult {
  const text = input.trim();
  if (!text) {
    return {
      packages: [],
      entries: [],
      invalidCount: 0,
      truncated: false,
      source: "empty",
    };
  }

  const seen = new Map<string, ParsedDependency>();
  let invalidCount = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = stripRequirementLine(raw);
    if (!line) continue;

    const parsed = parsePep508NameAndSpec(line);
    if (parsed) {
      addPyPiEntry(parsed, seen);
      continue;
    }

    invalidCount += 1;
  }

  const entries = [...seen.values()].slice(0, PASTE_LIST_MAX_PACKAGES);
  return {
    packages: entries.map((e) => e.name),
    entries,
    invalidCount,
    truncated: seen.size > PASTE_LIST_MAX_PACKAGES,
    source: "requirements.txt",
  };
}

export function parseDependencyListForEcosystem(
  input: string,
  ecosystem: "npm" | "pypi",
): ParseDependencyListResult {
  return ecosystem === "pypi"
    ? parseRequirementsList(input)
    : parseDependencyList(input);
}
