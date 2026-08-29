import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { AdminLayout } from "./layouts/AdminLayout";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import CustomerLoginPage from "./pages/customerAuth/CustomerLoginPage";
import ChangePasswordPage from "./pages/customerAuth/ChangePasswordPage";
import LauncherPage from "./pages/customerAuth/LauncherPage";
import DashboardPage from "./pages/DashboardPage";
import EnquiriesListPage from "./pages/enquiries/EnquiriesListPage";
import EnquiryDetailPage from "./pages/enquiries/EnquiryDetailPage";
import FollowupsPage from "./pages/followups/FollowupsPage";
import CustomersListPage from "./pages/customers/CustomersListPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import ApplicationsPage from "./pages/applications/ApplicationsPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import AdminUsersPage from "./pages/adminUsers/AdminUsersPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />

              {/* Central customer sign-in — separate identity/role from ZenX staff above. */}
              <Route path="/login" element={<CustomerLoginPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/launcher" element={<LauncherPage />} />

              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/enquiries" element={<EnquiriesListPage />} />
                <Route path="/admin/enquiries/:id" element={<EnquiryDetailPage />} />
                <Route path="/admin/follow-ups" element={<FollowupsPage />} />
                <Route path="/admin/customers" element={<CustomersListPage />} />
                <Route path="/admin/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/admin/applications" element={<ApplicationsPage />} />
                <Route path="/admin/analytics" element={<AnalyticsPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
