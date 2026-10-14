import {
  ArrowLeft,
  Bell,
  ChevronRight,
  LockKeyhole,
  LogOut,
  Palette,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

function Settings() {
  const navigate = useNavigate();
  const { user, updatePreferences, changePassword, logout } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const savePreference = async (preferences) => {
    setError("");
    setSuccess("");
    try {
      await updatePreferences(preferences);
      setSuccess("Settings saved.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangingPassword(false);
      setSuccess("Password updated successfully.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleLogout = async () => {
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="spendora-page settings-screen">
      <header className="spendora-page-header">
        <div className="spendora-page-header-left">
          <button className="spendora-back-button" onClick={() => navigate("/dashboard")} aria-label="Go back to dashboard"><ArrowLeft size={18} /></button>
          <div className="spendora-page-heading"><p className="page-eyebrow">ACCOUNT</p><h1>Settings</h1><p>Manage your Spendora account and preferences.</p></div>
        </div>
      </header>
      <main className="spendora-page-content">
        {error && <div className="auth-error" role="alert">{error}</div>}
        {success && <div className="success-message" role="status">{success}</div>}
        <div className="settings-layout">
          <section className="settings-card">
            <h2>Profile</h2>
            <Link to="/profile" className="settings-row">
              <div className="settings-row-icon"><User size={17} /></div>
              <div className="settings-row-content"><strong>Profile</strong><span>{user?.name} · {user?.email}</span></div>
              <ChevronRight size={17} className="settings-row-arrow" />
            </Link>
          </section>

          <section className="settings-card">
            <h2>Preferences</h2>
            <label className="settings-row">
              <div className="settings-row-icon"><Palette size={17} /></div>
              <div className="settings-row-content"><strong>Appearance</strong><span>Choose how Spendora looks</span></div>
              <select aria-label="Appearance" className="settings-value" value={user?.appearance || "System"} onChange={(event) => savePreference({ appearance: event.target.value })}>
                <option>System</option><option>Light</option><option>Dark</option>
              </select>
            </label>
            <label className="settings-row">
              <div className="settings-row-icon"><Bell size={17} /></div>
              <div className="settings-row-content"><strong>Notifications</strong><span>Store your notification preference</span></div>
              <input type="checkbox" checked={Boolean(user?.notifications)} onChange={(event) => savePreference({ notifications: event.target.checked })} aria-label="Enable notifications" />
            </label>
            <label className="settings-row">
              <div className="settings-row-icon"><span>{user?.preferredCurrency || "₦"}</span></div>
              <div className="settings-row-content"><strong>Display currency</strong><span>Dashboard totals use this currency</span></div>
              <select aria-label="Display currency" className="settings-value" value={user?.preferredCurrency || "NGN"} onChange={(event) => savePreference({ preferredCurrency: event.target.value })}>
                <option value="NGN">NGN</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option>
              </select>
            </label>
          </section>

          <section className="settings-card">
            <h2>Account</h2>
            <button className="settings-row" type="button" onClick={() => setChangingPassword((visible) => !visible)}>
              <div className="settings-row-icon"><LockKeyhole size={17} /></div>
              <div className="settings-row-content"><strong>Change password</strong><span>Update your account password</span></div>
              <ChevronRight size={17} className="settings-row-arrow" />
            </button>
            {changingPassword && (
              <form className="password-change-form" onSubmit={handlePasswordChange}>
                <label>Current password<input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required /></label>
                <label>New password<input type="password" autoComplete="new-password" minLength={8} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required /></label>
                <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} required /></label>
                <button type="submit" className="secondary-save-button">Update password</button>
              </form>
            )}
            <button className="settings-row danger" type="button" onClick={handleLogout}>
              <div className="settings-row-icon"><LogOut size={17} /></div>
              <div className="settings-row-content"><strong>Logout</strong><span>Sign out of your Spendora account</span></div>
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Settings;
