import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const deckSource = readFileSync(resolve(root, "DRΛKSIDE-Space-Vault-neon.html"), "utf8");
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
});
