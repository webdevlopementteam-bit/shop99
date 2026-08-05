// frontend/src/services/categoryService.js

import { getCategoryTreeApi } from "../api/api";

export const getCategories = async () => {
  return await getCategoryTreeApi();
};
