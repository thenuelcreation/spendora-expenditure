import {
  ArrowLeft,
  Mail,
  Save,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateProfile(form);
      setSuccess("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inner-page">
      <header className="inner-header">
        <div>
          <Link to="/settings" className="back-link"><ArrowLeft size={17} />Settings</Link>
          <h1>Profile</h1>
          <p>Manage your personal information.</p>
        </div>
      </header>
      <section className="profile-card">
        <div className="profile-cover" />
        <div className="profile-main">
          <div className="profile-avatar">{user?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div className="profile-heading"><h2>{user?.name}</h2><p>{user?.email}</p></div>
        </div>
        <form className="profile-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="success-message" role="status">{success}</div>}
          <div className="form-grid">
            <label>
              Full name
              <div className="input-with-icon">
                <User size={17} />
                <input type="text" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={100} />
              </div>
            </label>
            <label>
              Email address
              <div className="input-with-icon">
                <Mail size={17} />
                <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={254} />
              </div>
            </label>
          </div>
          <div className="profile-actions">
            <button className="secondary-save-button" disabled={saving}>
              <Save size={17} />{saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Profile;
