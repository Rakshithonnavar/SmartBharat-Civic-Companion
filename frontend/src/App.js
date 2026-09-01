import "@/App.css"; 
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { LanguageProvider } from "@/context/LanguageContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import ChatCompanion from "@/pages/ChatCompanion";
import ComplaintTracker from "@/pages/ComplaintTracker";
import ServiceFinder from "@/pages/ServiceFinder";
import DocumentGuidance from "@/pages/DocumentGuidance";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminSetup from "@/pages/admin/AdminSetup";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminComplaints from "@/pages/admin/AdminComplaints";
import AdminTeam from "@/pages/admin/AdminTeam";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

// Wraps the existing citizen Layout (header/footer/skip-link -- untouched)
// around nested routes via <Outlet />, so admin routes below can sit
// completely outside of it.
const CitizenShell = () => (
  <Layout>
    <Outlet />
  </Layout>
);

// Wraps authenticated admin routes in the admin sidebar layout, behind
// the auth guard.
const AdminShell = () => (
  <ProtectedRoute>
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<CitizenShell />}>
                <Route path="/" element={<Home />} />
                <Route path="/chat" element={<ChatCompanion />} />
                <Route path="/complaints" element={<ComplaintTracker />} />
                <Route path="/services" element={<ServiceFinder />} />
                <Route path="/documents" element={<DocumentGuidance />} />
              </Route>

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/setup" element={<AdminSetup />} />

              <Route element={<AdminShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/complaints" element={<AdminComplaints />} />
                <Route path="/admin/team" element={<AdminTeam />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AdminAuthProvider>
      </LanguageProvider>
    </div>
  );
}

export default App;
