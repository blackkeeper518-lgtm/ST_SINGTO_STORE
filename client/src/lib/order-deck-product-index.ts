export type DeckImageProduct = {
  product: string;
  terms: string[];
  imageUrls: string[];
  featured: boolean;
};

export function selectFeaturedDeckImageProducts(products: readonly DeckImageProduct[]): DeckImageProduct[] {
  return products
    .filter(item => item.featured && item.imageUrls.some(url => /^https:\/\//i.test(url)))
    .slice(0, 8);
}
