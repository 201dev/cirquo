import bakeryImage from "@/assets/rescue-bakery.webp";
import dryGoodsImage from "@/assets/categories/rescue-dry-goods.webp";
import mealImage from "@/assets/rescue-meal.webp";
import mixedImage from "@/assets/categories/rescue-mixed.webp";
import produceImage from "@/assets/rescue-produce.webp";
import proteinImage from "@/assets/categories/rescue-protein.webp";

const imageByMaterialType: Record<string, string> = {
  prepared_food: mealImage,
  bakery: bakeryImage,
  produce: produceImage,
  dairy: mealImage,
  protein: proteinImage,
  dry_goods: dryGoodsImage,
  mixed: mixedImage,
};

export function rescueItemImageForMaterialType(materialType: string) {
  return imageByMaterialType[materialType] ?? mixedImage;
}
