# RISC-V Instruction Set Explorer

A Node.js program that parses the RISC-V instruction dictionary (`instr_dict.json`), cross-references extensions against the official ISA manual's AsciiDoc sources, and generates shared-instruction graphs.

Built for the RISC-V Mentorship Coding Challenge.

## Setup

Requires Node.js 18+ and Git. No `npm install` needed. Zero external dependencies.

```bash
git clone <your-repo-url>
cd risc-V

# Download the instruction dictionary
curl -sL "https://raw.githubusercontent.com/rpsene/riscv-extensions-landscape/main/src/instr_dict.json" \
  -o instr_dict.json

# Clone the ISA manual (shallow clone is enough)
git clone --depth 1 https://github.com/riscv/riscv-isa-manual.git
```

## Usage

```bash
# Run all three tiers, print to terminal
node src/index.js

# Also write output to out/output.txt (ANSI codes stripped)
node src/index.js --out

# Custom output path
node src/index.js --out results/my-output.txt

# Include Mermaid graph definition
node src/index.js --mermaid

# Custom input paths
node src/index.js --json-path ./instr_dict.json --manual-src ./riscv-isa-manual/src
```

### Tests

```bash
npm test    # Run 32 unit tests
```

## What It Does

### Tier 1: Instruction Set Parsing

Parses `instr_dict.json`, groups 1,188 instructions across 114 extension tags, and prints a summary table. Also lists the 73 instructions that belong to more than one extension.

### Tier 2: Cross-Reference with the ISA Manual

Scans 158+ AsciiDoc source files in the ISA manual for extension names. Normalizes JSON tags (`rv_zba`, `rv64_zba`) to canonical short forms (`zba`) for case-insensitive matching. Reports:

- 58 exact matches
- 10 compound matches (e.g. `d_zfa` decomposed into `d` + `zfa`)
- 1 prefix match (e.g. `zicbo` covers `zicbom`, `zicbop`, `zicboz`)
- 16 JSON-only extensions (not documented in the manual)
- 109 manual-only extensions (not in the JSON)

### Tier 3: Shared-Instruction Graph

Builds an adjacency list of extensions that share instructions. Optionally outputs a Mermaid diagram definition for visual rendering.

## Sample Output

Tier 1:

```
======================================================================
  TIER 1 -- Instruction Set Parsing
======================================================================

  Source: ./instr_dict.json
  Total instructions parsed: 1188

  --- Extension Summary Table ---

  rv_a            |  11 instructions | e.g. AMOADD_W
  rv_c            |  23 instructions | e.g. C_ADD
  rv_d            |  26 instructions | e.g. FADD_D
  rv_f            |  26 instructions | e.g. FADD_S
  rv_i            |  37 instructions | e.g. ADD
  rv_m            |   8 instructions | e.g. DIV
  rv_v            | 627 instructions | e.g. VAADD_VV
  ...

  Total extensions: 114

  --- Instructions Belonging to Multiple Extensions ---

  Found 73 instructions in multiple extensions:

  AES32DSI             -> rv32_zk, rv32_zkn, rv32_zknd
  ANDN                 -> rv_zbb, rv_zbkb, rv_zk, rv_zkn, rv_zks
  CLMUL                -> rv_zbc, rv_zbkc, rv_zk, rv_zkn, rv_zks
  ...
```

Tier 2:

```
======================================================================
  TIER 2 -- Cross-Reference with the ISA Manual
======================================================================

  --- Count Summary ---

  58 exact matched, 10 compound matched, 1 prefix matched,
  16 in JSON only, 109 in manual only

  --- Matched Extensions (in both JSON and ISA manual) ---

  a                    (JSON tags: rv_a)
  c                    (JSON tags: rv_c)
  zba                  (JSON tags: rv_zba)
  zicsr                (JSON tags: rv_zicsr)
  ...

  --- Prefix-Matched Extensions ---

  zicbo                -> family: zicbom, zicbop, zicboz  (JSON tags: rv_zicbo)
```

Tier 3:

```
======================================================================
  TIER 3 -- Shared-Instruction Graph (Bonus)
======================================================================

  rv_zbb
    -> rv_zbkb (5 shared), rv_zk (5 shared), rv_zkn (5 shared), rv_zks (5 shared)

  rv_zk
    -> rv_zbb (5 shared), rv_zbc (2 shared), rv_zbkb (7 shared), rv_zbkc (2 shared), ...

  Total nodes (extensions with shared instructions): 32
  Total edges (extension pairs): 57
```

Full output is in [`sample_output.txt`](sample_output.txt). The `--out` flag writes a clean copy to `out/output.txt`.

## File Structure

```
risc-V/
  src/
    index.js              Entry point. Orchestrates all three tiers.
    parser.js             Tier 1. Loads JSON, groups by extension.
    graph.js              Tier 3. Adjacency list and Mermaid output.
    crossref.js           Re-export shim (keeps import paths stable).
    crossref/
      index.js            Tier 2 orchestration (crossReference).
      normalize.js        JSON tag normalization (rv_zba -> zba).
      scanner-optimized.js  Production scanner.
      scanner-legacy.js     Legacy scanner (kept for reference).
      utils.js            Shared constants and helpers.
    tests/
      test.js             32 unit tests.
  instr_dict.json         Instruction dictionary (downloaded).
  riscv-isa-manual/       ISA manual source (cloned, git-ignored).
  out/                    Generated output (git-ignored).
  sample_output.txt       Checked-in sample output.
  SCANNER_REFACTORING.md  Scanner refactoring notes.
  package.json
  .gitignore
  README.md
```

## Design Decisions

### Extension Name Normalization

JSON uses tags like `rv_zba`, `rv32_zknd`, `rv64_zba`. The manual uses `Zba`, `Zknd`. We strip the `rv`/`rv32`/`rv64` prefix, lowercase, and match case-insensitively. Multiple JSON tags can normalize to the same name.

### Scanner Evolution

The scanner went through three iterations:

1. **Negative filtering (v1).** Broad regexes (`\b(Z[a-z0-9]+)\b`) matched anything that looked like an extension. Massive blocklists (40+ entries) filtered out English words like `zero`, `zhang`, `shadow`. This was fragile: every new false positive required a manual blocklist entry.

2. **Positive identification (v2).** Flipped the approach. Only match names that appear in: the JSON allowlist, AsciiDoc headers (`=== "Zba" Extension`), `ext:NAME[]` macros, or `.adoc` filenames. Eliminated most blocklist entries. But missed 16 real extensions that only appeared in running prose.

3. **Hybrid (v3, current).** Kept positive identification as the foundation but added a targeted body-text sweep for Z-family and S-family names. The `Sh*` prefix needed special handling because English words like `shadow`, `shall`, `shift`, `shared` all match `Sh[a-z]*`. The fix: restrict `Sh*` matches to `Sh[cgtvl]*`, since all real Sh-extensions start with those consonant clusters (`Shcounterenw`, `Shgatpa`, `Shtvala`).

The v1 scanner is preserved as `scanManualLegacy` in `scanner-legacy.js` for reference and regression testing.

### Three-Stage Cross-Reference Matching

After scanning the manual, the cross-reference function matches JSON extensions in three stages:

1. **Exact match.** `zba` in JSON equals `zba` found in the manual.
2. **Compound decomposition.** `d_zfa` splits into `d` + `zfa`. If both parts are independently known, it counts as matched.
3. **Prefix family.** `zicbo` is a prefix of `zicbom`, `zicbop`, `zicboz`. If any sub-extensions exist in the manual, the parent counts as matched.

### What Was Considered and Dropped

- **Levenshtein fuzzy matching.** Explored matching extension names with edit distance <= 2. Rejected because it introduced too many false positives (`sstc` matching `sstatus`, etc.) with minimal gain over prefix matching.
- **Single broad `S[vmshdn]*` body pattern.** Tried one regex for all S-family extensions. Immediately caught `shadow`, `shall`, `shift`, `shared`, `shorter`, and dozens of other English words. Split into six targeted sub-patterns instead.
- **Removing the legacy scanner entirely.** Kept it because having two independent implementations makes it easy to validate changes and catch regressions.

### Unmatched JSON Extensions

16 JSON extensions remain unmatched after all three matching stages. 15 of 16 do not appear anywhere in the manual text. These are draft or proposed extensions defined in the JSON but not yet documented. The remaining one (`system`) appears only as the English word "operating system."

### Why `crossref.js` Is a Directory

The original `crossref.js` was 550 lines mixing normalization, two scanners, and orchestration logic. It was split into five focused modules under `crossref/`. A thin re-export shim at `src/crossref.js` preserves all existing import paths, so no consumer code needed changes.

## Tests

32 tests across four suites:

```
Tier 1 -- Instruction Set Parsing    (12 tests)
Tier 2 -- Extension Name Normalization (8 tests)
Tier 3 -- Shared-Instruction Graph    (9 tests)
Edge Cases                            (3 tests)
```

Run with `npm test`. All tests use the Node.js built-in test runner (no Mocha/Jest dependency).

## License

MIT
