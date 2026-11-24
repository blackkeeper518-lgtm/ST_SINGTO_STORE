export type DeckImageProduct = {
  product: string;
  terms: string[];
  imageUrls: string[];
  featured: boolean;
};

const MAX_EMBEDDED_IMAGE_URL_LENGTH = 8_100_000;
const IMAGE_DB_NAME = "drakside-image-vault";
const IMAGE_STORE_NAME = "images";

export function isUsableDeckProductImageUrl(url: string): boolean {
  return /^https:\/\//i.test(url)
    || (url.length <= MAX_EMBEDDED_IMAGE_URL_LENGTH && /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/i.test(url));
}

export function selectFeaturedDeckImageProducts(products: readonly DeckImageProduct[]): DeckImageProduct[] {
  return products
    .filter(item => item.featured && item.imageUrls.some(isUsableDeckProductImageUrl))
    .slice(0, 8);
}

type DeckImageRecord = {
  product?: unknown;
  src?: unknown;
  vaultUrl?: unknown;
  createdAt?: unknown;
  name?: unknown;
};

type DeckAdPage = { id?: unknown; name?: unknown; selected?: unknown };

function parseStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function buildDeckProductIndexFromLocalData(input: {
  pageName: string;
  activePageId: string;
  pages: DeckAdPage[];
  productNames: string[];
  productInfo: Record<string, unknown>;
  images: DeckImageRecord[];
}): DeckImageProduct[] {
  const pageNameKey = input.pageName.trim().toLocaleLowerCase("th-TH");
  const activePage = input.pages.find(page => page.id === input.activePageId) ?? input.pages[0];
  const matchingPage = input.pages.find(page => String(page.name ?? "").trim().toLocaleLowerCase("th-TH") === pageNameKey) ?? activePage;
  const pinnedNames = new Set(Array.isArray(matchingPage?.selected)
    ? matchingPage.selected.filter((name): name is string => typeof name === "string")
    : []);

  return [...new Set(input.productNames.filter(name => typeof name === "string" && name.trim()).slice(0, 500))].map(product => {
    const info = input.productInfo[product] && typeof input.productInfo[product] === "object"
      ? input.productInfo[product] as Record<string, unknown>
      : {};
    const blocks = Array.isArray(info.blocks) ? info.blocks : [];
    const detailTerms = blocks.flatMap(block => {
      if (!block || typeof block !== "object") return [];
      const item = block as { title?: unknown; content?: unknown };
      return [item.title, item.content];
    });
    const terms = [...new Set([product, info.name, ...detailTerms]
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()) && value.length <= 160)
      .map(value => value.trim()))].slice(0, 32);
    const image = input.images
      .filter(record => (record.product || "ทั่วไป") === product)
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))[0];
    const imageUrl = String(image?.vaultUrl || image?.src || "");

    return {
      product,
      terms,
      imageUrls: imageUrl && isUsableDeckProductImageUrl(imageUrl) ? [imageUrl] : [],
      featured: pinnedNames.has(product),
    };
  });
}

async function readDeckImageRecords(): Promise<DeckImageRecord[]> {
  if (typeof window === "undefined" || !window.indexedDB) return [];
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        request.result.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("เปิดคลังภาพสินค้าไม่ได้"));
    request.onblocked = () => reject(new Error("คลังภาพสินค้ากำลังถูกใช้งาน"));
  });

  try {
    return await new Promise<DeckImageRecord[]>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE_NAME, "readonly");
      const request = transaction.objectStore(IMAGE_STORE_NAME).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result as DeckImageRecord[] : []);
      request.onerror = () => reject(request.error ?? new Error("อ่านคลังภาพสินค้าไม่ได้"));
      transaction.onabort = () => reject(transaction.error ?? new Error("อ่านคลังภาพสินค้าถูกยกเลิก"));
    });
  } finally {
    db.close();
  }
}

/** Read Deck's browser-local pin settings and image vault without mounting or opening its iframe. */
export async function loadDeckProductIndexForPage(pageName: string): Promise<DeckImageProduct[]> {
  if (typeof window === "undefined") return [];
  const storedPages = parseStoredJson<unknown>("drak-ad-pages-v1", []);
  const storedProductNames = parseStoredJson<unknown>("drak-image-products-v1", ["ทั่วไป"]);
  const storedProductInfo = parseStoredJson<unknown>("drak-product-info-v1", {});
  const pages = Array.isArray(storedPages) ? storedPages as DeckAdPage[] : [];
  const productNames = Array.isArray(storedProductNames) ? storedProductNames.filter((name): name is string => typeof name === "string") : ["ทั่วไป"];
  const productInfo = storedProductInfo && typeof storedProductInfo === "object" && !Array.isArray(storedProductInfo)
    ? storedProductInfo as Record<string, unknown>
    : {};
  let activePageId = "";
  try { activePageId = window.localStorage.getItem("drak-active-ad-page-v1") || ""; } catch { /* Continue with first available page. */ }
  let images: DeckImageRecord[] = [];
  try {
    images = await readDeckImageRecords();
  } catch {
    // Keep the pinned product names available even if the browser image vault is temporarily unavailable.
  }
  return buildDeckProductIndexFromLocalData({ pageName, activePageId, pages, productNames, productInfo, images });
}
