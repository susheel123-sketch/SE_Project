import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from './auth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyRequests from './pages/MyRequests';
import RequestForm from './pages/RequestForm';
import ShopProfile from './pages/ShopProfile';
import ShopServices from './pages/ShopServices';
import AdminShops from './pages/AdminShops';
import PublicShop from './pages/PublicShop';

const NAV = {
  owner: [['/requests', 'My Requests'], ['/requests/new', 'New Request']],
  shop: [['/shop/profile', 'Shop Profile'], ['/shop/services', 'My Services']],
  admin: [['/admin/shops', 'Verify Shops']],
};

// Sends logged-out users to log in, and users with the wrong role to their own home page.
function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export default function App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="topbar">
        <Link to={user ? homeFor(user.role) : '/'} className="brand">Revive</Link>
        {user && (
          <nav>
            {NAV[user.role].map(([to, label]) => (
              <NavLink key={to} to={to} end>{label}</NavLink>
            ))}
          </nav>
        )}
        <div className="topbar-right">
          {user ? (
            <>
              <span className="who">{user.name} · <span className="role-tag">{user.role}</span></span>
              <button type="button" className="btn ghost" onClick={() => { signOut(); navigate('/login'); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn ghost">Log in</Link>
              <Link to="/signup" className="btn">Sign up</Link>
            </>
          )}
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/shops/:id" element={<PublicShop />} />

          <Route path="/requests" element={<Guard role="owner"><MyRequests /></Guard>} />
          <Route path="/requests/new" element={<Guard role="owner"><RequestForm /></Guard>} />
          <Route path="/requests/:id/edit" element={<Guard role="owner"><RequestForm /></Guard>} />

          <Route path="/shop/profile" element={<Guard role="shop"><ShopProfile /></Guard>} />
          <Route path="/shop/services" element={<Guard role="shop"><ShopServices /></Guard>} />

          <Route path="/admin/shops" element={<Guard role="admin"><AdminShops /></Guard>} />
          <Route path="*" element={<p className="center muted">Page not found. <Link to="/">Go home</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
