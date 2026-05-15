/*
 Unit tests

 Uses Node.js built-in test runner (node --test).
 No external test framework required.

 Run with:
 npm test
 # or directly:
 node --test tests/test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  loadFile,
  groupByExtension,
  findMultiExtensionInstructions,
  printSummary,
} from "../src/parser.js";

import {
  normalizeJsonExtension,
  buildNormalMap,
  crossReference,
} from "../src/crossref.js";

import {
  buildSharedInstructionGraph,
  renderTextGraph,
  renderMermaidGraph,
} from "../src/graph.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_INSTR_DICT = {
  add: {
    encoding: "0000000----------000-----0110011",
    variable_fields: ["rd", "rs1", "rs2"],
    extension: ["rv_i"],
    match: "0x33",
    mask: "0xfe00707f",
  },
  sh1add: {
    encoding: "0010000----------010-----0110011",
    variable_fields: ["rd", "rs1", "rs2"],
    extension: ["rv_zba"],
    match: "0x20002033",
    mask: "0xfe00707f",
  },
  sh2add: {
    encoding: "0010000----------100-----0110011",
    variable_fields: ["rd", "rs1", "rs2"],
    extension: ["rv_zba"],
    match: "0x20004033",
    mask: "0xfe00707f",
  },
  aes32dsi: {
    encoding: "--10101----------000-----0110011",
    variable_fields: ["rd", "rs1", "rs2", "bs"],
    extension: ["rv32_zknd", "rv32_zk", "rv32_zkn"],
    match: "0x2a000033",
    mask: "0x3e00707f",
  },
  add_uw: {
    encoding: "0000100----------000-----0111011",
    variable_fields: ["rd", "rs1", "rs2"],
    extension: ["rv64_zba"],
    match: "0x800003b",
    mask: "0xfe00707f",
  },
  shared_instr: {
    encoding: "1111111----------111-----1111111",
    variable_fields: ["rd", "rs1"],
    extension: ["rv_ext_a", "rv_ext_b"],
    match: "0xff",
    mask: "0xff",
  },
};

//Parser Tests

describe("Instruction Set Parsing", () => {
  describe("groupByExtension()", () => {
    it("should group instructions correctly", () => {
      const groups = groupByExtension(MOCK_INSTR_DICT);

      assert.ok(groups instanceof Map);
      assert.ok(groups.has("rv_i"));
      assert.ok(groups.has("rv_zba"));
      assert.ok(groups.has("rv32_zknd"));
    });

    it("should contain correct mnemonics in each group", () => {
      const groups = groupByExtension(MOCK_INSTR_DICT);

      assert.deepStrictEqual(groups.get("rv_i"), ["add"]);
      assert.deepStrictEqual(groups.get("rv_zba"), ["sh1add", "sh2add"]);
    });

    it("should place multi-extension instructions in all their groups", () => {
      const groups = groupByExtension(MOCK_INSTR_DICT);

      assert.ok(groups.get("rv32_zknd").includes("aes32dsi"));
      assert.ok(groups.get("rv32_zk").includes("aes32dsi"));
      assert.ok(groups.get("rv32_zkn").includes("aes32dsi"));
    });

    it("should return a sorted Map by extension name", () => {
      const groups = groupByExtension(MOCK_INSTR_DICT);
      const keys = [...groups.keys()];
      const sortedKeys = [...keys].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
      assert.deepStrictEqual(keys, sortedKeys);
    });
  });

  describe("findMultiExtensionInstructions()", () => {
    it("should find instructions with multiple extensions", () => {
      const multi = findMultiExtensionInstructions(MOCK_INSTR_DICT);

      assert.ok(multi.length >= 2); // aes32dsi and shared_instr
      const mnemonics = multi.map((m) => m.mnemonic);
      assert.ok(mnemonics.includes("aes32dsi"));
      assert.ok(mnemonics.includes("shared_instr"));
    });

    it("should not include single-extension instructions", () => {
      const multi = findMultiExtensionInstructions(MOCK_INSTR_DICT);
      const mnemonics = multi.map((m) => m.mnemonic);

      assert.ok(!mnemonics.includes("add"));
      assert.ok(!mnemonics.includes("sh1add"));
    });

    it("should sort extensions within each result", () => {
      const multi = findMultiExtensionInstructions(MOCK_INSTR_DICT);
      for (const item of multi) {
        const sorted = [...item.extensions].sort();
        assert.deepStrictEqual(item.extensions, sorted);
      }
    });

    it("should sort results by mnemonic", () => {
      const multi = findMultiExtensionInstructions(MOCK_INSTR_DICT);
      const mnemonics = multi.map((m) => m.mnemonic);
      const sorted = [...mnemonics].sort();
      assert.deepStrictEqual(mnemonics, sorted);
    });
  });

  describe("printSummary()", () => {
    it("should produce one line per extension", () => {
      const groups = groupByExtension(MOCK_INSTR_DICT);
      const lines = printSummary(groups);

      assert.strictEqual(lines.length, groups.size);
    });

    it("should include the extension name, count, and an example", () => {
      const groups = groupByExtension(MOCK_INSTR_DICT);
      const lines = printSummary(groups);

      // Find the rv_zba line
      const zbaLine = lines.find((l) => l.includes("rv_zba"));
      assert.ok(zbaLine);
      assert.ok(zbaLine.includes("2 instructions"));
      assert.ok(zbaLine.includes("e.g."));
    });

    it("should handle singular 'instruction' for count of 1", () => {
      const groups = groupByExtension(MOCK_INSTR_DICT);
      const lines = printSummary(groups);

      const rvILine = lines.find((l) => l.includes("rv_i"));
      assert.ok(rvILine);
      assert.ok(rvILine.includes("1 instruction ")); // trailing space for singular
    });
  });
});

//Cross-Reference Tests

describe("Extension Name Normalization", () => {
  describe("normalizeJsonExtension()", () => {
    it('should strip "rv_" prefix', () => {
      assert.strictEqual(normalizeJsonExtension("rv_i"), "i");
      assert.strictEqual(normalizeJsonExtension("rv_a"), "a");
      assert.strictEqual(normalizeJsonExtension("rv_zba"), "zba");
    });

    it('should strip "rv32_" prefix', () => {
      assert.strictEqual(normalizeJsonExtension("rv32_zknd"), "zknd");
      assert.strictEqual(normalizeJsonExtension("rv32_c"), "c");
    });

    it('should strip "rv64_" prefix', () => {
      assert.strictEqual(normalizeJsonExtension("rv64_zba"), "zba");
      assert.strictEqual(normalizeJsonExtension("rv64_i"), "i");
      assert.strictEqual(normalizeJsonExtension("rv64_m"), "m");
    });

    it("should return lowercase", () => {
      assert.strictEqual(normalizeJsonExtension("rv_I"), "i");
    });

    it("should handle compound extensions like rv_zabha_zacas", () => {
      assert.strictEqual(
        normalizeJsonExtension("rv_zabha_zacas"),
        "zabha_zacas",
      );
    });
  });

  describe("buildNormalMap()", () => {
    it("should merge rv32_ and rv64_ variants under the same normalized key", () => {
      const map = buildNormalMap(["rv32_zba", "rv64_zba", "rv_zba"]);
      assert.strictEqual(map.size, 1);
      assert.ok(map.has("zba"));
      assert.strictEqual(map.get("zba").size, 3);
    });

    it("should keep distinct extensions separate", () => {
      const map = buildNormalMap(["rv_i", "rv_m", "rv_a"]);
      assert.strictEqual(map.size, 3);
    });
  });

  describe("crossReference() — compound & prefix matching", () => {
    it("should return compoundMatched and prefixMatched arrays", () => {
      const normMap = buildNormalMap(["rv_d_zfa", "rv_zba"]);
      assert.ok(normMap.has("d_zfa"));
      assert.ok(normMap.has("zba"));
    });

    it("should decompose compound tags correctly via normalizeJsonExtension", () => {
      assert.strictEqual(normalizeJsonExtension("rv_d_zfa"), "d_zfa");
      assert.strictEqual(normalizeJsonExtension("rv_svinval_h"), "svinval_h");
      assert.strictEqual(normalizeJsonExtension("rv_zfh_zfa"), "zfh_zfa");
      assert.strictEqual(normalizeJsonExtension("rv_c_d"), "c_d");
      assert.strictEqual(normalizeJsonExtension("rv32_c_f"), "c_f");
    });

    it("should correctly identify compound tag parts", () => {
      // Verify that compound tags split into known extensions
      const tag = "d_zfa";
      const parts = tag.split("_");
      assert.deepStrictEqual(parts, ["d", "zfa"]);

      const tag2 = "zabha_zacas";
      assert.deepStrictEqual(tag2.split("_"), ["zabha", "zacas"]);
    });
  });
});

//Graph Tests

describe("Shared-Instruction Graph", () => {
  describe("buildSharedInstructionGraph()", () => {
    it("should create edges between extensions that share an instruction", () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);

      // aes32dsi is shared between rv32_zknd, rv32_zk, rv32_zkn
      assert.ok(adj.has("rv32_zknd"));
      assert.ok(adj.get("rv32_zknd").has("rv32_zk"));
      assert.ok(adj.get("rv32_zknd").has("rv32_zkn"));
      assert.ok(adj.get("rv32_zk").has("rv32_zkn"));
    });

    it("should include the shared mnemonic in edge data", () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);

      const shared = adj.get("rv32_zknd").get("rv32_zk");
      assert.ok(shared.includes("aes32dsi"));
    });

    it("should be symmetric (undirected)", () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);

      // If A→B exists, B→A must also exist
      for (const [a, neighbors] of adj) {
        for (const [b] of neighbors) {
          assert.ok(
            adj.has(b) && adj.get(b).has(a),
            `Missing reverse edge: ${b} → ${a}`,
          );
        }
      }
    });

    it("should not include extensions with no shared instructions", () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);

      // rv_i has only 'add' which is single-extension
      assert.ok(!adj.has("rv_i"));
    });
  });

  describe("renderTextGraph()", () => {
    it("should produce non-empty output for graphs with edges", () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);
      const lines = renderTextGraph(adj);

      assert.ok(lines.length > 0);
    });

    it("should mention total nodes and edges", () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);
      const text = renderTextGraph(adj).join("\n");

      assert.ok(text.includes("Total nodes"));
      assert.ok(text.includes("Total edges"));
    });
  });

  describe("renderMermaidGraph()", () => {
    it('should start with "graph LR"', () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);
      const mermaid = renderMermaidGraph(adj);

      assert.ok(mermaid.startsWith("graph LR"));
    });

    it("should contain edge definitions with shared counts", () => {
      const adj = buildSharedInstructionGraph(MOCK_INSTR_DICT);
      const mermaid = renderMermaidGraph(adj);

      assert.ok(mermaid.includes("shared"));
      assert.ok(mermaid.includes("-->"));
    });
  });
});

//Edge Cases

describe("Edge Cases", () => {
  it("should handle an empty instruction dictionary", () => {
    const groups = groupByExtension({});
    assert.strictEqual(groups.size, 0);

    const multi = findMultiExtensionInstructions({});
    assert.strictEqual(multi.length, 0);

    const adj = buildSharedInstructionGraph({});
    assert.strictEqual(adj.size, 0);
  });

  it("should handle instructions with empty extension arrays", () => {
    const dict = {
      orphan: {
        encoding: "00000000000000000000000000000000",
        variable_fields: [],
        extension: [],
        match: "0x0",
        mask: "0x0",
      },
    };

    const groups = groupByExtension(dict);
    assert.strictEqual(groups.size, 0);

    const multi = findMultiExtensionInstructions(dict);
    assert.strictEqual(multi.length, 0);
  });

  it("should handle instructions with missing extension field", () => {
    const dict = {
      noext: {
        encoding: "00000000000000000000000000000000",
        variable_fields: [],
        match: "0x0",
        mask: "0x0",
      },
    };

    const groups = groupByExtension(dict);
    assert.strictEqual(groups.size, 0);
  });
});
