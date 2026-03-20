import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Categories ──────────────────────────────────────────────────────────────

const categories = [
  {
    name: 'Electronics',
    slug: 'electronics',
    image: {
      url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
      publicId: 'seed/categories/electronics',
      altText: 'Electronics category',
    },
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    image: {
      url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
      publicId: 'seed/categories/fashion',
      altText: 'Fashion category',
    },
  },
  {
    name: 'Food & Drinks',
    slug: 'food-drinks',
    image: {
      url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
      publicId: 'seed/categories/food-drinks',
      altText: 'Food and drinks category',
    },
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    image: {
      url: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80',
      publicId: 'seed/categories/home-living',
      altText: 'Home and living category',
    },
  },
  {
    name: 'Beauty & Health',
    slug: 'beauty-health',
    image: {
      url: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&q=80',
      publicId: 'seed/categories/beauty-health',
      altText: 'Beauty and health category',
    },
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    image: {
      url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
      publicId: 'seed/categories/sports-fitness',
      altText: 'Sports and fitness category',
    },
  },
  {
    name: 'Books & Education',
    slug: 'books-education',
    image: {
      url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80',
      publicId: 'seed/categories/books-education',
      altText: 'Books and education category',
    },
  },
  {
    name: 'Automobiles',
    slug: 'automobiles',
    image: {
      url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80',
      publicId: 'seed/categories/automobiles',
      altText: 'Automobiles category',
    },
  },
  {
    name: 'Agriculture',
    slug: 'agriculture',
    image: {
      url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80',
      publicId: 'seed/categories/agriculture',
      altText: 'Agriculture category',
    },
  },
  {
    name: 'Art & Crafts',
    slug: 'art-crafts',
    image: {
      url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80',
      publicId: 'seed/categories/art-crafts',
      altText: 'Art and crafts category',
    },
  },
  {
    name: 'Babies & Kids',
    slug: 'babies-kids',
    image: {
      url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=80',
      publicId: 'seed/categories/babies-kids',
      altText: 'Babies and kids category',
    },
  },
  {
    name: 'Services',
    slug: 'services',
    image: {
      url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=80',
      publicId: 'seed/categories/services',
      altText: 'Services category',
    },
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

const seed = async () => {
  console.info('\n🌱 Starting Rodtey seed...\n');

  const password = await bcrypt.hash('passworD123', 12);
  const adminPassword = await bcrypt.hash('adminPassworD123', 12);

  // ─── Admin ──────────────────────────────────────────
  console.info('👤 Creating admin...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rodtey.com' },
    update: {},
    create: {
      name: 'Rodtey Admin',
      email: 'admin@rodtey.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.info(`  ✔ Admin: ${admin.email} / Password1 (change this!)`);

  // ─── Buyer ──────────────────────────────────────────
  console.info('\n👤 Creating buyer...');
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@rodtey.com' },
    update: {},
    create: {
      name: 'Kofi Mensah',
      email: 'buyer@rodtey.com',
      password,
      role: 'USER',
    },
  });
  console.info(`  ✔ Buyer: ${buyer.email} / Password1`);

  // ─── Vendor 1 ───────────────────────────────────────
  console.info('\n🏪 Creating vendor 1...');
  const vendor1User = await prisma.user.upsert({
    where: { email: 'ama@rodtey.com' },
    update: {},
    create: {
      name: 'Ama Owusu',
      email: 'ama@rodtey.com',
      password,
      role: 'VENDOR',
    },
  });

  const vendor1 = await prisma.vendor.upsert({
    where: { userId: vendor1User.id },
    update: {},
    create: {
      userId: vendor1User.id,
      storeName: "Ama's Fashion Hub",
      description:
        'Premium African fashion wear, kente cloth, and accessories sourced directly from Ghanaian artisans.',
      status: 'APPROVED',
    },
  });

  // vendor1 logo
  const v1Logo = await prisma.image.findUnique({ where: { vendorLogoId: vendor1.id } });
  if (!v1Logo) {
    await prisma.image.create({
      data: {
        url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80',
        publicId: 'seed/vendors/ama-logo',
        altText: "Ama's Fashion Hub logo",
        vendorLogoId: vendor1.id,
      },
    });
  }
  console.info(`  ✔ Vendor 1: ${vendor1User.email} / Password1 → ${vendor1.storeName}`);

  // ─── Vendor 2 ───────────────────────────────────────
  console.info('\n🏪 Creating vendor 2...');
  const vendor2User = await prisma.user.upsert({
    where: { email: 'kwame@rodtey.com' },
    update: {},
    create: {
      name: 'Kwame Asante',
      email: 'kwame@rodtey.com',
      password,
      role: 'VENDOR',
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { userId: vendor2User.id },
    update: {},
    create: {
      userId: vendor2User.id,
      storeName: 'Kwame Tech Store',
      description:
        'Latest smartphones, laptops, accessories, and gadgets at competitive prices. Serving Accra since 2018.',
      status: 'APPROVED',
    },
  });

  // vendor2 logo
  const v2Logo = await prisma.image.findUnique({ where: { vendorLogoId: vendor2.id } });
  if (!v2Logo) {
    await prisma.image.create({
      data: {
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=80',
        publicId: 'seed/vendors/kwame-logo',
        altText: 'Kwame Tech Store logo',
        vendorLogoId: vendor2.id,
      },
    });
  }
  console.info(`  ✔ Vendor 2: ${vendor2User.email} / Password1 → ${vendor2.storeName}`);

  // ─── Categories ─────────────────────────────────────
  console.info('\n📂 Seeding categories...');
  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
    categoryMap[cat.slug] = category.id;

    const existing = await prisma.image.findUnique({ where: { categoryId: category.id } });
    if (existing) {
      await prisma.image.update({
        where: { id: existing.id },
        data: { url: cat.image.url, publicId: cat.image.publicId, altText: cat.image.altText },
      });
    } else {
      await prisma.image.create({
        data: {
          url: cat.image.url,
          publicId: cat.image.publicId,
          altText: cat.image.altText,
          categoryId: category.id,
        },
      });
    }
    console.info(`  ✔ ${cat.name}`);
  }

  // ─── Products for Vendor 1 (Fashion) ────────────────
  console.info("\n👗 Creating Ama's Fashion Hub products...");

  const fashionProducts = [
    {
      name: 'Kente Cloth Fabric (6 yards)',
      slug: 'kente-cloth-fabric-6-yards',
      description:
        'Authentic handwoven kente cloth from Bonwire, Ashanti Region. Traditional multi-colour pattern. Perfect for special occasions, graduations, and cultural events.',
      price: 350.0,
      stock: 25,
      categorySlug: 'fashion',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80',
          publicId: 'seed/products/kente-1',
          altText: 'Kente cloth',
        },
      ],
    },
    {
      name: 'African Print Ankara Dress',
      slug: 'african-print-ankara-dress',
      description:
        'Beautiful ankara wrap dress with bold African print. Available in sizes S, M, L, XL. Machine washable, 100% cotton fabric.',
      price: 180.0,
      stock: 40,
      categorySlug: 'fashion',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4a65?w=600&q=80',
          publicId: 'seed/products/ankara-1',
          altText: 'Ankara dress',
        },
      ],
    },
    {
      name: 'Batakari Smock Shirt (Men)',
      slug: 'batakari-smock-shirt-men',
      description:
        'Traditional northern Ghana smock shirt made from authentic batakari fabric. Hand-stitched embroidery. Perfect for cultural events and casual wear.',
      price: 120.0,
      stock: 30,
      categorySlug: 'fashion',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80',
          publicId: 'seed/products/batakari-1',
          altText: 'Batakari smock shirt',
        },
      ],
    },
    {
      name: 'Ghanaian Beaded Necklace',
      slug: 'ghanaian-beaded-necklace',
      description:
        'Handcrafted beaded necklace using traditional Krobo powder glass beads. Each piece is unique. Makes a great gift.',
      price: 65.0,
      stock: 60,
      categorySlug: 'fashion',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
          publicId: 'seed/products/beads-1',
          altText: 'Ghanaian beaded necklace',
        },
      ],
    },
    {
      name: 'Leather Sandals (Handmade)',
      slug: 'leather-sandals-handmade',
      description:
        'Genuine leather sandals handcrafted by local artisans in Kumasi. Durable, comfortable, and stylish. Available in sizes 36–46.',
      price: 95.0,
      stock: 50,
      categorySlug: 'fashion',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80',
          publicId: 'seed/products/sandals-1',
          altText: 'Handmade leather sandals',
        },
      ],
    },
  ];

  for (const p of fashionProducts) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      const product = await prisma.product.create({
        data: {
          vendorId: vendor1.id,
          categoryId: categoryMap[p.categorySlug],
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          stock: p.stock,
          isActive: true,
        },
      });
      await prisma.image.createMany({
        data: p.images.map((img) => ({ ...img, productId: product.id })),
      });
      console.info(`  ✔ ${p.name}`);
    } else {
      console.info(`  – ${p.name} (already exists)`);
    }
  }

  // ─── Products for Vendor 2 (Electronics) ────────────
  console.info('\n📱 Creating Kwame Tech Store products...');

  const techProducts = [
    {
      name: 'Samsung Galaxy A54 5G',
      slug: 'samsung-galaxy-a54-5g',
      description:
        'Samsung Galaxy A54 5G, 256GB storage, 8GB RAM. Stunning 6.4" Super AMOLED display, 50MP camera, 5000mAh battery. 1 year local warranty.',
      price: 2800.0,
      stock: 15,
      categorySlug: 'electronics',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80',
          publicId: 'seed/products/samsung-a54-1',
          altText: 'Samsung Galaxy A54',
        },
      ],
    },
    {
      name: 'Tecno Spark 20 Pro',
      slug: 'tecno-spark-20-pro',
      description:
        'Tecno Spark 20 Pro, 128GB storage, 8GB RAM. 6.78" display, 50MP AI triple camera, 5000mAh fast charge battery. Ideal for everyday use.',
      price: 1200.0,
      stock: 30,
      categorySlug: 'electronics',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
          publicId: 'seed/products/tecno-1',
          altText: 'Tecno Spark 20 Pro',
        },
      ],
    },
    {
      name: 'HP Laptop 15s (Intel i5)',
      slug: 'hp-laptop-15s-intel-i5',
      description:
        'HP 15s laptop, Intel Core i5 12th Gen, 8GB RAM, 512GB SSD, Windows 11. 15.6" FHD display. Perfect for students and professionals.',
      price: 4500.0,
      stock: 10,
      categorySlug: 'electronics',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80',
          publicId: 'seed/products/hp-laptop-1',
          altText: 'HP Laptop 15s',
        },
      ],
    },
    {
      name: 'JBL Flip 6 Bluetooth Speaker',
      slug: 'jbl-flip-6-bluetooth-speaker',
      description:
        'JBL Flip 6 portable waterproof Bluetooth speaker. 12 hours playtime, powerful bass, IP67 waterproof rating. Available in multiple colours.',
      price: 750.0,
      stock: 20,
      categorySlug: 'electronics',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
          publicId: 'seed/products/jbl-1',
          altText: 'JBL Flip 6',
        },
      ],
    },
    {
      name: 'Wireless Earbuds (TWS)',
      slug: 'wireless-earbuds-tws',
      description:
        'True wireless earbuds with active noise cancellation, 30hr total battery life with case, IPX5 water resistance, and Bluetooth 5.3. Compatible with all devices.',
      price: 320.0,
      stock: 45,
      categorySlug: 'electronics',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
          publicId: 'seed/products/earbuds-1',
          altText: 'Wireless earbuds',
        },
      ],
    },
    {
      name: 'USB-C Fast Charger 65W',
      slug: 'usb-c-fast-charger-65w',
      description:
        '65W GaN USB-C fast charger compatible with laptops, phones, and tablets. Dual port — charge two devices simultaneously. Compact travel-friendly design.',
      price: 180.0,
      stock: 80,
      categorySlug: 'electronics',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80',
          publicId: 'seed/products/charger-1',
          altText: 'USB-C fast charger',
        },
      ],
    },
  ];

  for (const p of techProducts) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      const product = await prisma.product.create({
        data: {
          vendorId: vendor2.id,
          categoryId: categoryMap[p.categorySlug],
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          stock: p.stock,
          isActive: true,
        },
      });
      await prisma.image.createMany({
        data: p.images.map((img) => ({ ...img, productId: product.id })),
      });
      console.info(`  ✔ ${p.name}`);
    } else {
      console.info(`  – ${p.name} (already exists)`);
    }
  }

  // ─── Summary ─────────────────────────────────────────
  console.info('\n✅ Seed complete!\n');
  console.info('─────────────────────────────────────────');
  console.info('  Accounts (all use password: Password1)');
  console.info('─────────────────────────────────────────');
  console.info('  ADMIN   admin@rodtey.com');
  console.info("  VENDOR  ama@rodtey.com       → Ama's Fashion Hub");
  console.info('  VENDOR  kwame@rodtey.com     → Kwame Tech Store');
  console.info('  BUYER   buyer@rodtey.com     → Kofi Mensah');
  console.info('─────────────────────────────────────────\n');
};

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
