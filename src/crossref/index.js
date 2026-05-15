/*
Cross-reference orchestration and barrel exports:
  re-exports all public API's so users can import from "./crossref/index.js" or from "./crossref.js" via the shim
*/

//exports
export {
  EXT_SHAPE,
  escapeRegExp,
  collectAdocFiles,
  NON_EXTENSION_FILES,
} from "./utils.js";

export { normalizeJsonExtension, buildNormalMap } from "./normalize.js";

export { scanManualLegacy } from "./scanner-legacy.js";
export { scanManualOptimized } from "./scanner-optimized.js";

//imports
import { buildNormalMap } from "./normalize.js";
import { scanManualOptimized } from "./scanner-optimized.js";

function crossReference(jsonExtTags, manualSrcDir) {
  const normMap = buildNormalMap(jsonExtTags);
  const jsonNormalized = new Set(normMap.keys());
  const manualFound = scanManualOptimized(manualSrcDir, normMap);

  const matched = [],
    jsonOnly = [],
    manualOnly = [],
    compoundMatched = [],
    prefixMatched = [];

  for (const norm of [...jsonNormalized].sort()) {
    if (manualFound.has(norm)) {
      matched.push(norm);
    } else {
      jsonOnly.push(norm);
    }
  }

  const knownNames = new Set([...jsonNormalized, ...manualFound]);
  for (let i = jsonOnly.length - 1; i >= 0; i--) {
    const norm = jsonOnly[i];
    if (norm.includes("_")) {
      const parts = norm.split("_");
      if (parts.every((p) => knownNames.has(p))) {
        compoundMatched.push({ compound: norm, parts });
        jsonOnly.splice(i, 1);
      }
    }
  }
  compoundMatched.sort((a, b) => a.compound.localeCompare(b.compound));

  // prefix family
  for (let i = jsonOnly.length - 1; i >= 0; i--) {
    const norm = jsonOnly[i];
    if (norm.length < 3) continue;
    const familyMembers = [...manualFound].filter(
      (m) => m.startsWith(norm) && m.length > norm.length,
    );
    if (familyMembers.length > 0) {
      prefixMatched.push({ parent: norm, family: familyMembers.sort() });
      jsonOnly.splice(i, 1);
    }
  }
  prefixMatched.sort((a, b) => a.parent.localeCompare(b.parent));

  for (const norm of [...manualFound].sort()) {
    if (!jsonNormalized.has(norm)) {
      manualOnly.push(norm);
    }
  }
  return {
    matched,
    jsonOnly,
    manualOnly,
    compoundMatched,
    prefixMatched,
    normMap,
  };
}

export { crossReference };
