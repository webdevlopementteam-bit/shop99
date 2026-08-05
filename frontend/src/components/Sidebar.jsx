const Sidebar = ({ categories, active, setActive }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow">

      <h3 className="font-semibold text-lg mb-4">Categories</h3>

      <ul className="space-y-3">

        <li
          onClick={() => setActive("all")}
          className={`cursor-pointer hover:text-blue-600 ${
            active === "all" && "text-blue-600 font-semibold"
          }`}
        >
          All Products
        </li>

        {categories.map(cat => (
          <li
            key={cat.id}
            onClick={() => setActive(cat.name)}
            className={`cursor-pointer hover:text-blue-600 ${
              active === cat.name && "text-blue-600 font-semibold"
            }`}
          >
            {cat.name}
          </li>
        ))}

      </ul>

    </div>
  );
};

export default Sidebar;
