-- CreateIndex
CREATE INDEX "images_productId_idx" ON "images"("productId");

-- CreateIndex
CREATE INDEX "messages_receiverId_createdAt_idx" ON "messages"("receiverId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "orders_buyerId_createdAt_idx" ON "orders"("buyerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payouts_vendorId_createdAt_idx" ON "payouts"("vendorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_vendorId_createdAt_idx" ON "products"("vendorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_createdAt_idx" ON "products"("categoryId", "isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_price_idx" ON "products"("price");

-- CreateIndex
CREATE INDEX "reviews_productId_idx" ON "reviews"("productId");

-- CreateIndex
CREATE INDEX "reviews_productId_createdAt_idx" ON "reviews"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "vendors_status_createdAt_idx" ON "vendors"("status", "createdAt" DESC);
