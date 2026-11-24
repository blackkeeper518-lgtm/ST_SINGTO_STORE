import type { DeckImageProduct } from "@/lib/order-deck-product-index";

type MobileInboxProductDockProps = {
  products: DeckImageProduct[];
  visible: boolean;
  dismissed: boolean;
  disabled: boolean;
  onSelect: (product: string) => void;
  onDismiss: () => void;
};

export function MobileInboxProductDock({ products, visible, dismissed, disabled, onSelect, onDismiss }: MobileInboxProductDockProps) {
  if (!visible || dismissed || products.length === 0) return null;
  return <aside aria-label="สินค้าไฮไลท์ที่ปักหมุดสำหรับแชท" className="mobile-inbox-product-dock">
    <div className="mobile-inbox-product-dock__panel">
      <div className="mobile-inbox-product-dock__header">
        <span>📌 สินค้าไฮไลท์</span>
        <button type="button" onClick={onDismiss} aria-label="ซ่อนสินค้าไฮไลท์">ซ่อน ×</button>
      </div>
      <div className="mobile-inbox-product-dock__items">
        {products.map(item => <button key={item.product} type="button" onClick={() => onSelect(item.product)} disabled={disabled} title={`เตรียมรูป ${item.product} · ยังไม่ส่ง`}>
          <img src={item.imageUrls[0]} alt="" loading="lazy" />
          <span>{item.product}</span>
        </button>)}
      </div>
    </div>
  </aside>;
}
