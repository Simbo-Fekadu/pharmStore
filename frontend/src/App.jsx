import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { isElectron } from "./api/base";
import AdminLayout from "./components/AdminLayout";
import EmployeeLayout from "./components/EmployeeLayout";
import Landing from "./components/Landing";
import SignIn from "./components/SignIn";
import InventoryPage from "./components/InventoryPage";
import Dashboard from "./components/Dashboard";
import AdminMedicines from "./components/AdminMedicines";
import MedicineAdd from "./components/MedicineAdd";
import AdminActiveMedicines from "./components/AdminActiveMedicines";
import AdminMedicineTrash from "./components/AdminMedicineTrash";
import MedicineExpiry from "./components/MedicineExpiry";
import AdminInventory from "./components/AdminInventory";
import AdminUsers from "./components/AdminUsers";
import AdminSuppliers from "./components/AdminSuppliers";
import AdminBranches from "./components/AdminBranches";
import BranchRequest from "./components/BranchRequest";
import Fulfillment from "./components/Fulfillment";
import AdminRequestCenter from "./components/AdminRequestCenter";
import AdminTransactions from "./components/AdminTransactions";
import AdminSales from "./components/AdminSales";
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
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="medicines" element={<AdminMedicines />} />
              <Route path="medicines/add" element={<MedicineAdd role="admin" />} />
              <Route path="medicines/active" element={<AdminActiveMedicines />} />
              <Route path="medicines/trash" element={<AdminMedicineTrash />} />
              <Route path="medicines/near-expiry" element={<MedicineExpiry type="near" />} />
              <Route path="medicines/expired" element={<MedicineExpiry type="expired" />} />
              <Route path="inventory/store" element={<AdminInventory />} />
              <Route path="inventory/branches" element={<AdminRequestCenter />} />
              <Route path="chat" element={<Chat />} />
              <Route path="sales" element={<AdminSales />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="suppliers" element={<AdminSuppliers />} />
              <Route path="branches" element={<AdminBranches />} />
              <Route path="pharmacies/:id" element={<SuperAdminPharmacyDetail />} />
              <Route path="pharmacies/:id/branches/:branchId" element={<SuperAdminBranchDetail />} />
              <Route path="export" element={<ExportCenter />} />
            </Route>
            <Route path="/employee" element={<EmployeeLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="medicines" element={<EmployeeMedicines />} />
              <Route path="medicines/add" element={<MedicineAdd role="employee" />} />
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
