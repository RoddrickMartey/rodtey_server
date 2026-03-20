export const paginate = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});
