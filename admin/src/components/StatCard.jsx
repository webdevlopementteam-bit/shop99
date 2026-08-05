const StatCard = ({ title, value }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">

      <p className="text-gray-500 text-sm">{title}</p>

      <h3 className="text-3xl font-bold mt-2 text-primaryColor">
        {value}
      </h3>

    </div>
  );
};

export default StatCard;
