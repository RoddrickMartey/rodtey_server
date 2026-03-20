# Rodtey API Documentation

**Base URL:** `http://localhost:5000/api/v1`  
**Version:** 1.0.0  
**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL (Neon) · Socket.io · Paystack

---

## Table of Contents

- [Authentication](#authentication)
- [Auth Endpoints](#auth-endpoints)
- [User Endpoints](#user-endpoints)
- [Vendor Endpoints](#vendor-endpoints)
- [Category Endpoints](#category-endpoints)
- [Product Endpoints](#product-endpoints)
- [Order Endpoints](#order-endpoints)
- [Review Endpoints](#review-endpoints)
- [Upload Endpoints](#upload-endpoints)
- [Payment Endpoints](#payment-endpoints)
- [Message Endpoints](#message-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Socket.io Events](#socketio-events)
- [Rate Limiting](#rate-limiting)
- [Error Responses](#error-responses)

---

## Authentication

Rodtey uses a **dual cookie auth system**:

| Cookie         | Expiry     | Purpose                          |
| -------------- | ---------- | -------------------------------- |
| `accessToken`  | 15 minutes | Sent on every protected request  |
| `refreshToken` | 7 days     | Used to issue a new access token |

Both cookies are `httpOnly`, `secure` (in production), and `sameSite: strict`.

### How it works

```
1. Login → accessToken + refreshToken cookies set
2. accessToken expires after 15 min → cookie is gone
3. Frontend detects 401 + { refresh: true }
4. Frontend calls POST /auth/refresh silently
5. New accessToken cookie issued
6. Frontend retries original request
7. refreshToken expires after 7 days → user must login again
```

### Frontend axios setup

```ts
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // required — sends cookies automatically
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.refresh && !original._retry) {
      original._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(original);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
```

---

## Roles

| Role     | Description                                    |
| -------- | ---------------------------------------------- |
| `USER`   | Default role. Can browse, order, review        |
| `VENDOR` | Can manage store, products, view vendor orders |
| `ADMIN`  | Full access including category management      |

> A `USER` becomes a `VENDOR` automatically when they create a store.

---

## Standard Response Shape

**Success:**

```json
{
  "success": true,
  "data": {}
}
```

**Paginated:**

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Something went wrong",
  "refresh": true,
  "logout": true,
  "validationError": true,
  "fields": { "email": "Invalid email" }
}
```

---

## Auth Endpoints

### POST `/auth/register`

Register a new user.

**Body:**

```json
{
  "name": "Roddrick Martey",
  "email": "roddrick@example.com",
  "password": "Password1",
  "role": "USER"
}
```

| Field      | Type   | Required | Rules                                  |
| ---------- | ------ | -------- | -------------------------------------- |
| `name`     | string | yes      | 2–50 chars                             |
| `email`    | string | yes      | valid email                            |
| `password` | string | yes      | min 8 chars, 1 uppercase, 1 number     |
| `role`     | enum   | no       | `USER` or `VENDOR`, defaults to `USER` |

**Response `201`:**

```json
{ "success": true }
```

---

### POST `/auth/login`

Login and receive auth cookies.

**Body:**

```json
{
  "email": "roddrick@example.com",
  "password": "Password1"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Roddrick Martey",
    "email": "roddrick@example.com",
    "role": "USER",
    "avatar": "https://res.cloudinary.com/..."
  }
}
```

> Sets `accessToken` and `refreshToken` cookies.

---

### POST `/auth/logout`

Logout and clear auth cookies.

**Response `200`:**

```json
{ "success": true, "message": "Logged out successfully" }
```

---

### POST `/auth/refresh`

Issue a new `accessToken` cookie using the `refreshToken` cookie.

**Response `200`:**

```json
{ "success": true }
```

**Error (refresh token invalid/expired):**

```json
{ "success": false, "message": "Invalid refresh token", "logout": true }
```

---

### GET `/auth/me`

🔒 Requires authentication.

Get the currently logged in user.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Roddrick Martey",
    "email": "roddrick@example.com",
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "avatar": { "url": "https://...", "publicId": "rodtey/avatars/..." }
  }
}
```

---

## User Endpoints

### GET `/users/me`

🔒 Requires authentication.

Get the current user's full profile including vendor info and counts.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Roddrick Martey",
    "email": "roddrick@example.com",
    "role": "VENDOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "avatar": { "id": "uuid", "url": "https://...", "publicId": "..." },
    "vendor": {
      "id": "uuid",
      "storeName": "Martey Stores",
      "status": "APPROVED",
      "logo": { "url": "..." }
    },
    "_count": { "orders": 3, "reviews": 5 }
  }
}
```

---

### PATCH `/users/me`

🔒 Requires authentication.

Update name or email. All fields optional.

**Body:**

```json
{
  "name": "Roddrick K. Martey",
  "email": "new@example.com"
}
```

> If email is changed, checks it is not already taken.

---

### PATCH `/users/me/password`

🔒 Requires authentication.

Change password. Invalidates all existing sessions on success.

**Body:**

```json
{
  "currentPassword": "Password1",
  "newPassword": "NewPassword2"
}
```

| Field             | Rules                                                        |
| ----------------- | ------------------------------------------------------------ |
| `currentPassword` | must match current password                                  |
| `newPassword`     | min 8 chars, 1 uppercase, 1 number, must differ from current |

> On success, `refreshToken` is cleared — user must login again on all devices.

---

### DELETE `/users/me`

🔒 Requires authentication.

Delete own account. Requires password confirmation.

**Body:**

```json
{ "password": "Password1" }
```

> Admin accounts cannot be deleted via this endpoint.

---

## Vendor Endpoints

### GET `/vendors`

Public. Get all approved vendors.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `page` | number | default `1` |
| `limit` | number | default `10` |
| `search` | string | search by store name |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "storeName": "Martey Stores",
      "description": "...",
      "createdAt": "...",
      "logo": { "url": "https://..." },
      "_count": { "products": 12 }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### GET `/vendors/me`

🔒 Requires authentication.

Get the current user's vendor store.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "storeName": "Martey Stores",
    "description": "...",
    "status": "APPROVED",
    "logo": { "url": "...", "publicId": "..." },
    "banner": { "url": "...", "publicId": "..." },
    "_count": { "products": 5 }
  }
}
```

---

### GET `/vendors/:id`

Public. Get a vendor by ID.

> Returns `404` if vendor is not `APPROVED`.

---

### POST `/vendors`

🔒 Requires authentication.

Create a vendor store. Upgrades user role to `VENDOR`.

**Body:**

```json
{
  "storeName": "Martey Stores",
  "description": "Quality products from Ghana"
}
```

| Field         | Type   | Required | Rules              |
| ------------- | ------ | -------- | ------------------ |
| `storeName`   | string | yes      | 2–50 chars, unique |
| `description` | string | no       | max 500 chars      |

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "storeName": "Martey Stores",
    "status": "PENDING"
  }
}
```

> Store starts as `PENDING` and must be approved by an admin.

---

### PATCH `/vendors/me`

🔒 Requires `VENDOR` role.

Update store details.

**Body:** (all fields optional)

```json
{
  "storeName": "Martey Premium Stores",
  "description": "Updated description"
}
```

---

## Category Endpoints

### GET `/categories`

Public. Get all categories.

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "image": { "url": "https://..." },
      "_count": { "products": 24 }
    }
  ]
}
```

---

### GET `/categories/:slug`

Public. Get a single category by slug.

---

### POST `/categories`

🔒 Requires `ADMIN` role.

Create a category. Slug is auto-generated from name.

**Body:**

```json
{ "name": "Men's Clothing" }
```

> Generates slug: `mens-clothing`

---

### PATCH `/categories/:id`

🔒 Requires `ADMIN` role.

Update category. Slug regenerated if name changes.

---

### DELETE `/categories/:id`

🔒 Requires `ADMIN` role.

> Fails with `400` if category has products attached.

---

## Product Endpoints

### GET `/products`

Public. Get all active products with filters.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `page` | number | default `1` |
| `limit` | number | default `12` |
| `search` | string | search by name |
| `categoryId` | uuid | filter by category |
| `vendorId` | uuid | filter by vendor |
| `minPrice` | number | minimum price |
| `maxPrice` | number | maximum price |
| `sort` | string | `price_asc`, `price_desc`, `newest`, `popular` |

---

### GET `/products/me`

🔒 Requires `VENDOR` role.

Get the vendor's own products including inactive ones.

**Query params:** `page`, `limit`

---

### GET `/products/:slug`

Public. Get a single product with reviews and vendor info.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Air Force 1",
    "slug": "air-force-1",
    "description": "...",
    "price": "149.99",
    "stock": 50,
    "isActive": true,
    "images": [{ "id": "uuid", "url": "https://..." }],
    "category": { "id": "uuid", "name": "Footwear", "slug": "footwear" },
    "vendor": { "id": "uuid", "storeName": "Martey Stores", "logo": { "url": "..." } },
    "reviews": [],
    "_count": { "reviews": 0 }
  }
}
```

---

### POST `/products`

🔒 Requires `VENDOR` role. Store must be `APPROVED`.

Create a product. Images are added separately via the upload endpoint.

**Body:**

```json
{
  "name": "Air Force 1",
  "description": "A classic Nike sneaker with clean white leather upper",
  "price": 149.99,
  "stock": 50,
  "categoryId": "uuid"
}
```

| Field         | Type   | Required | Rules                     |
| ------------- | ------ | -------- | ------------------------- |
| `name`        | string | yes      | 2–100 chars               |
| `description` | string | yes      | min 10 chars              |
| `price`       | number | yes      | positive number           |
| `stock`       | number | no       | whole number, default `0` |
| `categoryId`  | uuid   | yes      | must exist                |

---

### PATCH `/products/:id`

🔒 Requires `VENDOR` role. Must own the product.

Update product. Slug regenerated if name changes.

**Body:** (all fields optional)

```json
{
  "name": "Air Force 1 Low",
  "price": 139.99,
  "stock": 30
}
```

---

### PATCH `/products/:id/toggle`

🔒 Requires `VENDOR` role. Must own the product.

Toggle product `isActive` status on/off.

---

### DELETE `/products/:id`

🔒 Requires `VENDOR` role. Must own the product.

---

## Order Endpoints

### POST `/orders`

🔒 Requires authentication.

Create a new order. Validates stock and decrements on creation.

**Body:**

```json
{
  "items": [
    { "productId": "uuid", "quantity": 2 },
    { "productId": "uuid", "quantity": 1 }
  ],
  "shippingAddress": {
    "fullName": "Roddrick Martey",
    "phone": "+233244000000",
    "address": "123 Main St",
    "city": "Accra",
    "country": "Ghana"
  }
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "total": "299.97",
    "status": "PENDING",
    "shippingAddress": {},
    "items": []
  }
}
```

---

### GET `/orders/me`

🔒 Requires authentication.

Get the current buyer's orders.

**Query params:** `page`, `limit`

---

### GET `/orders/vendor`

🔒 Requires `VENDOR` role.

Get orders containing the vendor's products.

**Query params:** `page`, `limit`, `status`

---

### GET `/orders/:id`

🔒 Requires authentication.

Get a single order. Only accessible by the buyer or a vendor whose product is in the order.

---

### PATCH `/orders/:id/status`

🔒 Requires `VENDOR` role.

Update order status.

**Body:**

```json
{ "status": "SHIPPED" }
```

| Value       | Description     |
| ----------- | --------------- |
| `CONFIRMED` | Order confirmed |
| `SHIPPED`   | Order shipped   |
| `DELIVERED` | Order delivered |
| `CANCELLED` | Order cancelled |

> Cannot update `CANCELLED` or `DELIVERED` orders.

---

### PATCH `/orders/:id/cancel`

🔒 Requires authentication. Must be the buyer.

Cancel a pending order. Restores stock.

> Only `PENDING` orders can be cancelled.

---

## Review Endpoints

### GET `/reviews/product/:productId`

Public. Get paginated reviews for a product including average rating.

**Response `200`:**

```json
{
  "success": true,
  "data": [],
  "meta": { "averageRating": 4.5 },
  "pagination": {}
}
```

---

### GET `/reviews/me`

🔒 Requires authentication.

Get the current user's reviews.

---

### POST `/reviews`

🔒 Requires authentication.

> Only buyers who have a `DELIVERED` order containing the product can review it.

**Body:**

```json
{
  "productId": "uuid",
  "rating": 5,
  "comment": "Excellent product, fast delivery!"
}
```

| Field       | Type   | Required | Rules         |
| ----------- | ------ | -------- | ------------- |
| `productId` | uuid   | yes      | must exist    |
| `rating`    | number | yes      | 1–5           |
| `comment`   | string | no       | max 500 chars |

---

### PATCH `/reviews/:id`

🔒 Requires authentication. Must own the review.

---

### DELETE `/reviews/:id`

🔒 Requires authentication. Owner or `ADMIN` can delete.

---

## Upload Endpoints

All uploads accept `base64` encoded image strings. Images are converted to **WebP** before uploading to Cloudinary.

### POST `/upload/single`

🔒 Requires authentication.

Upload a single image.

**Body:**

```json
{
  "base64": "data:image/jpeg;base64,/9j/4AAQ...",
  "type": "avatar",
  "refId": "user-uuid",
  "altText": "Profile photo"
}
```

| `type`          | `refId`     | Who can upload                             |
| --------------- | ----------- | ------------------------------------------ |
| `avatar`        | user id     | the user themselves                        |
| `vendor_logo`   | vendor id   | the vendor owner                           |
| `vendor_banner` | vendor id   | the vendor owner                           |
| `category`      | category id | `ADMIN` only                               |
| `product`       | product id  | the vendor owner (max 1 via this endpoint) |

> Replaces existing image for `avatar`, `vendor_logo`, `vendor_banner`, `category`.

---

### POST `/upload/multiple`

🔒 Requires authentication.

Upload multiple product images (products only, max 5 total).

**Body:**

```json
{
  "type": "product",
  "refId": "product-uuid",
  "images": [
    { "base64": "data:image/jpeg;base64,...", "altText": "Front view" },
    { "base64": "data:image/jpeg;base64,...", "altText": "Side view" }
  ]
}
```

---

### DELETE `/upload/:id`

🔒 Requires authentication. Must own the image.

Deletes image from both Cloudinary and the database.

---

## Payment Endpoints

Rodtey uses **Paystack** for payments in GHS (Ghana Cedis).

### POST `/payments/initialize`

🔒 Requires authentication. Must be the order buyer.

Initialize a Paystack payment for a pending order.

**Body:**

```json
{
  "orderId": "uuid",
  "callbackUrl": "http://localhost:5173/orders/confirm"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "rodtey_uuid_timestamp"
  }
}
```

> Redirect the user to `authorizationUrl` to complete payment.

---

### GET `/payments/verify/:reference`

🔒 Requires authentication.

Verify payment after Paystack redirects back. Confirms order and creates vendor payouts.

**Platform fee:** 10% deducted from vendor payouts.

**Response `200`:**

```json
{ "success": true, "message": "Payment confirmed" }
```

---

### POST `/payments/webhook`

Paystack webhook endpoint. Verifies signature and confirms order as a backup to `/verify`.

> Do not call this from the frontend. Paystack calls it automatically.

---

### GET `/payments/payouts`

🔒 Requires `VENDOR` role.

Get the vendor's payout history.

**Query params:** `page`, `limit`

---

## Message Endpoints

### GET `/messages`

🔒 Requires authentication.

Get all conversations (latest message per conversation partner).

---

### GET `/messages/unread`

🔒 Requires authentication.

Get total unread message count.

**Response `200`:**

```json
{ "success": true, "data": { "count": 3 } }
```

---

### GET `/messages/:receiverId`

🔒 Requires authentication.

Get conversation history with a specific user. Paginated, returned oldest first.

**Query params:** `page`, `limit` (default 20)

---

## Admin Endpoints

All admin endpoints require `ADMIN` role.

### GET `/admin/stats`

Get dashboard overview stats.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 120,
    "totalVendors": 15,
    "totalProducts": 340,
    "totalOrders": 89,
    "pendingVendors": 3,
    "pendingPayouts": 7,
    "totalRevenue": "12450.00",
    "recentOrders": []
  }
}
```

---

### GET `/admin/users`

Get all users with search.

**Query params:** `page`, `limit`, `search` (name or email)

---

### DELETE `/admin/users/:id`

Ban/delete a user.

> Cannot delete admin accounts.

---

### GET `/admin/vendors`

Get all vendors with filter by status.

**Query params:** `page`, `limit`, `search`, `status` (`PENDING`, `APPROVED`, `SUSPENDED`)

---

### PATCH `/admin/vendors/:id/status`

Approve or suspend a vendor store.

**Body:**

```json
{ "status": "APPROVED" }
```

| Value       | Description                      |
| ----------- | -------------------------------- |
| `APPROVED`  | Store goes live, vendor notified |
| `SUSPENDED` | Store hidden, vendor notified    |

> Sends real-time `notification:vendor` event to the vendor.

---

### GET `/admin/orders`

Get all orders with filter by status.

**Query params:** `page`, `limit`, `status`

---

### GET `/admin/payouts`

Get all payouts with filter by status.

**Query params:** `page`, `limit`, `status`

---

### PATCH `/admin/payouts/:id/status`

Update a payout status.

**Body:**

```json
{ "status": "COMPLETED" }
```

| Value        | Description            |
| ------------ | ---------------------- |
| `PROCESSING` | Payout being processed |
| `COMPLETED`  | Payout sent to vendor  |
| `FAILED`     | Payout failed          |

> Sends real-time `notification:payment` event with type `PAYOUT_COMPLETED` to the vendor.

---

## Socket.io Events

Connect with auth token:

```ts
const socket = io('http://localhost:5000', {
  withCredentials: true,
  auth: { token: accessToken },
});
```

### Client → Server

| Event                | Payload                                   | Description           |
| -------------------- | ----------------------------------------- | --------------------- |
| `join:conversation`  | `receiverId: string`                      | Join a chat room      |
| `leave:conversation` | `receiverId: string`                      | Leave a chat room     |
| `message:send`       | `{ receiverId: string, content: string }` | Send a message        |
| `message:read`       | `senderId: string`                        | Mark messages as read |

### Server → Client

| Event                  | Payload                                             | Description                 |
| ---------------------- | --------------------------------------------------- | --------------------------- |
| `message:receive`      | message object                                      | New message in conversation |
| `notification:message` | `{ senderId, messageId, content, createdAt }`       | New message notification    |
| `message:seen`         | `{ by: userId }`                                    | Your messages were read     |
| `notification:order`   | `{ type, orderId, message }`                        | Order status updates        |
| `notification:payment` | `{ type, orderId, message }`                        | Payment confirmations       |
| `notification:review`  | `{ type, productId, productName, rating, message }` | New product review          |

### Notification types

| Event                  | Type                | Sent to |
| ---------------------- | ------------------- | ------- |
| `notification:order`   | `NEW_ORDER`         | vendor  |
| `notification:order`   | `STATUS_UPDATE`     | buyer   |
| `notification:order`   | `CANCELLED`         | vendor  |
| `notification:payment` | `PAYMENT_CONFIRMED` | buyer   |
| `notification:payment` | `PAYOUT_PENDING`    | vendor  |
| `notification:payment` | `PAYOUT_COMPLETED`  | vendor  |
| `notification:review`  | `NEW_REVIEW`        | vendor  |
| `notification:vendor`  | `STORE_APPROVED`    | vendor  |
| `notification:vendor`  | `STORE_SUSPENDED`   | vendor  |

---

## Rate Limiting

| Endpoint group              | Limit        | Window     |
| --------------------------- | ------------ | ---------- |
| All routes (global)         | 100 requests | 15 minutes |
| `POST /auth/login`          | 10 requests  | 15 minutes |
| `POST /auth/register`       | 10 requests  | 15 minutes |
| `POST /auth/refresh`        | 10 requests  | 15 minutes |
| `POST /upload/*`            | 50 requests  | 1 hour     |
| `POST /payments/initialize` | 20 requests  | 1 hour     |
| `GET /payments/verify/*`    | 20 requests  | 1 hour     |

When a limit is exceeded the response is:

```json
{
  "success": false,
  "message": "Too many attempts, please try again in 15 minutes"
}
```

---

## Error Responses

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human readable message",
  "refresh": true,
  "logout": true,
  "validationError": true,
  "fields": { "fieldName": "error message" }
}
```

| Field                   | When present                    | Frontend action                          |
| ----------------------- | ------------------------------- | ---------------------------------------- |
| `refresh: true`         | Access token expired/missing    | Call `/auth/refresh` silently then retry |
| `logout: true`          | Refresh token invalid/expired   | Clear state and redirect to login        |
| `validationError: true` | Zod or Prisma unique constraint | Map `fields` to form errors              |

### HTTP Status Codes

| Code  | Meaning                                     |
| ----- | ------------------------------------------- |
| `200` | Success                                     |
| `201` | Created                                     |
| `400` | Bad request / invalid data                  |
| `401` | Unauthenticated                             |
| `403` | Forbidden / insufficient permissions        |
| `404` | Resource not found                          |
| `409` | Conflict (duplicate email, store name etc.) |
| `422` | Validation failed                           |
| `500` | Internal server error                       |
