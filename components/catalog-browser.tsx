"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Money } from "@/components/crm-ui";
import { norm } from "@/lib/format";
import { CATEGORIES, policyPrice } from "@/lib/policy";
import { PRODUCTS } from "@/lib/products";
import type { DiscountId, Product } from "@/lib/types";

export function CatalogBrowser({
  discountId,
  onAdd,
}: {
  discountId: DiscountId;
  onAdd?: (product: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const needle = norm(query);

  const shown = useMemo(() => {
    return PRODUCTS.filter((product) => {
      if (category && product.category !== category) return false;
      if (!needle) return true;
      const haystack = norm(
        [product.article, product.name, product.category, product.subcategory, product.brand, product.specs].join(" "),
      );
      return haystack.includes(needle);
    }).sort((a, b) => a.order - b.order);
  }, [category, needle]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of PRODUCTS) map.set(product.category, (map.get(product.category) ?? 0) + 1);
    return map;
  }, []);

  return (
    <div className="min-w-0 space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Артикул, название или категория"
        aria-label="Поиск по каталогу"
      />
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Категории">
        <Button type="button" size="sm" variant={category === null ? "default" : "outline"} className="rounded-full" onClick={() => setCategory(null)}>
          Все {PRODUCTS.length}
        </Button>
        {CATEGORIES.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={category === item ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setCategory(item)}
          >
            {item} {counts.get(item) ?? 0}
          </Button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title="Ничего не нашлось"
          text={category ? `В категории «${category}» нет позиций по запросу «${query.trim()}».` : "Сбросьте поиск или выберите другую категорию."}
          action={
            <Button type="button" variant="outline" onClick={() => { setQuery(""); setCategory(null); }}>
              Сбросить поиск
            </Button>
          }
        />
      ) : (
        <ul className="w-full min-w-0 max-w-full divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {shown.map((product) => {
            const priced = policyPrice(product, discountId);
            return (
              <li key={product.id} className="flex w-full min-w-0 max-w-full flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{product.article}</span>
                    <span className="break-words">{product.category}</span>
                    {product.priceOrigin === "public-retail" ? <span>Розница открытого источника</span> : null}
                  </div>
                  <p className="mt-1 break-words text-sm font-medium">{product.name}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {[product.brand, product.subcategory, product.powerKw ? `${product.powerKw} кВт` : null, product.dnMm ? `DN ${product.dnMm}` : null, product.unit]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{priced.label}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-base font-semibold">
                    <Money value={priced.price} />
                  </p>
                  {onAdd ? (
                    <Button type="button" size="sm" onClick={() => onAdd(product)}>
                      В КП
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
