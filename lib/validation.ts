/**
 * npm package name validation per https://github.com/npm/validate-npm-package-name
 * Format: (@scope/)?package-name
 * - Scoped: @scope/package-name (scope + slash + package name required)
 * - Unscoped: package-name
 */
const VALID_PACKAGE_NAME_REGEX = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * Extract the package name from input, taking only the first token.
 * Handles inputs like "@graphql-inspector/cli graphql" → "@graphql-inspector/cli"
 */
export function extractPackageName(input: string): string {
  return (input?.trim().split(/\s+/)[0] || '').trim();
}

export function validatePackageName(packageName: string): { valid: boolean; error?: string } {
  const trimmed = extractPackageName(packageName);

  if (!trimmed) {
    return { valid: false, error: 'Package name is required' };
  }

  if (VALID_PACKAGE_NAME_REGEX.test(trimmed)) {
    return { valid: true };
  }

  // Helpful error for scope-only input (e.g. @graphql-inspector)
  if (trimmed.startsWith('@') && !trimmed.includes('/')) {
    return {
      valid: false,
      error: 'Scoped packages must include the package name. Example: @graphql-inspector/core',
    };
  }

  return {
    valid: false,
    error: 'Invalid package name format. Use "package-name" or "@scope/package-name"',
  };
}
