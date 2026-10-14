"use client";

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

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
import { AuthProvider } from "./auth/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
