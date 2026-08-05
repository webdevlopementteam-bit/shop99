const Table = ({ headers, children }) => {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">

      <table className="w-full text-sm">

        <thead className="bg-primaryColor text-white">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y">
          {children}
        </tbody>

      </table>
    </div>
  );
};

export default Table;
