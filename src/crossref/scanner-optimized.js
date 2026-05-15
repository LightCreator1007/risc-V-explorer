/*
Positive-identification scanner.
Uses JSON allowlist + AsciiDoc structural parsing + targeted body-text
sweep to identify RISC-V extensions without relying on broad regex dragnets.
*/

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  EXT_SHAPE,
  escapeRegExp,
  collectAdocFiles,
  NON_EXTENSION_FILES,
} from "./utils.js";

function scanManualOptimized(srcDir, jsonNormalizedMap) {
  const found = new Set();
  const adocFiles = collectAdocFiles(srcDir);
  const jsonNames = new Set(jsonNormalizedMap.keys());

  //Phase 1: file-names
  const filenameExtPattern =
    /^(?:z[a-z][a-z0-9]*|s[vmshdn][a-z][a-z0-9]*|[imafdcqvbhsun])$/i;
  for (const filePath of adocFiles) {
    let name = basename(filePath, ".adoc").toLowerCase();
    if (NON_EXTENSION_FILES.has(name) || name.includes("-")) continue;
    if (filenameExtPattern.test(name)) found.add(name);
  }

  //content scanning patterns
  const headerQuotedPattern = /^=+\s+["']([A-Za-z][A-Za-z0-9/]+)["']/gm;
  const headerUnquotedPattern =
    /^=+\s+((?:Z[a-z][a-z0-9]*|S[vmshdn][a-z][a-z0-9]*)(?:\/(?:Z[a-z][a-z0-9]*|S[vmshdn][a-z][a-z0-9]*))*)(?:\s+|-)+(?:Extension|Augmented)/gim;
  const extMacroPattern = /ext:([a-zA-Z][a-zA-Z0-9]*)\[\]/g;
  const singleLetterPattern =
    /\b(?:the\s+|extension\s+|RV(?:32|64|128)?)(I|M|A|F|D|C|Q|V|B|H|S|U|N)\b/gi;

  //body text patterns
  const zBodyPattern = /\b(Z[a-z][a-z0-9]{1,18})\b/g;

  //S-family sub patterns
  const sBodyPatterns = [
    /\b(Sv[a-z][a-z0-9]{0,16})\b/gi,
    /\b(Sm[a-z][a-z0-9]{0,16})\b/gi,
    /\b(Ss[a-z][a-z0-9]{0,16})\b/gi,
    /\b(Sh[cgtvl][a-z0-9]{0,16})\b/gi,
    /\b(Sd[a-z][a-z0-9]{0,16})\b/gi,
    /\b(Sn[a-z][a-z0-9]{0,16})\b/gi,
  ];

  //block-list for body text sweep
  const bodyFalsePositives = new Set([
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
    "small",
    "smaller",
    "smallest",
    "smart",
    "smooth",
    "smoke",
    "smith",
    "smit",
    "smell",
    "sml",
    "smt",
    "snap",
    "snapshot",
    "snip",
    "snippet",
    "snippets",
    "snow",
    "snare",
    "snake",
    "snoop",
    "snooping",
  ]);

  for (const filePath of adocFiles) {
    const content = readFileSync(filePath, "utf-8");
    let match;

    //json allow-list
    for (const jsonName of jsonNames) {
      const parts = jsonName.includes("_") ? jsonName.split("_") : [jsonName];
      for (const part of parts) {
        if (part.length < 2) continue;
        if (!EXT_SHAPE.test(part)) continue;
        if (new RegExp(`\\b${escapeRegExp(part)}\\b`, "i").test(content)) {
          found.add(part);
        }
      }
    }

    //ASCII doc headers -quoted names
    while ((match = headerQuotedPattern.exec(content)) !== null) {
      for (const n of match[1].split("/")) {
        const lower = n.toLowerCase();
        if (EXT_SHAPE.test(lower)) found.add(lower);
      }
    }

    //Unquoted headers
    while ((match = headerUnquotedPattern.exec(content)) !== null) {
      for (const n of match[1].split("/")) found.add(n.toLowerCase());
    }

    //skip 2-char umbrella prefixes
    while ((match = extMacroPattern.exec(content)) !== null) {
      const name = match[1].toLowerCase();
      if (name.length < 3) continue;
      if (EXT_SHAPE.test(name)) found.add(name);
    }

    //body sweep
    while ((match = zBodyPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      if (candidate.length < 3) continue;
      if (bodyFalsePositives.has(candidate)) continue;
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      if (EXT_SHAPE.test(candidate)) found.add(candidate);
    }

    for (const sPattern of sBodyPatterns) {
      while ((match = sPattern.exec(content)) !== null) {
        const candidate = match[1].toLowerCase();
        if (bodyFalsePositives.has(candidate)) continue;
        const afterIdx = match.index + match[0].length;
        if (afterIdx < content.length && content[afterIdx] === "_") continue;
        found.add(candidate);
      }
    }

    //Single letter extensions in explicit context
    while ((match = singleLetterPattern.exec(content)) !== null) {
      found.add(match[1].toLowerCase());
    }
  }

  // removing category prefixes and fictional examples
  const toRemove = new Set([
    "sh",
    "sm",
    "ss",
    "sv",
    "sd",
    "sn",
    "za",
    "zb",
    "zc",
    "zf",
    "zi",
    "zm",
    "zp",
    "zv",
    "zve",
    "zve32",
    "zvl",
    "shmno",
    "ssghi",
    "svjkl",
    "sm1p13",
    "sstatus",
    "sstatush",
    "sscratch",
    "sseed",
    "sse",
    "ssi",
    "ssie",
    "ssip",
    "ssp",
    "sspm",
    "sstateen",
    "sstateen0",
    "sstateen1",
    "sstateen2",
    "sstateen3",
    "sstateen4",
    "sstateen5",
    "sstateen6",
    "sstateen7",
    "ssamoswap",
    "sspopchk",
    "sspush",
    "ssrdp",
    "ssptead",
    "snez",
    "snan",
    "sstatusreg",
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
    "sseteienum",
    "sseteipnum",
    "ssmp",
    "ssnpm",
    "shlcofideleg",
    "ssdbltrap",
  ]);

  for (const token of toRemove) {
    if (!jsonNames.has(token)) found.delete(token);
  }

  return found;
}

export { scanManualOptimized };
