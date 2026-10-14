import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Landing from "./screens/Landing";
import Dashboard from "./screens/Dashboard";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Expenditures from "./screens/Expenditures";
import AddExpenditure from "./screens/AddExpenditure";
import EditExpenditure from "./screens/EditExpenditure";
import Categories from "./screens/Categories";
import ExportExcel from "./screens/ExportExcel";
import Settings from "./screens/Settings";
import Profile from "./screens/Profile";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import SplashScreen from "./components/layout/SplashScreen";
import { AuthProvider } from "./auth/AuthContext";

function AppRoutes() {
  const location = useLocation();
  const [splashDismissedFor, setSplashDismissedFor] = useState(null);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setSplashDismissedFor(location.pathname),
      1600,
    );
    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <>
      {splashDismissedFor !== location.pathname && <SplashScreen />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/expenditures" element={<Expenditures />} />
          <Route path="/expenditures/add" element={<AddExpenditure />} />
          <Route path="/expenditures/edit/:id" element={<EditExpenditure />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/export" element={<ExportExcel />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
