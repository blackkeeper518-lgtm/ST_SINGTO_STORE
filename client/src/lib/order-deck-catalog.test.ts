import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const deckSource = readFileSync(resolve(root, "DRΛKSIDE-Space-Vault-neon.html"), "utf8");
const deckPublic = readFileSync(resolve(root, "client/public/order-deck.html"), "utf8");
const deckFrame = readFileSync(resolve(root, "client/src/components/chat/OrderDeckFrame.tsx"), "utf8");
const supabase = readFileSync(resolve(root, "server/supabase.ts"), "utf8");

describe("ORDER DECK product catalog integration", () => {
  it("normalizes product text from a shared scope available to all deck closures", () => {
    const declaration = deckSource.match(/function normalizeProductText\(value\)\{[^\n]+\}/)?.[0];
    expect(declaration).toBeTruthy();
    const normalize = new Function(`${declaration}; return normalizeProductText;`)() as (value: string) => string;

    expect(normalize("VESS MINT X MANGO")).toBe("vessmintxmango");
    expect(normalize("เวส มะม่วง")).toBe("เวสมะม่วง");
    expect(deckSource.indexOf(declaration!)).toBeLessThan(deckSource.indexOf("/* ORDER FORGE · browser-local parser"));
    expect(deckSource.match(/(?:const|let) normalizeProductText\s*=/g)).toBeNull();
  });

  it("shares catalog rows and exposes the product-index callback across the separate deck closures", () => {
    expect(deckSource.match(/let productCatalog=\[\];/g)).toHaveLength(1);
    expect(deckSource).toContain("window.ST_ORDER_DECK_NOTIFY_PRODUCT_INDEX=notifyParentProductIndex");
    expect(deckSource).toContain("window.ST_ORDER_DECK_NOTIFY_PRODUCT_INDEX?.();");
  });

  it("reads active product master rows from ROOM 04 VAULT using server-side project credentials", () => {
    const catalogBranch = deckFrame.match(/operation === "productCatalog"[\s\S]*?\n\s*\} else if \(operation === "scriptCardsList"\)/)?.[0];
    expect(catalogBranch).toBeTruthy();
    expect(catalogBranch).toContain('project: "vault"');
    expect(catalogBranch).toContain('table: "🛒product_master"');
    expect(catalogBranch).toContain('status: "eq.ACTIVE"');
    expect(catalogBranch).not.toContain('project: "main"');
  });

  it("allows the bounded product fields to staff and includes the catalog in ROOM 04 connection checks", () => {
    expect(supabase).toContain('"vault:🛒product_master": new Set(["emoji", "master_sku", "th_name", "name_standard", "brand", "variant", "unit_price", "alias", "status"])');
    expect(supabase).toContain('{ table: "🛒product_master", label: "Product Catalog" }');
  });

  it("maps the requested product markers to their lanes and leaves unknown markers unclassified", () => {
    const declaration = deckSource.match(/function inferProductLaneFromText\(value\)\{[^\n]+\}/)?.[0];
    expect(declaration).toBeTruthy();
    const infer = new Function(`${declaration}; return inferProductLaneFromText;`)() as (value: string) => string;
    for (const marker of ["🟥", "🟨", "⬛"]) expect(infer(marker)).toBe("🔥");
    for (const marker of ["🟩", "🟦"]) expect(infer(marker)).toBe("❄");
    for (const marker of ["🟪", "🥭", "🍎", "🍍", "🍇", "🍏", "🍓", "🍉"]) expect(infer(marker)).toBe("🍉");
    expect(infer("plain product name")).toBe("");
  });

  it("keeps page filters view-only and removes chosen products from the page without deleting the catalog", () => {
    expect(deckSource).toContain('id="pageProductFilters"');
    expect(deckSource).toContain("activePageProductFilter==='💢'");
    expect(deckSource).toContain("return inScope&&passesPageFilter");
    expect(deckSource).toContain('id="chooseAdProducts"');
    expect(deckSource).toContain("＋ เลือกสินค้าให้เพจนี้");
    expect(deckSource).toContain('id="selectAllPageProducts"');
    expect(deckSource).toContain('id="removeSelectedFromPage"');
    expect(deckSource).toContain("const inScope=inPageView?selected.has(name):");
    expect(deckSource).toContain("page.selected=page.selected.filter(name=>!names.has(name))");
    expect(deckSource).toContain("สินค้าและภาพยังอยู่ในคลังกลาง");
    expect(deckSource).toContain('id="adProductFilters"');
    expect(deckSource).toContain("activeAdProductFilter==='💢'");
    expect(deckSource).toContain("cb.checked=currentAdPage().selected.includes(name)");
    expect(deckSource).toContain("(isUnknown?'💢 ':'')");
    expect(deckSource).toContain("function groupOf(name){return productGroups[name]||inferredProductLane(name)||''}");
    expect(deckPublic).toBe(deckSource);
  });
});
