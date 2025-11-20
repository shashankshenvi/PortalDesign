import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout/Layout";
import { useSession } from "./hooks/useSession";

const LoginPage = lazy(() => import("./pages/LoginModule/LoginPage"));
const RegisterPage = lazy(() =>
  import("./pages/RegistrationModule/Registration")
);
const VerifyMail = lazy(() => import("./components/VerifyMail/VerifyMail"));
const ForgotPassword = lazy(() =>
  import("./pages/ForgotPassword/ForgotPassword")
);
const MainPage = lazy(() => import("./pages/MainPage/MainPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage/ProfilePage"));
const Admin = lazy(() => import("./pages/Admin/Admin"));

const EditUser = lazy(() => import("./pages/Admin/User/EditUser/EditUser"));
const ViewUser = lazy(() => import("./pages/Admin/User/ViewUser/ViewUser"));
const AddRole = lazy(() => import("./pages/Admin/Role/AddRole/AddRole"));
const EditRole = lazy(() => import("./pages/Admin/Role/EditRole/EditRole"));
const ViewRoles = lazy(() => import("./pages/Admin/Role/ViewRole/ViewRole"));

const ApproveRejectRoles = lazy(() =>
  import("./pages/Admin/Approval/ApproveRejectRoles/ApproveRejectRoles")
);
const ApproveRejectUsers = lazy(() =>
  import("./pages/Admin/Approval/ApproveRejectUsers/ApproveRejectUsers")
);

const LoadingFallback = () => (
  <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
);

const ProtectedRoute = ({ children }) => {
  const { token } = useSession();
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { token } = useSession();
  return token ? <Navigate to="/MainPage" replace /> : children;
};

const App = () => {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage adminAdd={false} />
              </PublicRoute>
            }
          />
          <Route
            path="/VerifyMail"
            element={
              <PublicRoute>
                <VerifyMail />
              </PublicRoute>
            }
          />
          <Route
            path="/ForgotPassword"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/MainPage" replace />} />
            <Route path="MainPage" element={<MainPage />} />
            <Route path="ProfilePage" element={<ProfilePage />} />

            <Route path="admin" element={<Admin />} />
            <Route
              path="admin/register"
              element={<RegisterPage adminAdd={true} />}
            />

            <Route
              path="admin/editUser"
              element={<EditUser adminAdd={true} />}
            />
            <Route
              path="admin/viewUser"
              element={<ViewUser adminAdd={true} />}
            />
            <Route path="admin/addRole" element={<AddRole adminAdd={true} />} />
            <Route
              path="admin/editRole"
              element={<EditRole adminAdd={true} />}
            />
            <Route
              path="admin/viewRole"
              element={<ViewRoles adminAdd={true} />}
            />
            <Route
              path="admin/approval/role"
              element={<ApproveRejectRoles />}
            />
            <Route
              path="admin/approval/user"
              element={<ApproveRejectUsers />}
            />
          </Route>

          {/* Fallback */}
          <Route
            path="*"
            element={
              <div style={{ textAlign: "center", padding: "50px" }}>
                Page Not Found
              </div>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
