/*
Re-export shim for being compatible with the older version

The main implementation lives in the crossref/ submodules:
crossref/utils.js              -> shared constants & helpers
crossref/normalize.js          -> JSON tag normalization
crossref/scanner-legacy.js     -> legacy scanner (benchmarking only)
crossref/scanner-optimized.js  -> production scanner
crossref/index.js              -> orchestration + barrel exports
*/

export {
  EXT_SHAPE,
  escapeRegExp,
  collectAdocFiles,
  scanManualOptimized,
  scanManualLegacy,
  crossReference,
  normalizeJsonExtension,
  buildNormalMap,
} from "./crossref/index.js";
