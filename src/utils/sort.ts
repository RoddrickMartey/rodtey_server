type SortOrder = 'asc' | 'desc';

type ProductSortKey = 'price_asc' | 'price_desc' | 'newest' | 'popular';

export const productSortMap: Record<ProductSortKey, object> = {
  price_asc: { price: 'asc' as SortOrder },
  price_desc: { price: 'desc' as SortOrder },
  newest: { createdAt: 'desc' as SortOrder },
  popular: { reviews: { _count: 'desc' as SortOrder } },
};

export const getProductSort = (sort?: string): object =>
  (sort && productSortMap[sort as ProductSortKey]) || { createdAt: 'desc' };
