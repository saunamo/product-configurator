import { AdminConfig } from "./admin";

export type Product = {
  id: string; // e.g., "skuare", "barrel", "cube"
  name: string; // "The Skuare", "Barrel Sauna", etc.
  slug: string; // URL-friendly version
  createdAt: Date;
  updatedAt: Date;
};

export type ProductConfig = AdminConfig & {
  productId: string;
};



