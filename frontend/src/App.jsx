import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { isElectron } from "./api/base";
import Landing from "./components/Landing";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import InventoryPage from "./components/InventoryPage";
import AdminLayout from "./components/AdminLayout";
import AdminMedicines from "./components/AdminMedicines";
import AdminMedicineAdd from "./components/AdminMedicineAdd";
import AdminActiveMedicines from "./components/AdminActiveMedicines";
import AdminDashboard from "./components/AdminDashboard";
import AdminMedicineTrash from "./components/AdminMedicineTrash";
import AdminNearExpiry from "./components/AdminNearExpiry";
import AdminExpired from "./components/AdminExpired";
import AdminInventory from "./components/AdminInventory";
import AdminUsers from "./components/AdminUsers";
import AdminSuppliers from "./components/AdminSuppliers";
import AdminBranches from "./components/AdminBranches";
import BranchRequest from "./components/BranchRequest";
import Fulfillment from "./components/Fulfillment";
import AdminRequestCenter from "./components/AdminRequestCenter";
import AdminTransactions from "./components/AdminTransactions";
import AdminSales from "./components/AdminSales";
import EmployeeLayout from "./components/EmployeeLayout";
import EmployeeDashboard from "./components/EmployeeDashboard";
import EmployeeMedicines from "./components/EmployeeMedicines";
import BranchMedicines from "./components/BranchMedicines";
import EmployeeAddStock from "./components/EmployeeAddStock";
import EmployeeSales from "./components/EmployeeSales";
import EmployeeSalesHistory from "./components/EmployeeSalesHistory";
import Chat from "./components/Chat";
import ToastProvider from "./components/ToastProvider";
import ConfirmProvider from "./components/ConfirmProvider";
import SuperAdminPharmacyDetail from "./components/SuperAdminPharmacyDetail";
import SuperAdminBranchDetail from "./components/SuperAdminBranchDetail";
import ExportCenter from "./components/ExportCenter";

function App() {
  const fileProtocol =
    typeof window !== "undefined" && window.location.protocol === "file:";
  const RouterImpl = isElectron() || fileProtocol ? HashRouter : BrowserRouter;
  return (
    <RouterImpl>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/inventory" element={<InventoryPage />} />
            {/* Employee nested functionality moved under /employee */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="medicines" element={<AdminMedicines />} />
              <Route path="medicines/add" element={<AdminMedicineAdd />} />
              <Route
                path="medicines/active"
                element={<AdminActiveMedicines />}
              />
              <Route path="medicines/trash" element={<AdminMedicineTrash />} />
              <Route
                path="medicines/near-expiry"
                element={<AdminNearExpiry />}
              />
              <Route path="medicines/expired" element={<AdminExpired />} />
              <Route path="inventory/store" element={<AdminInventory />} />
              <Route
                path="inventory/branches"
                element={<AdminRequestCenter />}
              />
              <Route path="chat" element={<Chat />} />
              <Route path="sales" element={<AdminSales />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="suppliers" element={<AdminSuppliers />} />
              <Route path="branches" element={<AdminBranches />} />
              <Route
                path="pharmacies/:id"
                element={<SuperAdminPharmacyDetail />}
              />
              <Route
                path="pharmacies/:id/branches/:branchId"
                element={<SuperAdminBranchDetail />}
              />
              <Route path="export" element={<ExportCenter />} />
            </Route>
            <Route path="/employee" element={<EmployeeLayout />}>
              <Route index element={<EmployeeDashboard />} />
              <Route path="medicines" element={<EmployeeMedicines />} />
              <Route path="branch-medicines" element={<BranchMedicines />} />
              <Route path="add-stock" element={<EmployeeAddStock />} />
              <Route path="requests" element={<BranchRequest />} />
              <Route path="chat" element={<Chat />} />
              <Route path="fulfillment" element={<Fulfillment />} />
              <Route path="sales" element={<EmployeeSales />} />
              <Route path="sales/history" element={<EmployeeSalesHistory />} />
            </Route>
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </RouterImpl>
  );
}

export default App;
