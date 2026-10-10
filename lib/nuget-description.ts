export type NugetDescription = {
  /** Prose summary, without the commonly-used-types list. */
  description: string;
  commonlyUsedTypes: string[];
  /** Trailing note, such as a minimum NuGet client version. */
  note: string | null;
};

const TYPE_NAME =
  /^(?:[A-Za-z_][\w]*\.)+[A-Za-z_][\w]*(?:<[A-Za-z_][\w]*(?:\s*,\s*[A-Za-z_][\w]*)*>)?$/;

/** .NET API reference for a commonly used type, including generic arity. */
export function dotnetApiReferenceUrl(typeName: string): string | null {
  const trimmed = typeName.trim();
  const generic = trimmed.match(/^(.+?)<([^<>]*)>$/);
  const name = generic?.[1] ?? trimmed;
  if (!/^(?:[A-Za-z_][\w]*\.)+[A-Za-z_][\w]*$/.test(name)) return null;
  const arity = generic
    ? generic[2].split(",").filter((part) => part.trim().length > 0).length
    : 0;
  const slug = name.toLowerCase() + (arity > 0 ? `-${arity}` : "");
  return `https://learn.microsoft.com/dotnet/api/${slug}`;
}

function collapseProse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Keep C# generic arguments such as List<T> and drop real HTML tags. */
function stripHtmlKeepGenerics(value: string): string {
  return value.replace(/<([^>]*)>/g, (full, inner: string, offset: number) => {
    const prev = offset > 0 ? value[offset - 1] : "";
    const attached = /[A-Za-z0-9_]/.test(prev);
    const typeArgs = /^[A-Za-z_][\w]*(?:\s*,\s*[A-Za-z_][\w]*)*$/.test(
      inner.trim(),
    );
    return attached && typeArgs ? full : " ";
  });
}

/**
 * NuGet descriptions often end with a "Commonly Used Types" list, one type per line.
 */
export function formatNugetDescription(
  raw: string | null | undefined,
): NugetDescription {
  const empty = { description: "", commonlyUsedTypes: [], note: null };
  if (!raw || typeof raw !== "string") return empty;

  const text = stripHtmlKeepGenerics(raw.replace(/\r\n/g, "\n")).trim();
  if (!text) return empty;

  const marker = text.match(/\n+\s*commonly used types:\s*\n+/i);
  if (!marker || marker.index == null) {
    return { ...empty, description: collapseProse(text) };
  }

  const description = collapseProse(text.slice(0, marker.index));
  const rest = text.slice(marker.index + marker[0].length);
  const types: string[] = [];
  const notes: string[] = [];
  let listing = true;
  for (const line of rest.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (listing && TYPE_NAME.test(trimmed)) {
      types.push(trimmed);
      continue;
    }
    listing = false;
    notes.push(trimmed);
  }

  return {
    description,
    commonlyUsedTypes: types,
    note: notes.length > 0 ? collapseProse(notes.join(" ")) : null,
  };
}
