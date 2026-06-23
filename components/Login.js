import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login({ onLogged }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onLogged?.();
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : err.message || 'No se pudo iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="logo"><i className="ti ti-wallet" /></div>
          <h1>Gestión de gastos</h1>
          <p>Ingresá para acceder a tus finanzas</p>
        </div>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="username"
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="login-error"><i className="ti ti-alert-circle" /> {error}</div>}

        <button className="btn btn-gold login-btn" type="submit" disabled={loading}>
          {loading ? <span className="spinner-sm" /> : <><i className="ti ti-login" /> Ingresar</>}
        </button>
      </form>
    </div>
  );
}
