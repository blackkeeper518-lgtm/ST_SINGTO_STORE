import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectFeaturedDeckImageProducts } from "./order-deck-product-index";

const root = process.cwd();
const chatHub = readFileSync(resolve(root, "client/src/pages/ChatHub.tsx"), "utf8");
const deckSource = readFileSync(resolve(root, "DRΛKSIDE-Space-Vault-neon.html"), "utf8");

describe("Order Deck floating product shortcuts", () => {
  it("shows only page-featured products with usable HTTPS images and caps the ribbon at eight", () => {
    const products = Array.from({ length: 10 }, (_, index) => ({
      product: `product-${index}`,
      terms: [],
      imageUrls: [`https://cdn.example/${index}.jpg`],
      featured: true,
    }));
    products.push(
      { product: "not-pinned", terms: [], imageUrls: ["https://cdn.example/not-pinned.jpg"], featured: false },
      { product: "no-image", terms: [], imageUrls: [], featured: true },
      { product: "local-only", terms: [], imageUrls: ["blob:https://app.example/image"], featured: true },
    );

    expect(selectFeaturedDeckImageProducts(products).map(item => item.product)).toEqual(
      Array.from({ length: 8 }, (_, index) => `product-${index}`),
    );
  });

  it("refreshes the active room when the Deck opens and asks the iframe to import the latest customer text", () => {
    expect(chatHub).toContain("const refreshed = await messagesQuery.refetch();");
    expect(chatHub).toContain("getLatestBBChatCustomerMessage(latestMessages ?? [])");
    expect(chatHub).toContain("setOrderDeckMessageRequest({ id: requestId");
    expect(chatHub).toContain("orderDeckRequestRoomKeyRef.current !== requestRoomKey");
    expect(chatHub).toContain('messageMode="latest"');
    expect(chatHub).toContain("onMessageRequestHandled=");
  });

  it("renders an actionable setup hint after the delayed reveal when no pinned image can appear", () => {
    expect(chatHub).toContain("productFloatVisible && !productFloatDismissed && !featuredImageProducts.length");
    expect(chatHub).toContain("ตั้งค่าสินค้ารูปแนะนำ");
  });

  it("clears the Deck draft instead of retaining a previous room's message when no latest text can be imported", () => {
    expect(deckSource).toContain("clearSelectedCustomerMessage===true");
    expect(deckSource).toContain("raw.value=''");
    expect(deckSource).toBe(readFileSync(resolve(root, "client/public/order-deck.html"), "utf8"));
  });
});
