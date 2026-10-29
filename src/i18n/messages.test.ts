import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

type Tree = { [key: string]: unknown };

function leaves(tree: Tree, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of leaves(value as Tree, path)) out.set(k, v);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

describe("messages", () => {
  const frLeaves = leaves(fr);
  const enLeaves = leaves(en);

  it("has the same keys in French and English", () => {
    expect([...enLeaves.keys()].sort()).toEqual([...frLeaves.keys()].sort());
  });

  it("has no empty strings", () => {
    const empty = [...frLeaves, ...enLeaves].filter(([, v]) => v === "").map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it("uses the same placeholders in both languages", () => {
    // `{name}` or `{name, plural, …}` — not plural branch text like `{# items}`.
    const vars = (v: unknown) =>
      typeof v === "string"
        ? (v.match(/(?<!(?:=\d+|zero|one|two|few|many|other) )\{(\w+)(?=[,}])/g) ?? []).sort()
        : [];
    const mismatched = [...frLeaves.keys()].filter(
      (k) => JSON.stringify(vars(frLeaves.get(k))) !== JSON.stringify(vars(enLeaves.get(k))),
    );
    expect(mismatched).toEqual([]);
  });
});
