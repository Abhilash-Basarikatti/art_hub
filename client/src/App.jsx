import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Container, Nav, Navbar, Badge } from 'react-bootstrap';
import { useApp } from './context';
import { Home, Gallery, ArtworkDetail, ArtistProfile, Auth, Cart } from './pages';
import { Dashboard } from './dashboards';
import { Community, Messages } from './community';

function Header() {
  const { user, logout, cart } = useApp(), nav = useNavigate();
  return (
    <Navbar expand="lg" sticky="top" className="ah-nav shadow-sm"><Container>
      <Navbar.Brand as={Link} to="/" className="brand">Art<span>Hub</span></Navbar.Brand>
      <Navbar.Toggle aria-controls="ah-nav" />
      <Navbar.Collapse id="ah-nav">
        <Nav className="me-auto">
          <Nav.Link as={NavLink} to="/gallery">Gallery</Nav.Link>
          <Nav.Link as={NavLink} to="/community">Community</Nav.Link>
          {user && <Nav.Link as={NavLink} to="/messages">Messages</Nav.Link>}
        </Nav>
        <Nav className="align-items-lg-center gap-2">
          {user?.role === 'buyer' && (
            <Nav.Link as={Link} to="/cart" className="nav-cart">
              Cart <Badge className="badge-cart">{cart.length}</Badge>
            </Nav.Link>
          )}
          {user ? <>
            <Nav.Link as={NavLink} to="/dashboard" className="nav-user">{user.name.split(' ')[0]} · {user.role}</Nav.Link>
            <button type="button" className="btn btn-outline-gold btn-sm" onClick={() => { logout(); nav('/'); }}>Logout</button>
          </> : <Link to="/auth" className="btn btn-gold btn-sm">Login / Register</Link>}
        </Nav>
      </Navbar.Collapse></Container></Navbar>
  );
}

const Private = ({ children }) => {
  const { user, ready } = useApp();
  if (!ready) return <div className="page-loading"><div className="loader" aria-label="Loading" /></div>;
  return user ? children : <Navigate to="/auth" />;
};

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} /><Route path="/gallery" element={<Gallery />} />
          <Route path="/art/:id" element={<ArtworkDetail />} /><Route path="/artist/:id" element={<ArtistProfile />} />
          <Route path="/auth" element={<Auth />} /><Route path="/cart" element={<Private><Cart /></Private>} />
          <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
          <Route path="/community" element={<Community />} /><Route path="/messages" element={<Private><Messages /></Private>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="ah-footer text-center">
        <Container>
          <p className="mb-1"><strong>ArtHub</strong> — where artists meet collectors</p>
          <p className="mb-0 small">© {new Date().getFullYear()} ArtHub. Curated originals, delivered with care.</p>
        </Container>
      </footer>
    </div>
  );
}
