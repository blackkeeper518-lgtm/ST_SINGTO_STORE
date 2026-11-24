import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDeckProductIndexFromLocalData, isUsableDeckProductImageUrl, selectFeaturedDeckImageProducts } from "./order-deck-product-index";

const root = process.cwd();
const chatHub = readFileSync(resolve(root, "client/src/pages/ChatHub.tsx"), "utf8");
const deckSource = readFileSync(resolve(root, "client/public/order-deck.html"), "utf8");
const deckFrame = readFileSync(resolve(root, "client/src/components/chat/OrderDeckFrame.tsx"), "utf8");

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

  it("allows a pinned local editor image through the dock and rejects unsafe or oversized data URLs", () => {
    const localImage = "data:image/webp;base64,dGVzdA==";
    expect(isUsableDeckProductImageUrl(localImage)).toBe(true);
    expect(isUsableDeckProductImageUrl("javascript:alert(1)")).toBe(false);
    expect(isUsableDeckProductImageUrl(`data:image/webp;base64,${"a".repeat(8_100_000)}`)).toBe(false);
    expect(selectFeaturedDeckImageProducts([
      { product: "pinned-local", terms: [], imageUrls: [localImage], featured: true },
      { product: "unpinned-local", terms: [], imageUrls: [localImage], featured: false },
    ]).map(item => item.product)).toEqual(["pinned-local"]);
  });

  it("builds the dock index directly from Deck local settings and its IndexedDB image records", () => {
    const products = buildDeckProductIndexFromLocalData({
      pageName: "ST Singto",
      activePageId: "page-b",
      pages: [
        { id: "page-a", name: "BB", selected: ["BB-only"] },
        { id: "page-b", name: "ST Singto", selected: ["PINNED"] },
      ],
      productNames: ["PINNED", "UNPINNED"],
      productInfo: { PINNED: { name: "สินค้าแนะนำ", blocks: [{ title: "SKU", content: "PIN-01" }] } },
      images: [
        { product: "PINNED", src: "data:image/webp;base64,dGVzdA==", createdAt: "2026-11-24T00:00:00Z" },
        { product: "UNPINNED", src: "https://cdn.example/unpinned.jpg", createdAt: "2026-11-24T00:00:00Z" },
      ],
    });

    expect(selectFeaturedDeckImageProducts(products).map(item => item.product)).toEqual(["PINNED"]);
    expect(products[0].terms).toContain("PIN-01");
  });

  it("passes local images from pinned editor records through the Deck index and iframe bridge", () => {
    expect(deckSource).toContain("const embeddedPinnedImage=featured&&imageUrl.length<=8100000");
    expect(deckSource).toContain("const imageUrls=remoteImage||embeddedPinnedImage?[imageUrl]:[]");
    expect(deckFrame).toContain("isUsableDeckProductImageUrl(url)");
  });

  it("keeps the pinned product shortcuts on the chat and hides them after an image send succeeds", () => {
    expect(chatHub).toContain("productFloatVisible && !productFloatDismissed && featuredImageProducts.length");
    expect(chatHub).toContain("onClick={() => requestDeckProductImages(item.product, item.imageUrls)}");
    expect(chatHub).toContain("if (replyImages.length > 0) setProductFloatDismissed(true);");
    expect(chatHub).toContain("if (!selectedRoomKey) { setDeckImageProducts([]); return; }");
    expect(chatHub).toContain("window.setTimeout(() => setProductFloatVisible(true), 3000)");
    expect(chatHub).toContain("loadDeckProductIndexForPage(selected?.pageName ?? \"\")");
    expect(chatHub).toContain("absolute bottom-[112px] right-3 z-30 w-[min(420px,calc(100%-1.5rem))]");
  });

  it("hands the cached latest customer text into the Deck immediately and checks the server in the background", () => {
    expect(chatHub).toContain("const refreshed = await messagesQuery.refetch();");
    expect(chatHub).toContain("getImportableLatestCustomerMessage(messagesQuery.data ?? [])");
    expect(chatHub).toContain("stageDeckMessage(cachedLatest);");
    expect(chatHub).toContain("if (!cachedLatest || freshLatest.id !== cachedLatest.id || freshLatest.text !== cachedLatest.text) stageDeckMessage(freshLatest);");
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
