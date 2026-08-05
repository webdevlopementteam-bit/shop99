// admin/src/pages/products/ProductEdit.jsx

import { useParams } from "react-router-dom";
import ProductForm from "./ProductForm";

export default function ProductEdit() {
  const { id } = useParams();
  return <ProductForm editId={id} />;
}
