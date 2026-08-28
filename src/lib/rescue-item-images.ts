import bakeryImage from "@/assets/rescue-bakery.webp";
import dryGoodsImage from "@/assets/categories/rescue-dry-goods.webp";
import mealImage from "@/assets/rescue-meal.webp";
import mixedImage from "@/assets/categories/rescue-mixed.webp";
import produceImage from "@/assets/rescue-produce.webp";
import proteinImage from "@/assets/categories/rescue-protein.webp";

/**
 * Single source for the label and photo of each material type. The home page,
 * the category page, the footer, and every card fallback read from here — three
 * of them used to keep their own copy of this map and drifted apart.
 *
 * The URL slug for a category is the raw material type, underscores included.
 */
export const MATERIAL_CATEGORIES = [
  {
    type: "prepared_food",
    label: "Siap santap",
    blurb: "Nasi box, lauk, dan menu matang",
    image: mealImage,
  },
  {
    type: "bakery",
    label: "Roti & pastry",
    blurb: "Roti, kue, dan pastry akhir hari",
    image: bakeryImage,
  },
  {
    type: "produce",
    label: "Sayur & buah",
    blurb: "Hasil sortir yang masih segar",
    image: produceImage,
  },
  {
    type: "protein",
    label: "Protein",
    blurb: "Ayam, daging, dan olahan",
    image: proteinImage,
  },
  {
    type: "dairy",
    label: "Susu & olahan",
    blurb: "Susu, yogurt, dan keju",
    image: mealImage,
  },
  {
    type: "dry_goods",
    label: "Bahan kering",
    blurb: "Beras, bumbu, dan sembako",
    image: dryGoodsImage,
  },
  {
    type: "mixed",
    label: "Paket campur",
    blurb: "Kombinasi beberapa material",
    image: mixedImage,
  },
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

const byType = new Map<string, MaterialCategory>(
  MATERIAL_CATEGORIES.map((category) => [category.type, category]),
);

export function materialCategory(materialType: string) {
  return byType.get(materialType);
}

export function materialCategoryLabel(materialType: string) {
  return byType.get(materialType)?.label ?? "Paket campur";
}

export function rescueItemImageForMaterialType(materialType: string) {
  return byType.get(materialType)?.image ?? mixedImage;
}
