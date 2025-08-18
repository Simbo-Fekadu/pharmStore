import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./components/Landing";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import Home from "./components/Home";
import InventoryPage from "./components/InventoryPage";
import AdminLayout from "./components/AdminLayout";
import AdminMedicines from "./components/AdminMedicines";
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
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/requests" element={<BranchRequest />} />
        <Route path="/fulfillment" element={<Fulfillment />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="medicines" element={<AdminMedicines />} />
          <Route path="medicines/trash" element={<AdminMedicineTrash />} />
          <Route path="medicines/near-expiry" element={<AdminNearExpiry />} />
          <Route path="medicines/expired" element={<AdminExpired />} />
          <Route path="inventory/store" element={<AdminInventory />} />
          <Route path="inventory/branches" element={<BranchRequest />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="suppliers" element={<AdminSuppliers />} />
          <Route path="branches" element={<AdminBranches />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
