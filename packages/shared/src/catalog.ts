import type { CatalogProduct } from "./types.js";

const sizes = (extra: Record<string, number> = {}) =>
  ["S", "M", "L", "XL", "XXL", "3XL"].map((label) => ({ id: label, label, priceDelta: extra[label] ?? (label === "XXL" ? 20 : label === "3XL" ? 40 : 0) }));

export const catalog: CatalogProduct[] = [
  // ---------------- Apparel & Sublimation ----------------
  {
    id: "apparel-tshirt",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Round / V-Neck T-Shirt",
    description: "Sublimated round or V-neck T-shirt. Short or long sleeve. (Design/set-up fee R150 may apply.)",
    basePrice: 160,
    unitLabel: "shirt",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-shirt", "transfer-paper", "ink"],
    options: {
      neck: [
        { id: "round", label: "Round Neck", priceDelta: 0 },
        { id: "v", label: "V-Neck", priceDelta: 0 }
      ],
      sleeve: [
        { id: "short", label: "Short Sleeve", priceDelta: 0 },
        { id: "long", label: "Long Sleeve", priceDelta: 40 }
      ],
      size: sizes()
    }
  },
  {
    id: "apparel-golf-shirt",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Golf Shirt",
    description: "Sublimated golf/collared shirt. Short or long sleeve.",
    basePrice: 180,
    unitLabel: "shirt",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-golf-shirt", "transfer-paper", "ink"],
    options: {
      sleeve: [
        { id: "short", label: "Short Sleeve", priceDelta: 0 },
        { id: "long", label: "Long Sleeve", priceDelta: 50 }
      ],
      size: sizes()
    }
  },
  {
    id: "apparel-hoodie",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Hoodie / Sweater",
    description: "Custom hoodie or sweater with sublimation or print.",
    basePrice: 350,
    unitLabel: "hoodie",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-hoodie", "transfer-paper", "ink"],
    options: { size: sizes() }
  },
  {
    id: "apparel-jacket",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Jacket / Matric Jacket",
    description: "Custom jacket or matric jacket with names and badges.",
    basePrice: 450,
    unitLabel: "jacket",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-jacket", "transfer-paper", "thread"],
    options: { size: sizes() }
  },
  {
    id: "apparel-tracksuit",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Tracksuit",
    description: "Full custom sublimated tracksuit (top and bottoms).",
    basePrice: 950,
    unitLabel: "set",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-tracksuit", "transfer-paper"],
    options: { size: sizes() }
  },
  {
    id: "apparel-sports-kit",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Soccer / Basketball Kit Set",
    description: "Sublimated sports kit set (jersey and shorts).",
    basePrice: 360,
    unitLabel: "set",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-kit", "transfer-paper"],
    options: {
      sport: [
        { id: "soccer", label: "Soccer", priceDelta: 0 },
        { id: "basketball", label: "Basketball", priceDelta: 0 },
        { id: "netball", label: "Netball", priceDelta: 0 }
      ],
      size: sizes()
    }
  },
  {
    id: "apparel-sports-dress",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Custom / Sports Dress",
    description: "Custom sublimated sports or corporate dress.",
    basePrice: 340,
    unitLabel: "dress",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-dress", "transfer-paper"],
    options: { size: sizes() }
  },
  {
    id: "apparel-school-uniform",
    category: "apparel",
    department: "apparel_heat_press",
    name: "School Uniform (Sublimation)",
    description: "Sublimated school uniform items — shirts, golf shirts, tracksuits, and dresses.",
    basePrice: 160,
    unitLabel: "item",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-shirt", "transfer-paper"],
    options: {
      item: [
        { id: "shirt", label: "School Shirt", priceDelta: 0 },
        { id: "golf", label: "School Golf Shirt", priceDelta: 20 },
        { id: "dress", label: "School Dress", priceDelta: 180 },
        { id: "tracksuit", label: "School Tracksuit", priceDelta: 790 }
      ],
      size: sizes()
    }
  },
  {
    id: "sublimation-per-metre",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Sublimation (per metre)",
    description: "Sublimation printing charged per metre of fabric.",
    basePrice: 70,
    unitLabel: "metre",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["sublimation-fabric", "ink"],
    options: {}
  },
  {
    id: "apparel-bucket-hat",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Bucket Hat",
    description: "Branded bucket hat. Bulk pricing available.",
    basePrice: 150,
    unitLabel: "hat",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["blank-hat", "transfer-paper"],
    options: {
      color: ["White", "Black", "Khaki"].map((label) => ({ id: label.toLowerCase(), label, priceDelta: 0 }))
    }
  },
  {
    id: "apparel-tie-sash-scarf",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Tie / Sash / Scarf",
    description: "Custom printed tie, sash, or scarf.",
    basePrice: 130,
    unitLabel: "item",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["blank-accessory", "transfer-paper"],
    options: {
      item: [
        { id: "tie", label: "Tie", priceDelta: 0 },
        { id: "sash", label: "Sash", priceDelta: 0 },
        { id: "scarf", label: "Scarf", priceDelta: 0 }
      ]
    }
  },
  {
    id: "apparel-doek",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Doek / Chiffon",
    description: "Custom printed doek or chiffon.",
    basePrice: 100,
    unitLabel: "item",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["chiffon-fabric", "ink"],
    options: {}
  },

  // ---------------- Embroidery, Fashion & Tailoring (quoted on consultation) ----------------
  {
    id: "apparel-embroidery",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Embroidery (Logo / Badge / Name)",
    description: "Embroidered logos, names, and badges on garments, caps, and workwear. Priced on consultation.",
    basePrice: 0,
    unitLabel: "item",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["thread"],
    options: {
      placement: [
        { id: "left_chest", label: "Left Chest", priceDelta: 0 },
        { id: "full_back", label: "Full Back", priceDelta: 0 },
        { id: "cap", label: "Cap", priceDelta: 0 },
        { id: "sleeve", label: "Sleeve", priceDelta: 0 }
      ]
    }
  },
  {
    id: "apparel-overalls",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Overalls & Workwear",
    description: "Branded overalls and uniforms for teams, sites, and businesses. Priced on consultation.",
    basePrice: 0,
    unitLabel: "item",
    requiresArtwork: false,
    proofRecommended: false,
    inventoryTags: ["blank-overall", "thread"],
    options: { size: sizes() }
  },
  {
    id: "apparel-jumpsuit",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Jumpsuit",
    description: "Custom-fitted jumpsuits made and finished to your spec. Priced on consultation.",
    basePrice: 0,
    unitLabel: "jumpsuit",
    requiresArtwork: false,
    proofRecommended: false,
    inventoryTags: ["fabric"],
    options: { size: sizes() }
  },
  {
    id: "fashion-wedding-dress",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Wedding Dress",
    description: "Bespoke bridal dresses designed, tailored, and fitted with care. Priced on consultation.",
    basePrice: 0,
    unitLabel: "dress",
    requiresArtwork: false,
    proofRecommended: false,
    inventoryTags: ["fabric"],
    options: {}
  },
  {
    id: "fashion-traditional-dress",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Traditional Dress",
    description: "Authentic traditional and cultural attire for every occasion. Priced on consultation.",
    basePrice: 0,
    unitLabel: "outfit",
    requiresArtwork: false,
    proofRecommended: false,
    inventoryTags: ["fabric"],
    options: {}
  },
  {
    id: "fashion-trousers",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Trousers (Made-to-Measure / Alterations)",
    description: "Made-to-measure and altered trousers with a clean finish. Priced on consultation.",
    basePrice: 0,
    unitLabel: "pair",
    requiresArtwork: false,
    proofRecommended: false,
    inventoryTags: ["fabric"],
    options: { size: sizes() }
  },

  // ---------------- Banners & Signage ----------------
  {
    id: "signage-x-banner",
    category: "signage",
    department: "signage_banner",
    name: "X-Banner",
    description: "Quality X-banner with stand. The best place to be.",
    basePrice: 550,
    unitLabel: "banner",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["banner-material", "x-stand"],
    options: {}
  },
  {
    id: "signage-flag-banner",
    category: "signage",
    department: "signage_banner",
    name: "Flag Banner (Teardrop / Telescopic)",
    description: "Teardrop or telescopic flag banner with base.",
    basePrice: 650,
    unitLabel: "banner",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["flag-material", "flag-pole"],
    options: {
      type: [
        { id: "teardrop", label: "Teardrop", priceDelta: 0 },
        { id: "telescopic", label: "Telescopic", priceDelta: 0 },
        { id: "large", label: "Large", priceDelta: 300 }
      ]
    }
  },
  {
    id: "signage-pull-up-banner",
    category: "signage",
    department: "signage_banner",
    name: "Pull-Up Banner",
    description: "Retractable roll-up banner with carry bag.",
    basePrice: 1000,
    unitLabel: "banner",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["banner-material", "pullup-cassette"],
    options: {
      material: [
        { id: "standard", label: "Standard", priceDelta: 0 },
        { id: "premium", label: "Premium", priceDelta: 250 }
      ]
    }
  },
  {
    id: "signage-popup-wall",
    category: "signage",
    department: "signage_banner",
    name: "Pop-Up / Wall Banner (3x3)",
    description: "3x3 fabric pop-up wall / media backdrop. Comes with bag.",
    basePrice: 4000,
    unitLabel: "wall",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["popup-frame", "fabric-print"],
    options: {}
  },
  {
    id: "signage-gazebo",
    category: "signage",
    department: "signage_banner",
    name: "Gazebo (3x3)",
    description: "Branded 3x3 gazebo. Comes with bag.",
    basePrice: 4500,
    unitLabel: "gazebo",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["gazebo-frame", "gazebo-canopy"],
    options: {}
  },
  {
    id: "signage-corex-board",
    category: "signage",
    department: "signage_banner",
    name: "Corex Board",
    description: "Printed corex board for events and directions.",
    basePrice: 250,
    unitLabel: "board",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["board-stock", "ink"],
    options: {
      size: [
        { id: "a2", label: "A2", priceDelta: 0 },
        { id: "a1", label: "A1", priceDelta: 150 }
      ]
    }
  },
  {
    id: "signage-flag-a1",
    category: "signage",
    department: "signage_banner",
    name: "Flag (A1 size)",
    description: "Printed A1 flag.",
    basePrice: 250,
    unitLabel: "flag",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["flag-material"],
    options: {
      finish: [
        { id: "standard", label: "Standard", priceDelta: 0 },
        { id: "premium", label: "Premium", priceDelta: 200 }
      ]
    }
  },

  // ---------------- Branding & Promo ----------------
  {
    id: "promo-table-cloth",
    category: "promotional",
    department: "promotional_items",
    name: "Table Cloth",
    description: "Branded table cloth in quality material.",
    basePrice: 250,
    unitLabel: "cloth",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["table-cloth-fabric"],
    options: {
      style: [
        { id: "draped", label: "Draped", priceDelta: 0 },
        { id: "fitted", label: "Fitted / Stretch", priceDelta: 250 },
        { id: "full", label: "Full Branding", priceDelta: 650 }
      ]
    }
  },
  {
    id: "promo-umbrella",
    category: "promotional",
    department: "promotional_items",
    name: "Branded Umbrella",
    description: "Branded umbrella, other colours available.",
    basePrice: 350,
    unitLabel: "umbrella",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["blank-umbrella"],
    options: {
      color: ["Black", "Navy", "Red", "White"].map((label) => ({ id: label.toLowerCase(), label, priceDelta: 0 }))
    }
  },
  {
    id: "promo-oval-board",
    category: "promotional",
    department: "promotional_items",
    name: "Branded Oval Board",
    description: "Branded oval display board, material of choice.",
    basePrice: 580,
    unitLabel: "board",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["board-stock", "fabric-print"],
    options: {}
  },

  // ---------------- Legacy / hidden (kept for compatibility, not offered) ----------------
  {
    id: "quick-photo-frame",
    category: "quick_sale",
    department: "front_counter",
    name: "Quick Sale Item",
    description: "Walk-in / off-the-shelf item for quick POS sales.",
    basePrice: 85,
    unitLabel: "item",
    requiresArtwork: false,
    proofRecommended: false,
    enabled: false,
    inventoryTags: ["quick-sale-stock"],
    options: {}
  },
  {
    id: "canvas-framed",
    category: "canvas_photo",
    department: "canvas_photo",
    name: "Framed Canvas Print",
    description: "Legacy item (not currently offered).",
    basePrice: 450,
    unitLabel: "canvas",
    requiresArtwork: true,
    proofRecommended: true,
    enabled: false,
    inventoryTags: ["canvas-roll", "frame"],
    options: {
      size: [
        { id: "a4", label: "A4", priceDelta: 0 },
        { id: "a2", label: "A2", priceDelta: 350 }
      ]
    }
  },
  {
    id: "document-business-cards",
    category: "document",
    department: "document_printing",
    name: "Business Cards",
    description: "Legacy item (not currently offered).",
    basePrice: 2.5,
    unitLabel: "card",
    requiresArtwork: true,
    proofRecommended: true,
    enabled: false,
    inventoryTags: ["paper-stock"],
    options: {
      sides: [
        { id: "single", label: "Single Sided", priceDelta: 0 },
        { id: "double", label: "Double Sided", priceDelta: 1.2 }
      ]
    }
  }
];

export function getProduct(productId: string): CatalogProduct {
  const product = catalog.find((item) => item.id === productId);
  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }
  return product;
}

import type { KioskCategory } from "./types.js";

export const defaultKioskCategories: KioskCategory[] = [
  { id: "apparel", label: "Apparel, Sublimation & Fashion", description: "T-shirts, golf, hoodies, tracksuits, kits, school uniforms, embroidery, overalls, jumpsuits, wedding & traditional dress, trousers." },
  { id: "signage", label: "Banners & Signage", description: "X-banners, flag banners, pull-ups, corex boards, gazebos, pop-up walls." },
  { id: "promotional", label: "Branding & Promo", description: "Umbrellas, table cloths, oval boards, and branded gifts." }
];
