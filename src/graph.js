export function buildSharedInstructionGraph(instrDict) {
  const adjacency = new Map();

  for (const [mnemonic, meta] of Object.entries(instrDict)) {
    const exts = meta.extension ?? [];
    if (exts.length < 2) continue;
    for (let i = 0; i < exts.length; i++) {
      for (let j = i + 1; j < exts.length; j++) {
        const a = exts[i];
        const b = exts[j];
        if (!adjacency.has(a)) adjacency.set(a, new Map());
        if (!adjacency.has(b)) adjacency.set(b, new Map());

        if (!adjacency.get(a).has(b)) adjacency.get(a).set(b, []);
        if (!adjacency.get(b).has(a)) adjacency.get(b).set(a, []);

        adjacency.get(a).get(b).push(mnemonic);
        adjacency.get(b).get(a).push(mnemonic);
      }
    }
  }

  return adjacency;
}

export function renderTextGraph(adjacency) {
  const lines = [];
  const sortedNodes = [...adjacency.keys()].sort();

  for (const node of sortedNodes) {
    const neighbors = adjacency.get(node);
    const sortedNeighbors = [...neighbors.keys()].sort();
    const neighborsList = sortedNeighbors
      .map((n) => `${n} (${neighbors.get(n).length} shared)`)
      .join(", ");
    lines.push(`  ${node}`);
    lines.push(`    └── ${neighborsList}`);
    lines.push("");
  }
  lines.push(
    `  Total nodes (extensions with shared instructions): ${sortedNodes.length}`,
  );

  const edgeSet = new Set();
  for (const [a, neighbors] of adjacency) {
    for (const b of neighbors.keys()) {
      const key = [a, b].sort().join("<->");
      edgeSet.add(key);
    }
  }
  lines.push(`  Total edges (extension pairs): ${edgeSet.size}`);

  return lines;
}

export function renderMermaidGraph(adjacency) {
  const lines = ["graph LR"];

  const edgeSet = new Set();

  for (const [a, neighbors] of adjacency) {
    for (const [b, shared] of neighbors) {
      const key = [a, b].sort().join("<->");
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const [left, right] = [a, b].sort();
        const leftId = left.replace(/[^a-zA-Z0-9]/g, "_");
        const rightId = right.replace(/[^a-zA-Z0-9]/g, "_");
        lines.push(
          `  ${leftId}["${left}"] -->|"${shared.length} shared"| ${rightId}["${right}"]`,
        );
      }
    }
  }

  return lines.join("\n");
}
