export type DepGraphEdge = { from: string; to: string };

/** Display name from deps.dev node id `name@version` (handles scoped packages). */
export function packageNameFromDepNodeId(id: string): string {
  const at = id.lastIndexOf("@");
  if (at <= 0) return id;
  return id.slice(0, at);
}

function buildAdjacency(edges: DepGraphEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adj.get(edge.from);
    if (list) list.push(edge.to);
    else adj.set(edge.from, [edge.to]);
  }
  return adj;
}

function pathSignature(names: string[]): string {
  return names.join("\0");
}

function sortPaths(paths: string[][]): string[][] {
  return [...paths].sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return pathSignature(a).localeCompare(pathSignature(b));
  });
}

export type AllPathsOptions = {
  maxPathsPerNode?: number;
  maxDepth?: number;
};

/**
 * All simple paths from root to each node (package names), shortest first.
 * Capped to avoid exponential blow-up on dense graphs.
 */
export function buildAllDependencyPathsFromRoot(
  rootNodeId: string,
  edges: DepGraphEdge[],
  options: AllPathsOptions = {},
): Map<string, string[][]> {
  const maxPathsPerNode = options.maxPathsPerNode ?? 12;
  const maxDepth = options.maxDepth ?? 18;
  const adj = buildAdjacency(edges);
  const pathsByNode = new Map<string, string[][]>();
  const seenByNode = new Map<string, Set<string>>();

  const addPath = (nodeId: string, names: string[]) => {
    const sig = pathSignature(names);
    let seen = seenByNode.get(nodeId);
    if (!seen) {
      seen = new Set();
      seenByNode.set(nodeId, seen);
    }
    if (seen.has(sig)) return;
    seen.add(sig);
    const list = pathsByNode.get(nodeId) ?? [];
    if (list.length >= maxPathsPerNode) return;
    list.push(names);
    pathsByNode.set(nodeId, list);
  };

  const walk = (nodeId: string, names: string[], idsOnPath: Set<string>, depth: number) => {
    if (depth > maxDepth) return;
    addPath(nodeId, names);
    for (const child of adj.get(nodeId) ?? []) {
      if (idsOnPath.has(child)) continue;
      const nextIds = new Set(idsOnPath);
      nextIds.add(child);
      walk(
        child,
        [...names, packageNameFromDepNodeId(child)],
        nextIds,
        depth + 1,
      );
    }
  };

  walk(
    rootNodeId,
    [packageNameFromDepNodeId(rootNodeId)],
    new Set([rootNodeId]),
    0,
  );

  for (const [id, paths] of pathsByNode) {
    pathsByNode.set(id, sortPaths(paths));
  }
  return pathsByNode;
}

/** Shortest path from root to each node (BFS). */
export function buildDependencyPathsFromRoot(
  rootNodeId: string,
  edges: DepGraphEdge[],
): Map<string, string[]> {
  const adj = buildAdjacency(edges);
  const paths = new Map<string, string[]>();
  const queue: { id: string; names: string[] }[] = [
    { id: rootNodeId, names: [packageNameFromDepNodeId(rootNodeId)] },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, names } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    paths.set(id, names);

    for (const child of adj.get(id) ?? []) {
      if (visited.has(child)) continue;
      queue.push({
        id: child,
        names: [...names, packageNameFromDepNodeId(child)],
      });
    }
  }

  return paths;
}
