/*
JSON extension tag normalization
*/

function normalizeJsonExtension(rawTag) {
  return rawTag.replace(/^rv(?:32|64)?_/, "").toLowerCase();
}

// build normal-name -> original tag set mapping
function buildNormalMap(jsonTags) {
  const map = new Map();
  for (const tag of jsonTags) {
    const norm = normalizeJsonExtension(tag);
    if (!map.has(norm)) map.set(norm, new Set());
    map.get(norm).add(tag);
  }
  return map;
}

export { normalizeJsonExtension, buildNormalMap };
