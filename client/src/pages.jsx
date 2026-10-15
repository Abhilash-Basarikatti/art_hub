import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Form, Alert } from 'react-bootstrap';
import api, { err } from './api';
import { useApp } from './context';

export const CATS = ['Painting', 'Sculpture', 'Photography', 'Digital', 'Drawing', 'Printmaking', 'Mixed Media'];
export const money = n => '₹' + Number(n).toLocaleString('en-IN');
export const Stars = ({ v = 0 }) => <span className="stars">{'★'.repeat(Math.round(v))}{'☆'.repeat(5 - Math.round(v))}</span>;
export const Avatar = ({ u, size = 40 }) => u?.avatar ? <img src={u.avatar} className="avatar" style={{ width: size, height: size }} alt="" /> :
  <span className="avatar ph" style={{ width: size, height: size, fontSize: size / 2.3 }}>{u?.name?.[0]}</span>;

export const ArtCard = ({ a, staticCard, stagger = 0, children }) => {
  const inner = (
    <>
      <div className="art-img">
        {a.featured && <span className="featured-ribbon">Featured</span>}
        <img src={a.image} alt={a.title} loading="lazy" />
        {!staticCard && <div className="art-img-overlay"><span>View piece</span></div>}
      </div>
      <div className="art-card-body">
        <h6 className="mb-0">{a.title}</h6>
        <small className="art-card-meta">{a.artist?.name}</small>
        <div className="art-card-foot"><span className="price-tag">{money(a.price)}</span><Stars v={a.rating} /></div>
      </div>
      {children}
    </>
  );
  const cls = `art-card${staticCard ? ' art-card-static' : ''}${stagger ? ` stagger-${stagger}` : ''}`;
  return staticCard ? (
    <Col xs={6} lg={3}><div className={cls}>{inner}</div></Col>
  ) : (
    <Col xs={6} lg={3}><Link to={`/art/${a._id}`} className={cls}>{inner}</Link></Col>
  );
};

const Section = ({ title, eyebrow, to, children }) => (
  <section className="section-block">
    <Container>
      <div className="section-head">
        <div>
          {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
          <h2 className="serif m-0">{title}</h2>
        </div>
        {to && <Link to={to} className="gold-link">View all →</Link>}
      </div>
      {children}
    </Container>
  </section>
);

const useList = (url) => { const [d, setD] = useState([]); useEffect(() => { api.get(url).then(r => setD(r.data)); }, [url]); return d; };

const PageSkeleton = () => (
  <Container className="py-5">
    <div className="skeleton skeleton-hero" />
    <div className="skeleton skeleton-block" />
  </Container>
);

export function Home() {
  const featured = useList('/artworks?featured=1'), top = useList('/artworks?sort=top'), artists = useList('/artists');
  const picks = (featured.length ? featured : top).slice(0, 4);
  return (<>
    <header className="hero">
      <Container>
        <div className="hero-inner">
          <span className="hero-eyebrow">Premium art marketplace</span>
          <h1 className="serif">Discover art with a story.</h1>
          <p className="hero-lead">Original works from independent artists, delivered to collectors who care about craft, provenance, and connection.</p>
          <div className="hero-actions">
            <Link to="/gallery" className="btn btn-gold btn-lg">Explore Gallery</Link>
            <Link to="/auth" className="btn btn-outline-light btn-lg">Sell your art</Link>
          </div>
          <div className="hero-trust">
            <span>Curated collections</span>
            <span>Verified artists</span>
            <span>Secure checkout</span>
          </div>
        </div>
      </Container>
    </header>
    <Section title="Featured Collection" eyebrow="Handpicked" to="/gallery">
      <Row className="g-4">{picks.map((a, i) => <ArtCard key={a._id} a={a} stagger={(i % 4) + 1} />)}</Row>
    </Section>
    <div className="band">
      <Section title="Top Rated" eyebrow="Collector favorites" to="/gallery?sort=top">
        <Row className="g-4">{top.slice(0, 4).map((a, i) => <ArtCard key={a._id} a={a} stagger={(i % 4) + 1} />)}</Row>
      </Section>
    </div>
    <Section title="Meet the Artists" eyebrow="The makers">
      <Row className="g-4">{artists.slice(0, 4).map(u => (
        <Col xs={6} lg={3} key={u._id}>
          <Link to={`/artist/${u._id}`} className="artist-tile">
            <Avatar u={u} size={72} />
            <h6 className="mt-3 mb-1">{u.name}</h6>
            <small className="text-muted">{u.bio?.slice(0, 60)}</small>
          </Link>
        </Col>))}
      </Row>
    </Section>
    <section className="cta-band">
      <Container>
        <div className="cta-inner">
          <div>
            <span className="section-eyebrow">For creators</span>
            <h2 className="serif mb-2">Show your work to collectors who care.</h2>
            <p className="mb-0 text-muted">List originals, manage orders, and grow your audience on ArtHub.</p>
          </div>
          <Link to="/auth" className="btn btn-gold btn-lg">Open your studio</Link>
        </div>
      </Container>
    </section>
  </>);
}

export function Gallery() {
  const { search } = useLocation();
  const [f, setF] = useState({ q: '', category: '', sort: new URLSearchParams(search).get('sort') || 'newest' }), [list, setList] = useState([]);
  useEffect(() => {
    const sort = new URLSearchParams(search).get('sort') || 'newest';
    setF(prev => (prev.sort === sort ? prev : { ...prev, sort }));
  }, [search]);
  useEffect(() => { const t = setTimeout(() => api.get('/artworks', { params: f }).then(r => setList(r.data)), 250); return () => clearTimeout(t); }, [f]);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (<>
    <div className="page-hero-bar">
      <Container>
        <div className="page-header mb-0">
          <h1 className="page-title serif">The Gallery</h1>
          <p className="page-sub">Browse original works — filter by category, rating, or price.</p>
        </div>
      </Container>
    </div>
    <Container className="pb-5">
      <Row className="g-2 mb-4 filter-bar">
        <Col md={5}><Form.Control placeholder="Search artworks…" value={f.q} onChange={set('q')} /></Col>
        <Col md={4}><Form.Select value={f.category} onChange={set('category')}><option value="">All categories</option>{CATS.map(c => <option key={c}>{c}</option>)}</Form.Select></Col>
        <Col md={3}><Form.Select value={f.sort} onChange={set('sort')}><option value="newest">Newest</option><option value="top">Top rated</option><option value="low">Price: low → high</option><option value="high">Price: high → low</option></Form.Select></Col>
      </Row>
      <Row className="g-4">{list.map(a => <ArtCard key={a._id} a={a} />)}</Row>
      {!list.length && <div className="empty-state"><p>No artworks match your filters.</p><Link to="/gallery" className="gold-link" onClick={() => setF({ q: '', category: '', sort: 'newest' })}>Clear filters</Link></div>}
    </Container>
  </>);
}

export function ArtworkDetail() {
  const { id } = useParams(), { user, addToCart, cart } = useApp(), nav = useNavigate();
  const [a, setA] = useState(null), [rv, setRv] = useState({ rating: 5, comment: '' }), [msg, setMsg] = useState('');
  const load = () => api.get('/artworks/' + id).then(r => setA(r.data)); useEffect(() => { load(); }, [id]);
  if (!a) return <PageSkeleton />;
  const review = async e => { e.preventDefault(); try { await api.post(`/artworks/${id}/reviews`, rv); setMsg('Review submitted'); setRv({ rating: 5, comment: '' }); load(); } catch (x) { setMsg(err(x)); } };
  const inCart = cart.some(c => c._id === a._id);
  return (<Container className="py-5 detail-layout">
    <Row className="g-5 align-items-start">
      <Col md={6}>
        <div className="detail-img-wrap">
          <img src={a.image} className="detail-img" alt={a.title} />
        </div>
      </Col>
      <Col md={6}>
        <div className="card-box detail-panel">
          <span className="badge-cat">{a.category}</span>
          <h1 className="serif mt-2">{a.title}</h1>
          <Link to={`/artist/${a.artist._id}`} className="gold-link">by {a.artist.name}</Link>
          <div className="my-3"><Stars v={a.rating} /> <small className="text-muted">({a.reviews.length} reviews)</small></div>
          <div className="detail-price">{money(a.price)}</div>
          <p className="text-muted mb-0">{a.description}</p>
          <div className="detail-actions">
            {(!user || user.role === 'buyer') && <button type="button" className="btn btn-gold" disabled={inCart} onClick={() => user ? addToCart(a) : nav('/auth')}>{inCart ? 'In cart' : 'Add to cart'}</button>}
            {user && user._id !== a.artist._id && <Link to={`/messages?to=${a.artist._id}`} className="btn btn-outline-gold">Message artist</Link>}
          </div>
        </div>
      </Col>
    </Row>
    <div className="reviews-section">
      <h4 className="serif">Reviews</h4>
      {a.reviews.map(v => <div key={v._id} className="review"><b>{v.name}</b> <Stars v={v.rating} /><p className="mb-0 text-muted">{v.comment}</p></div>)}
      {user?.role === 'buyer' && <Form onSubmit={review} className="mt-4 card-box p-4">
        <h6 className="serif mb-3">Rate this artwork (purchased items only)</h6>
        {msg && <Alert variant={msg === 'Review submitted' ? 'success' : 'warning'}>{msg}</Alert>}
        <Form.Select className="mb-2 w-auto" value={rv.rating} onChange={e => setRv({ ...rv, rating: e.target.value })}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}</Form.Select>
        <Form.Control as="textarea" rows={2} className="mb-3" placeholder="Share your thoughts" value={rv.comment} onChange={e => setRv({ ...rv, comment: e.target.value })} />
        <button type="submit" className="btn btn-gold">Submit review</button>
      </Form>}
    </div>
  </Container>);
}

export function ArtistProfile() {
  const { id } = useParams(), [d, setD] = useState(null); useEffect(() => { api.get('/users/' + id).then(r => setD(r.data)); }, [id]);
  if (!d) return <PageSkeleton />;
  return (<Container className="py-5">
    <div className="profile-hero">
      <Avatar u={d.user} size={110} />
      <h1 className="serif mt-3">{d.user.name}</h1>
      <p className="text-muted mx-auto mb-3" style={{ maxWidth: 560 }}>{d.user.bio || 'This artist has not added a bio yet.'}</p>
      <Link to={`/messages?to=${id}`} className="btn btn-outline-gold">Send message</Link>
    </div>
    <h4 className="serif mb-4">Works by {d.user.name}</h4>
    <Row className="g-4">{d.artworks.map(a => <ArtCard key={a._id} a={a} />)}</Row>
  </Container>);
}

export function Auth() {
  const { login, user } = useApp(), nav = useNavigate();
  const [mode, setMode] = useState('login'), [f, setF] = useState({ name: '', email: '', password: '', role: 'buyer' }), [e, setE] = useState('');
  useEffect(() => { if (user) nav('/dashboard'); }, [user]);
  const submit = async ev => { ev.preventDefault(); try { login((await api.post('/auth/' + mode, f)).data); } catch (x) { setE(err(x)); } };
  const set = k => ev => setF({ ...f, [k]: ev.target.value });
  return (
    <div className="auth-page">
      <aside className="auth-visual d-none d-lg-flex" aria-hidden="true">
        <div className="auth-visual-inner">
          <p className="auth-visual-quote serif">“Art is the only way to run away without leaving home.”</p>
          <p className="auth-visual-tag">Curated marketplace · Trusted artists · Secure checkout</p>
        </div>
      </aside>
      <Form onSubmit={submit} className="card-box auth-card">
        <div className="auth-divider" />
        <h2 className="serif text-center mb-2">{mode === 'login' ? 'Welcome back' : 'Join ArtHub'}</h2>
        <p className="text-center text-muted small mb-4">{mode === 'login' ? 'Sign in to your collector or artist account' : 'Create your account in seconds'}</p>
        {e && <Alert variant="danger">{e}</Alert>}
        {mode === 'register' && <>
          <Form.Control className="mb-3" placeholder="Full name" value={f.name} onChange={set('name')} required />
          <div className="role-pick mb-3">{['buyer', 'artist'].map(r => (
            <button type="button" key={r} className={f.role === r ? 'on' : ''} onClick={() => setF({ ...f, role: r })}>{r === 'buyer' ? '🛍 I want to buy art' : '🎨 I am an artist'}</button>
          ))}</div>
        </>}
        <Form.Control className="mb-3" type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <Form.Control className="mb-3" type="password" placeholder="Password (min 6)" value={f.password} onChange={set('password')} required />
        <button type="submit" className="btn btn-gold w-100">{mode === 'login' ? 'Login' : 'Create account'}</button>
        <p className="text-center mt-3 mb-0">
          <a href="#" className="gold-link" onClick={ev => { ev.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); setE(''); }}>{mode === 'login' ? 'New here? Register' : 'Have an account? Login'}</a>
        </p>
      </Form>
    </div>
  );
}

export function Cart() {
  const { cart, removeFromCart, clearCart, user } = useApp(), [address, setAddress] = useState(''), [e, setE] = useState(''), nav = useNavigate();
  const total = cart.reduce((s, c) => s + c.price, 0);
  if (user.role !== 'buyer') return <Container className="py-5"><div className="empty-state"><p>Only buyers have a cart.</p></div></Container>;
  const checkout = async () => { try { await api.post('/orders', { ids: cart.map(c => c._id), address }); clearCart(); nav('/dashboard'); } catch (x) { setE(err(x)); } };
  return (<Container className="py-5 cart-page">
    <div className="page-header">
      <h1 className="page-title serif">Your Cart</h1>
      <p className="page-sub">{cart.length ? `${cart.length} item${cart.length > 1 ? 's' : ''} ready for checkout` : 'Your selection awaits'}</p>
    </div>
    {!cart.length ? (
      <div className="empty-state">
        <p>Your cart is empty.</p>
        <Link to="/gallery" className="btn btn-gold">Browse the gallery</Link>
      </div>
    ) : (
      <Row className="g-4">
        <Col md={8}>
          <div className="cart-list">
            {cart.map(c => (
              <div key={c._id} className="cart-row">
                <img src={c.image} alt="" />
                <div className="flex-grow-1"><h6 className="mb-1">{c.title}</h6><span className="price-tag">{money(c.price)}</span></div>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(c._id)}>Remove</button>
              </div>
            ))}
          </div>
        </Col>
        <Col md={4}>
          <div className="card-box p-4 checkout-box">
            <h5>Checkout</h5>
            {e && <Alert variant="danger">{e}</Alert>}
            <Form.Control as="textarea" rows={3} placeholder="Shipping address" className="mb-3" value={address} onChange={ev => setAddress(ev.target.value)} />
            <div className="d-flex justify-content-between checkout-total mb-3"><span>Total</span><b className="price-tag">{money(total)}</b></div>
            <button type="button" className="btn btn-gold w-100" onClick={checkout}>Place order</button>
          </div>
        </Col>
      </Row>
    )}
  </Container>);
}
