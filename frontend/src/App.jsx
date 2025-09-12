import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import EmployeeLayout from "./components/EmployeeLayout";
import EmployeeDashboard from "./components/EmployeeDashboard";
import EmployeeMedicines from "./components/EmployeeMedicines";
import BranchMedicines from "./components/BranchMedicines";
import Chat from "./components/Chat";
function App() {
  return (
    <Router>
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
          <Route path="medicines/active" element={<AdminActiveMedicines />} />
          <Route path="medicines/trash" element={<AdminMedicineTrash />} />
          <Route path="medicines/near-expiry" element={<AdminNearExpiry />} />
          <Route path="medicines/expired" element={<AdminExpired />} />
          <Route path="inventory/store" element={<AdminInventory />} />
          <Route path="inventory/branches" element={<AdminRequestCenter />} />
          <Route path="chat" element={<Chat />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="suppliers" element={<AdminSuppliers />} />
          <Route path="branches" element={<AdminBranches />} />
        </Route>
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="medicines" element={<EmployeeMedicines />} />
          <Route path="branch-medicines" element={<BranchMedicines />} />
          <Route path="requests" element={<BranchRequest />} />
          <Route path="chat" element={<Chat />} />
          <Route path="fulfillment" element={<Fulfillment />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
