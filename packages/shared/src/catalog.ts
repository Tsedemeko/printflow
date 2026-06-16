import type { CatalogProduct } from "./types.js";

export const catalog: CatalogProduct[] = [
  {
    id: "apparel-tshirt",
    category: "apparel",
    department: "apparel_heat_press",
    name: "Custom T-Shirt",
    description: "T-shirts with placement choices for front, back, chest, and sleeves.",
    basePrice: 120,
    unitLabel: "shirt",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-shirt", "transfer-paper", "ink"],
    options: {
      size: ["S", "M", "L", "XL", "XXL"].map((label) => ({ id: label, label, priceDelta: label === "XXL" ? 20 : 0 })),
      color: ["White", "Black", "Navy", "Red"].map((label) => ({ id: label, label, priceDelta: 0 })),
      placement: [
        { id: "left_chest", label: "Left Chest", priceDelta: 35 },
        { id: "full_front", label: "Full Front", priceDelta: 70 },
        { id: "full_back", label: "Full Back", priceDelta: 80 },
        { id: "sleeve", label: "Sleeve", priceDelta: 40 }
      ]
    }
  },
  {
    id: "document-business-cards",
    category: "document",
    department: "document_printing",
    name: "Business Cards",
    description: "Professional cards with paper stock, sides, and finishing options.",
    basePrice: 2.5,
    unitLabel: "card",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["paper-stock", "laminating-pouch"],
    options: {
      paper: [
        { id: "matte_250", label: "250gsm Matte", priceDelta: 0.5 },
        { id: "gloss_250", label: "250gsm Gloss", priceDelta: 0.8 },
        { id: "premium_350", label: "350gsm Premium", priceDelta: 1.5 }
      ],
      sides: [
        { id: "single", label: "Single Sided", priceDelta: 0 },
        { id: "double", label: "Double Sided", priceDelta: 1.2 }
      ],
      finishing: [
        { id: "none", label: "No Finishing", priceDelta: 0 },
        { id: "laminated", label: "Laminated", priceDelta: 1.5 },
        { id: "corner_rounding", label: "Corner Rounding", priceDelta: 0.7 }
      ]
    }
  },
  {
    id: "document-flyers",
    category: "document",
    department: "document_printing",
    name: "Flyers & Leaflets",
    description: "A6, A5, A4, DL flyers with paper, sides, folding, and finish choices.",
    basePrice: 3.5,
    unitLabel: "flyer",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["paper-stock", "ink"],
    enabled: true,
    options: {
      size: [
        { id: "a6", label: "A6", priceDelta: 0 },
        { id: "dl", label: "DL", priceDelta: 0.5 },
        { id: "a5", label: "A5", priceDelta: 1.2 },
        { id: "a4", label: "A4", priceDelta: 2.4 }
      ],
      paper: [
        { id: "bond_80", label: "80gsm Bond", priceDelta: 0 },
        { id: "gloss_135", label: "135gsm Gloss", priceDelta: 1 },
        { id: "gloss_170", label: "170gsm Gloss", priceDelta: 1.8 }
      ],
      sides: [
        { id: "single", label: "Single Sided", priceDelta: 0 },
        { id: "double", label: "Double Sided", priceDelta: 1.2 }
      ]
    }
  },
  {
    id: "document-booklets",
    category: "document",
    department: "document_printing",
    name: "Booklets & Brochures",
    description: "Stapled or folded booklets, company profiles, manuals, and menus.",
    basePrice: 18,
    unitLabel: "booklet",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["paper-stock", "staples", "ink"],
    enabled: true,
    options: {
      size: [
        { id: "a5", label: "A5", priceDelta: 0 },
        { id: "a4", label: "A4", priceDelta: 8 }
      ],
      pages: [
        { id: "8pp", label: "8 Pages", priceDelta: 0 },
        { id: "16pp", label: "16 Pages", priceDelta: 18 },
        { id: "32pp", label: "32 Pages", priceDelta: 46 }
      ],
      binding: [
        { id: "saddle_stitch", label: "Saddle Stitch", priceDelta: 0 },
        { id: "wire_bound", label: "Wire Bound", priceDelta: 22 }
      ]
    }
  },
  {
    id: "canvas-framed",
    category: "canvas_photo",
    department: "canvas_photo",
    name: "Framed Canvas Print",
    description: "High-resolution canvas with depth, edge, and frame choices.",
    basePrice: 450,
    unitLabel: "canvas",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["canvas-roll", "stretcher-bar", "frame", "ink"],
    options: {
      size: [
        { id: "a4", label: "A4", priceDelta: 0 },
        { id: "a3", label: "A3", priceDelta: 180 },
        { id: "a2", label: "A2", priceDelta: 350 },
        { id: "24x36", label: "24x36 inch", priceDelta: 650 }
      ],
      depth: [
        { id: "18mm", label: "Standard 18mm", priceDelta: 0 },
        { id: "38mm", label: "Chunky 38mm", priceDelta: 150 }
      ],
      edge: [
        { id: "mirror", label: "Mirror Wrap", priceDelta: 0 },
        { id: "white", label: "White Edge", priceDelta: 0 },
        { id: "black", label: "Black Edge", priceDelta: 0 },
        { id: "image", label: "Image Wrap", priceDelta: 80 }
      ],
      frame: [
        { id: "none", label: "No Frame", priceDelta: 0 },
        { id: "black", label: "Black Frame", priceDelta: 220 },
        { id: "white", label: "White Frame", priceDelta: 220 },
        { id: "floating", label: "Floating Frame", priceDelta: 250 }
      ]
    }
  },
  {
    id: "signage-pull-up-banner",
    category: "signage",
    department: "signage_banner",
    name: "Pull-Up Banner",
    description: "Indoor/outdoor wide-format banner with finishing options.",
    basePrice: 950,
    unitLabel: "banner",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["banner-material", "vinyl-roll", "eyelets"],
    options: {
      size: [
        { id: "850x2000", label: "850 x 2000mm", priceDelta: 0 },
        { id: "1000x2000", label: "1000 x 2000mm", priceDelta: 220 }
      ],
      material: [
        { id: "vinyl", label: "Vinyl", priceDelta: 0 },
        { id: "fabric", label: "Fabric", priceDelta: 180 }
      ],
      finishing: [
        { id: "standard", label: "Standard Cassette", priceDelta: 0 },
        { id: "premium", label: "Premium Cassette", priceDelta: 320 }
      ]
    }
  },
  {
    id: "signage-vinyl-cut",
    category: "signage",
    department: "signage_banner",
    name: "Vinyl Cut Lettering",
    description: "Window, wall, vehicle, and shopfront vinyl lettering.",
    basePrice: 220,
    unitLabel: "job",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["vinyl-roll", "transfer-tape"],
    enabled: true,
    options: {
      size: [
        { id: "small", label: "Small", priceDelta: 0 },
        { id: "medium", label: "Medium", priceDelta: 180 },
        { id: "large", label: "Large", priceDelta: 420 }
      ],
      material: [
        { id: "standard_vinyl", label: "Standard Vinyl", priceDelta: 0 },
        { id: "premium_vinyl", label: "Premium Vinyl", priceDelta: 90 },
        { id: "reflective", label: "Reflective Vinyl", priceDelta: 240 }
      ]
    }
  },
  {
    id: "signage-correx-board",
    category: "signage",
    department: "signage_banner",
    name: "Correx & Foam Board Signs",
    description: "Event, estate agent, directional, and retail display boards.",
    basePrice: 180,
    unitLabel: "board",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["board-stock", "vinyl-roll", "ink"],
    enabled: true,
    options: {
      size: [
        { id: "a3", label: "A3", priceDelta: 0 },
        { id: "a2", label: "A2", priceDelta: 140 },
        { id: "a1", label: "A1", priceDelta: 360 }
      ],
      material: [
        { id: "correx", label: "Correx", priceDelta: 0 },
        { id: "foam_board", label: "Foam Board", priceDelta: 120 },
        { id: "chromadek", label: "Chromadek", priceDelta: 420 }
      ]
    }
  },
  {
    id: "promo-mug",
    category: "promotional",
    department: "promotional_items",
    name: "Custom Mug",
    description: "Personalized ceramic mug for promotional and gift orders.",
    basePrice: 90,
    unitLabel: "mug",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["blank-mug", "transfer-paper"],
    options: {
      color: ["White", "Black", "Red"].map((label) => ({ id: label, label, priceDelta: label === "White" ? 0 : 15 })),
      wrap: [
        { id: "single_side", label: "Single Side", priceDelta: 0 },
        { id: "full_wrap", label: "Full Wrap", priceDelta: 30 }
      ]
    }
  },
  {
    id: "promo-bottle",
    category: "promotional",
    department: "promotional_items",
    name: "Branded Bottles",
    description: "Water bottles and tumblers with logo placement and colour choices.",
    basePrice: 145,
    unitLabel: "bottle",
    requiresArtwork: true,
    proofRecommended: true,
    inventoryTags: ["blank-bottle", "ink"],
    enabled: true,
    options: {
      color: ["White", "Black", "Silver", "Blue"].map((label) => ({ id: label.toLowerCase(), label, priceDelta: label === "Silver" ? 20 : 0 })),
      placement: [
        { id: "single_side", label: "Single Side", priceDelta: 0 },
        { id: "wrap", label: "Wrap", priceDelta: 45 }
      ]
    }
  },
  {
    id: "promo-keyholder",
    category: "promotional",
    department: "promotional_items",
    name: "Keyholders & Small Gifts",
    description: "Keyholders, magnets, badges, phone cases, and branded small gifts.",
    basePrice: 35,
    unitLabel: "item",
    requiresArtwork: true,
    proofRecommended: false,
    inventoryTags: ["promo-blanks", "ink"],
    enabled: true,
    options: {
      item: [
        { id: "keyholder", label: "Keyholder", priceDelta: 0 },
        { id: "magnet", label: "Magnet", priceDelta: -8 },
        { id: "badge", label: "Badge", priceDelta: -12 },
        { id: "phone_case", label: "Phone Case", priceDelta: 55 }
      ]
    }
  },
  {
    id: "quick-photo-frame",
    category: "quick_sale",
    department: "front_counter",
    name: "Ready-Made Photo Frame",
    description: "Off-the-shelf item for quick POS sales.",
    basePrice: 85,
    unitLabel: "frame",
    requiresArtwork: false,
    proofRecommended: false,
    inventoryTags: ["photo-frame"],
    options: {
      size: [
        { id: "a5", label: "A5", priceDelta: 0 },
        { id: "a4", label: "A4", priceDelta: 45 }
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
