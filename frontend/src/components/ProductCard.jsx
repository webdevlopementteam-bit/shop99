import { BASE_URL } from "../api/api";

const ProductCard = ({ item }) => {
  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-xl transition p-4">

      {/* <img
         src={`${BASE_URL}/uploads/${item.image}`}
        alt={item.name}
        className="h-40 w-full object-contain mb-3"
      /> */}
      <img
  src={
    item?.image
      ? `${BASE_URL}/uploads/${item.image}`
      : "/no-image.png"
  }
  alt={item?.name || "Product"}
  className="h-40 w-full object-contain mb-3"
  onError={(e) => {
    e.target.src = "/no-image.png";
  }}
/>

      <h4 className="font-medium text-sm mb-1">{item.name}</h4>

      <p className="text-gray-500 text-xs mb-2">{item.category}</p>

      <div className="font-semibold text-lg text-blue-600">
        ₹{item.price}
      </div>

    </div>
  );
};

export default ProductCard;