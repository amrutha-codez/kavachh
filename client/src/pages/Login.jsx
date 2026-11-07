import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

export default function Login() {
  const { user, login, signup } = useAuth();
  const { locations } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = location.state?.from || "/profile";

  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    homeArea: "",
    emergencyContact: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={goTo} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await signup(form);
      navigate(goTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <h1 className="page-title">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="page-sub">
        {mode === "login" ? "Log in to share reports and see your profile." : "It takes less than a minute."}
      </p>

      <form className="card auth-card" onSubmit={submit}>
        {mode === "signup" && (
          <label className="field">
            <span>Full name</span>
            <input className="input" value={form.name} onChange={set("name")} autoComplete="name" required />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Password{mode === "signup" ? " (at least 6 characters)" : ""}</span>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 6 : undefined}
            required
          />
        </label>

        {mode === "signup" && (
          <>
            <label className="field">
              <span>Phone (optional)</span>
              <input className="input" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </label>
            <label className="field">
              <span>Home area (optional)</span>
              <select className="input" value={form.homeArea} onChange={set("homeArea")}>
                <option value="">Choose an area</option>
                {[...locations]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) => (
                    <option key={l.name}>{l.name}</option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Emergency contact name (optional)</span>
              <input className="input" value={form.emergencyContact} onChange={set("emergencyContact")} />
            </label>
          </>
        )}

        {error && <p className="notice error">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>

        <p className="switch-mode">
          {mode === "login" ? "New to Kavach?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}
