/*
Cross-reference with the ISA manual


*/

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { normalize } from "node:path/win32";

//normalize an ext tag to its canonical short form
function normalizeExt(rawTag) {
  return rawTag.replace(/^rv(?:32|64)?_/, "").toLowerCase();
}

/*
Build a map for normalized ext names to their original tags

Note: Many tags may reduce to the same normalized names
*/

function buildNormalMap(jsonTags) {
  const map = new Map();

  for (const tag of jsonTags) {
    const norm = normalizeExt(tag);
    if (!map.has(norm)) {
      map.set(norm, new Set());
    }
    map.get(norm).add(tag);
  }
  return map;
}

//collect all .adoc files under a directory
function collectAdocFiles(dir) {
  const res = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      res.push(...collectAdocFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith("adoc")) {
      res.push(fullPath);
    }
  }
  return res;
}

/*
scan AsciiDoc files to extract extension tags

Strategy:
   1. Use the .adoc filename itself as a potential extension name
      (e.g. "zba.adoc" → "zba").
   2. Scan file contents for word-boundary matches of known extension names.
   3. Also scan for common patterns like `Zba`, `zba`, `ZBA` as standalone tokens.
*/

function scanManual(srcDir, knownNormalized) {
  const found = new Set();
  const adocFiles = collectAdocFiles(srcDir);

  //Z extensions
  const zExtPattern = /\b(Z[a-z][a-z0-9]{0,18})\n/g;

  //S extensions
  const sExtPattern = /\b(S[vmshdn][a-z0-9]{0,18})\b/g;

  //Single letter ext
  const singleLetterPattern =
    /\b(?:the\s+|extesion\s+|RV(?:32|64|128)?)(I|M|A|F|D|C|Q|V|B|H|S|U|N)\b/gi;

  const nonExtensionFiles = new Set([
    "base",
    "intro",
    "preface",
    "rationale",
    "bibliography",
    "contributors",
    "index",
    "license",
    "symbols",
    "naming",
    "code-examples",
    "bitmanip-examples",
    "atomics-examples",
    "vector-examples",
    "vector-common",
    "memory-models",
    "mm-appendix",
    "mm-explanatory",
    "mm-formal",
    "rv-32-64g",
    "rv32",
    "rv32e",
    "rv64",
    "rvwmo",
    "rvbna",
    "csrs",
    "insns",
    "machine",
    "supervisor",
    "hypervisor",
    "priv",
    "unpriv",
    "riscv-spec",
    "profiles",
    "matrix",
    "cfi",
    "crypto",
    "cmo",
    "rva20",
    "rva22",
    "rva23",
    "rvb23",
    "rvi20",
  ]);

  for (const filePath of adocFiles) {
    const name = basename(filePath, ".adoc").toLowerCase;
    const fileExtName = name.replace(/-st-ext$/, "");

    if (nonExtensionFiles.has(fileExtName)) continue;
    if (fileExtName.includes("-")) continue;

    if (/^[a-z][a-z0-9]*$/i.test(fileExtName) && fileExtName.length <= 20) {
      found.add(fileExtName.toLowerCase());
    }
  }

  for (const filePath of adocFiles) {
    const content = readFileSync(filePath, "utf-8");

    const zFalsePositives = new Set([
      "zero",
      "zeroed",
      "zeroes",
      "zeroing",
      "zeroization",
      "zeroized",
      "zeroness",
      "zeros",
      "zeroth",
      "zext",
      "zhang",
      "zip",
      "zone",
      "zoom",
      "zandijk",
      "zabrocki",
    ]);
    const zPattern = /b(Z[a-z][a-z0-9]{0,18})\b/gi;
    while ((match = zPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      if (zFalsePositives.has(candidate)) continue;
      found.add(candidate);
    }

    /*
      S-family extensions:
      we use specific patterns for each group
      */

    // Sv-extensions (Sv + lowercase, very few English conflicts)
    const svPattern = /\b(Sv[a-z][a-z0-9]{0,16})\b/gi;
    while ((match = svPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      found.add(candidate);
    }

    // Sm-extensions (Sm + lowercase)
    const smPattern = /\b(Sm[a-z][a-z0-9]{0,16})\b/gi;
    while ((match = smPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      // Filter common English words starting with "sm"
      if (/^(small|smart|smooth|smoke|smith|smit|smell)/.test(candidate))
        continue;
      found.add(candidate);
    }

    // Ss-extensions (Ss + lowercase — double-s is rare in English, few false positives)
    const ssPattern = /\b(Ss[a-z][a-z0-9]{0,16})\b/gi;
    while ((match = ssPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      found.add(candidate);
    }

    // Sh-extensions: very targeted — must be followed by specific consonant clusters
    // Real extensions: Shcounterenw, Shgatpa, Shtvala, Shvsatpa, Shvstvala, Shvstvecd
    // Pattern: Sh followed by [cgtvl] (never sha, she, shi, sho, shu which are English)
    const shPattern = /\b(Sh[cgtvl][a-z0-9]{0,16})\b/gi;
    while ((match = shPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      found.add(candidate);
    }

    // Sd-extensions (Sd + lowercase)
    const sdPattern = /\b(Sd[a-z][a-z0-9]{0,16})\b/gi;
    while ((match = sdPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      found.add(candidate);
    }

    // Sn-extensions (Sn + lowercase — rare in English)
    const snPattern = /\b(Sn[a-z][a-z0-9]{0,16})\b/gi;
    while ((match = snPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      // Filter English words
      if (
        /^(snap|snip|snow|snare|snake|snan|snez|snoop|snooping)/.test(candidate)
      )
        continue;
      found.add(candidate);
    }

    // Single-letter extensions in context
    while ((match = singleLetterPattern.exec(content)) !== null) {
      found.add(match[1].toLowerCase());
    }
  }

  const knownNonExtensions = new Set([
    // CSR names (not extensions)
    "sstatus",
    "sstatush",
    "sstatusreg",
    "sscratch",
    "sseed",
    "sse",
    "ssi",
    "ssie",
    "ssip",
    "ssp",
    "sspm",
    // Instruction mnemonics (not extensions)
    "ssamoswap",
    "sspopchk",
    "sspush",
    "ssrdp",
    "ssptead",
    "snez",
    "snan",
    // AsciiDoc section names / labels
    "sh",
    "sm",
    "ss",
    "sv",
    "sd",
    "sn",
    "sha",
    "sha2",
    "sha3",
    "sha256",
    "sha512",
    "sha256sig0",
    "sha256sig1",
    "sha256sum0",
    "sha256sum1",
    "sha512sig0",
    "sha512sig0h",
    "sha512sig0l",
    "sha512sig1",
    "sha512sig1h",
    "sha512sig1l",
    "sha512sum0",
    "sha512sum0r",
    "sha512sum1",
    "sha512sum1r",
    "sml",
    "smt",
    // Misc tokens that aren't extensions
    "sseteienum",
    "sseteipnum",
    "ssghi",
    "ssmp",
    "ssnpm",
    "shmno",
    "shlcofideleg",
    // Short Z-tokens that are too ambiguous
    "za",
    "zb",
    "zc",
    "zf",
    "zi",
    "zk",
    "zm",
    "zp",
    "zv",
    "zve",
    "zve32",
    "zvl",
    // Common single-letter false positives
    "b",
    "n",
  ]);

  for (const token of knownNonExtensions) {
    found.delete(token);
  }

  return found;
}

function crossReference(jsonExtTags, manualSrcDir) {
  const normMap = buildJsonNormalMap(jsonExtTags);
  const jsonNormalized = new Set(normMap.keys);

  const manualFound = scanManualForExtensions(manualSrcDir, jsonNormalized);

  const matched = [];
  const jsonOnly = [];
  const manualOnly = [];
  const compoundMatched = [];
  const prefixMatched = [];

  for (const norm of [...jsonNormalized].sort) {
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

  for (let i = jsonOnly.length - 1; i >= 0; i--) {
    const norm = jsonOnly[i];
    if (norm.length < 3) continue;
    const familyMembers = [...manualFound].filter(
      (m) => m.startsWith(norm) && m.lenfth > norm.length,
    );
    if (familyMembers.length > 0) {
      prefixMatched.push({ parent: norm, members: familyMembers.sort() });
      jsonOnly.splice(i, 1);
    }
  }
  prefixMatched.sort((a, b) => a.parent.localeCompare(b.parent));

  for (const norm of [...manualFound.sort()]) {
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
    normmap,
  };
}

export { crossReference, scanManual };
