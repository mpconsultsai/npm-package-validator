/** SPDX pages are the official identifier definitions. */
const SPDX_PAGE = (id: string) => `https://spdx.org/licenses/${id}.html`;

export interface LicenseInfo {
  /** Normalised SPDX id or original label */
  id: string;
  /** One-line meaning for adopters */
  summary: string;
  /** Official definition, when we have a stable URL */
  href?: string;
}

const LICENSES: Record<string, Omit<LicenseInfo, "id">> = {
  MIT: {
    summary:
      "Permissive — use, modify, and redistribute (including commercially) if you keep the copyright notice.",
    href: SPDX_PAGE("MIT"),
  },
  ISC: {
    summary:
      "Permissive, similar to MIT — use and redistribute with the copyright notice.",
    href: SPDX_PAGE("ISC"),
  },
  "Apache-2.0": {
    summary:
      "Permissive — use and modify freely, with a patent grant. Keep notices and state changes.",
    href: SPDX_PAGE("Apache-2.0"),
  },
  "BSD-2-Clause": {
    summary:
      "Permissive — use and redistribute with the copyright notice. No extra advertising clause.",
    href: SPDX_PAGE("BSD-2-Clause"),
  },
  "BSD-3-Clause": {
    summary:
      "Permissive — like 2-clause BSD, plus you must not use the author’s name to endorse products.",
    href: SPDX_PAGE("BSD-3-Clause"),
  },
  "0BSD": {
    summary: "Public-domain style — no conditions on use or redistribution.",
    href: SPDX_PAGE("0BSD"),
  },
  Unlicense: {
    summary: "Public-domain dedication — no copyright restrictions on use.",
    href: SPDX_PAGE("Unlicense"),
  },
  "CC0-1.0": {
    summary: "Public-domain dedication — waives copyright as far as the law allows.",
    href: SPDX_PAGE("CC0-1.0"),
  },
  "GPL-2.0": {
    summary:
      "Copyleft — if you distribute a modified version, you must share source under the GPL.",
    href: SPDX_PAGE("GPL-2.0-only"),
  },
  "GPL-2.0-only": {
    summary:
      "Copyleft — if you distribute a modified version, you must share source under GPL-2.0.",
    href: SPDX_PAGE("GPL-2.0-only"),
  },
  "GPL-2.0-or-later": {
    summary:
      "Copyleft — distribute modifications under GPL-2.0 or a later GPL version.",
    href: SPDX_PAGE("GPL-2.0-or-later"),
  },
  "GPL-3.0": {
    summary:
      "Strong copyleft — distribute modifications as GPL-3.0, including source and patent terms.",
    href: SPDX_PAGE("GPL-3.0-only"),
  },
  "GPL-3.0-only": {
    summary:
      "Strong copyleft — distribute modifications as GPL-3.0, including source and patent terms.",
    href: SPDX_PAGE("GPL-3.0-only"),
  },
  "GPL-3.0-or-later": {
    summary:
      "Strong copyleft — distribute modifications under GPL-3.0 or a later GPL version.",
    href: SPDX_PAGE("GPL-3.0-or-later"),
  },
  "LGPL-2.1": {
    summary:
      "Weak copyleft — you can link from closed-source code; changes to the library itself stay LGPL.",
    href: SPDX_PAGE("LGPL-2.1-only"),
  },
  "LGPL-2.1-only": {
    summary:
      "Weak copyleft — you can link from closed-source code; changes to the library itself stay LGPL.",
    href: SPDX_PAGE("LGPL-2.1-only"),
  },
  "LGPL-3.0": {
    summary:
      "Weak copyleft — linking is allowed; modifications to the library stay under LGPL-3.0.",
    href: SPDX_PAGE("LGPL-3.0-only"),
  },
  "LGPL-3.0-only": {
    summary:
      "Weak copyleft — linking is allowed; modifications to the library stay under LGPL-3.0.",
    href: SPDX_PAGE("LGPL-3.0-only"),
  },
  "AGPL-3.0": {
    summary:
      "Network copyleft — offering the software as a service also requires sharing source.",
    href: SPDX_PAGE("AGPL-3.0-only"),
  },
  "AGPL-3.0-only": {
    summary:
      "Network copyleft — offering the software as a service also requires sharing source.",
    href: SPDX_PAGE("AGPL-3.0-only"),
  },
  "MPL-2.0": {
    summary:
      "File-level copyleft — changed MPL files must stay MPL; the rest of your app can use another licence.",
    href: SPDX_PAGE("MPL-2.0"),
  },
  "EPL-2.0": {
    summary:
      "Weak copyleft used by Eclipse projects — modifications to EPL files must be shared.",
    href: SPDX_PAGE("EPL-2.0"),
  },
  "Artistic-2.0": {
    summary:
      "Permissive with conditions on how you distribute modified versions (common for Perl).",
    href: SPDX_PAGE("Artistic-2.0"),
  },
  "BlueOak-1.0.0": {
    summary: "Permissive — use and redistribute with the licence notice.",
    href: SPDX_PAGE("BlueOak-1.0.0"),
  },
  UNLICENSED: {
    summary:
      "Not an open-source grant — the publisher has not licensed the package for reuse.",
    href: "https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license",
  },
};

const ALIASES: Record<string, string> = {
  MIT: "MIT",
  ISC: "ISC",
  APACHE: "Apache-2.0",
  "APACHE-2": "Apache-2.0",
  "APACHE-2.0": "Apache-2.0",
  BSD: "BSD-3-Clause",
  "BSD-2": "BSD-2-Clause",
  "BSD-3": "BSD-3-Clause",
  "BSD-2-CLAUSE": "BSD-2-Clause",
  "BSD-3-CLAUSE": "BSD-3-Clause",
  GPL: "GPL-3.0-only",
  "GPL-2": "GPL-2.0-only",
  "GPL-3": "GPL-3.0-only",
  "GPLV2": "GPL-2.0-only",
  "GPLV3": "GPL-3.0-only",
  LGPL: "LGPL-3.0-only",
  AGPL: "AGPL-3.0-only",
  UNLICENCE: "Unlicense",
  UNLICENSE: "Unlicense",
};

export const licenseDisplayName = (license: unknown): string => {
  if (license == null) return "Unknown";
  if (typeof license === "string") {
    const trimmed = license.trim();
    return trimmed || "Unknown";
  }
  if (typeof license === "object" && license && "type" in license) {
    const type = (license as { type?: unknown }).type;
    if (typeof type === "string" && type.trim()) return type.trim();
  }
  return "Unknown";
};

const firstSpdxToken = (raw: string): string =>
  raw
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND|WITH)\s+/i)
    .map((part) => part.trim())
    .find((part) => part.length > 0) ?? raw.trim();

export const describeLicense = (license: unknown): LicenseInfo | null => {
  const display = licenseDisplayName(license);
  if (display === "Unknown") return null;

  const token = firstSpdxToken(display);
  const aliasKey = token.toUpperCase();
  const id = LICENSES[token] ? token : ALIASES[aliasKey] ?? token;
  const known = LICENSES[id];
  if (known) return { id, ...known };

  if (/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(token)) {
    return {
      id: token,
      summary: "See the SPDX definition for terms and obligations.",
      href: SPDX_PAGE(token),
    };
  }

  return {
    id: display,
    summary: "Check the package’s licence file — this is not a standard SPDX id.",
  };
};
