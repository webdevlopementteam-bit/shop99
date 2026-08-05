// admin/src/layout/AdminLayout.jsx

import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import Topbar from "./Topbar";

const AdminLayout = () => {
  return (
    <div className="flex h-screen min-h-0 bg-[#0B0F19] text-white overflow-hidden">

      {/* Sidebar */}
      <Sidebar />

      {/* Right Side — min-w-0 lets flex child shrink so inner overflow-x works */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">

        {/* Topbar */}
        <Topbar />

        {/* Page Content — vertical scroll only; horizontal scroll lives inside pages */}
        <main className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default AdminLayout;