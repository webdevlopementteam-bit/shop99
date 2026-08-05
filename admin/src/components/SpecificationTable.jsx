//admin/src/components/specifcationTable

import React, { useState } from "react";

export default function SpecificationTable() {
  const [columns, setColumns] = useState(["Heading 1", "Heading 2"]);
  const [rows, setRows] = useState([
    ["Value", "Value"]
  ]);

  /* ================= ADD COLUMN ================= */
  const addColumn = () => {
    setColumns([...columns, `Heading ${columns.length + 1}`]);

    const updatedRows = rows.map(row => [...row, "Value"]);
    setRows(updatedRows);
  };

  /* ================= ADD ROW ================= */
  const addRow = () => {
    const newRow = columns.map(() => "Value");
    setRows([...rows, newRow]);
  };

  /* ================= REMOVE COLUMN ================= */
  const removeColumn = (colIndex) => {
    const newCols = columns.filter((_, i) => i !== colIndex);
    const newRows = rows.map(row => row.filter((_, i) => i !== colIndex));

    setColumns(newCols);
    setRows(newRows);
  };

  /* ================= REMOVE ROW ================= */
  const removeRow = (rowIndex) => {
    const newRows = rows.filter((_, i) => i !== rowIndex);
    setRows(newRows);
  };

  /* ================= HANDLE CHANGE ================= */
  const handleHeaderChange = (index, value) => {
    const newCols = [...columns];
    newCols[index] = value;
    setColumns(newCols);
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = value;
    setRows(newRows);
  };

  /* ================= SUBMIT DATA ================= */
  const getTableData = () => {
    const data = {
      headings: columns,
      values: rows
    };

    console.log("TABLE DATA 👉", data);

    // 🔥 ye tu backend me bhej sakti hai (JSON)
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="mb-3 font-semibold">Specification Table</h3>

      <div className="overflow-auto">
        <table className="w-full border">
          
          {/* HEADER */}
          <thead>
            <tr>
              {columns.map((col, colIndex) => (
                <th key={colIndex} className="border p-2">
                  <input
                    value={col}
                    onChange={(e) =>
                      handleHeaderChange(colIndex, e.target.value)
                    }
                    className="w-full outline-none"
                  />
                  <button
                    onClick={() => removeColumn(colIndex)}
                    className="text-red-500 text-xs mt-1"
                  >
                    🗑
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border p-2">
                    <input
                      value={cell}
                      onChange={(e) =>
                        handleCellChange(rowIndex, colIndex, e.target.value)
                      }
                      className="w-full outline-none"
                    />
                  </td>
                ))}

                {/* DELETE ROW */}
                <td className="p-2">
                  <button
                    onClick={() => removeRow(rowIndex)}
                    className="text-red-500"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* BUTTONS */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={addRow}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          + Row
        </button>

        <button
          onClick={addColumn}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          + Column
        </button>

        <button
          onClick={getTableData}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}