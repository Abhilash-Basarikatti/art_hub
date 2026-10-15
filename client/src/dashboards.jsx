import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Form, Modal, Nav, Table, Row, Col, Alert } from 'react-bootstrap';
import api, { err } from './api';
import { useApp } from './context';
import { CATS, money, Avatar, ArtCard } from './pages';

const Stat = ({ label, value }) => (
  <Col xs={6} md={3}><div className="stat"><small>{label}</small><h3>{value}</h3></div></Col>
);

const Tabs = ({ tabs, tab, setTab }) => (
  <Nav variant="pills" className="dash-tabs mb-4">
    {tabs.map(([k, l]) => (
      <Nav.Item key={k}><Nav.Link active={tab === k} onClick={() => setTab(k)}>{l}</Nav.Link></Nav.Item>
    ))}
  </Nav>
);

function ProfileForm() {
  const { user, setUser } = useApp();
  const [f, setF] = useState({ name: user.name, bio: user.bio || '' });
  const [file, setFile] = useState(null);
  const [ok, setOk] = useState(false);
  const save = async e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', f.name);
    fd.append('bio', f.bio);
    if (file) fd.append('avatar', file);
    setUser((await api.put('/auth/me', fd)).data);
    setOk(true);
  };
  return (
    <Form onSubmit={save} className="card-box p-4 profile-form" style={{ maxWidth: 560 }}>
      {ok && <Alert variant="success">Profile updated</Alert>}
      <h5 className="serif mb-3">Your profile</h5>
      <Avatar u={user} size={72} />
      <Form.Control type="file" accept="image/*" className="my-3" onChange={e => setFile(e.target.files[0])} />
      <Form.Control className="mb-3" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <Form.Control as="textarea" rows={4} className="mb-3" placeholder="About you" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
      <button type="submit" className="btn btn-gold">Save profile</button>
    </Form>
  );
}

function ArtModal({ art, onClose, onSaved }) {
  const [f, setF] = useState({
    title: art?.title || '',
    description: art?.description || '',
    category: art?.category || CATS[0],
    price: art?.price || '',
  });
  const [file, setFile] = useState(null);
  const [e, setE] = useState('');
  const save = async ev => {
    ev.preventDefault();
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('image', file);
    try {
      if (art._id) await api.put('/artworks/' + art._id, fd);
      else await api.post('/artworks', fd);
      onSaved();
    } catch (x) { setE(err(x)); }
  };
  const set = k => ev => setF({ ...f, [k]: ev.target.value });
  return (
    <Modal show centered onHide={onClose} contentClassName="border-0">
      <Form onSubmit={save}>
        <Modal.Header closeButton><Modal.Title className="serif">{art._id ? 'Edit' : 'Upload'} artwork</Modal.Title></Modal.Header>
        <Modal.Body>
          {e && <Alert variant="danger">{e}</Alert>}
          <Form.Control className="mb-3" placeholder="Title" value={f.title} onChange={set('title')} required />
          <Form.Control as="textarea" rows={3} className="mb-3" placeholder="Description" value={f.description} onChange={set('description')} />
          <Row className="g-2 mb-3">
            <Col><Form.Select value={f.category} onChange={set('category')}>{CATS.map(c => <option key={c}>{c}</option>)}</Form.Select></Col>
            <Col><Form.Control type="number" min="1" placeholder="Price (₹)" value={f.price} onChange={set('price')} required /></Col>
          </Row>
          <Form.Control type="file" accept="image/*" onChange={ev => setFile(ev.target.files[0])} />
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-gold">Save</button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function ArtistDash() {
  const [tab, setTab] = useState('art');
  const [arts, setArts] = useState([]);
  const [sales, setSales] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => {
    api.get('/artworks/mine').then(r => setArts(r.data));
    api.get('/orders/sales').then(r => setSales(r.data));
  };
  useEffect(load, []);
  const revenue = sales.reduce((s, o) => s + o.items.reduce((x, i) => x + i.price, 0), 0);
  const del = async id => { if (confirm('Delete this listing?')) { await api.delete('/artworks/' + id); load(); } };
  return (
    <>
      <Row className="g-3 mb-4">
        <Stat label="Listings" value={arts.length} />
        <Stat label="Orders" value={sales.length} />
        <Stat label="Revenue" value={money(revenue)} />
      </Row>
      <Tabs tab={tab} setTab={setTab} tabs={[['art', 'My Artworks'], ['sales', 'Orders & Sales'], ['profile', 'Profile']]} />
      {tab === 'art' && (
        <>
          <button type="button" className="btn btn-gold mb-3" onClick={() => setEdit({})}>+ Upload artwork</button>
          <Row className="g-3">
            {arts.map(a => (
              <ArtCard key={a._id} a={a} staticCard>
                <div className="art-card-actions">
                  <button type="button" className="btn btn-sm btn-outline-gold flex-grow-1" onClick={() => setEdit(a)}>Edit</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => del(a._id)}>Delete</button>
                </div>
              </ArtCard>
            ))}
          </Row>
        </>
      )}
      {tab === 'sales' && (
        <div className="table-wrap">
          <Table className="ah-table mb-0">
            <thead><tr><th>Date</th><th>Buyer</th><th>Items</th><th>Ship to</th><th>Status</th></tr></thead>
            <tbody>
              {sales.map(o => (
                <tr key={o._id}>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>{o.buyer?.name}</td>
                  <td>{o.items.map(i => i.title + ' (' + money(i.price) + ')').join(', ')}</td>
                  <td>{o.address}</td>
                  <td>
                    <Form.Select size="sm" value={o.status} onChange={async e => { await api.put(`/orders/${o._id}/status`, { status: e.target.value }); load(); }}>
                      {['Placed', 'Shipped', 'Delivered'].map(s => <option key={s}>{s}</option>)}
                    </Form.Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {tab === 'profile' && <ProfileForm />}
      {edit && <ArtModal art={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}

function BuyerDash() {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get('/orders/mine').then(r => setOrders(r.data)); }, []);
  return (
    <>
      <Row className="g-3 mb-4">
        <Stat label="Orders" value={orders.length} />
        <Stat label="Total spent" value={money(orders.reduce((s, o) => s + o.total, 0))} />
      </Row>
      <Tabs tab={tab} setTab={setTab} tabs={[['orders', 'Order History'], ['profile', 'Profile']]} />
      {tab === 'orders' ? (
        orders.length ? orders.map(o => (
          <div key={o._id} className="card-box p-3 mb-3 order-card">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <span className="order-status">{o.status}</span>
              <div className="text-end">
                <small className="text-muted d-block">{new Date(o.createdAt).toLocaleDateString()}</small>
                <b className="price-tag">{money(o.total)}</b>
              </div>
            </div>
            {o.items.map((i, k) => (
              <div key={k} className="cart-row border-0 py-2">
                <img src={i.image} alt="" />
                <div className="flex-grow-1">{i.title}</div>
                <Link to={`/art/${i.artwork}`} className="btn btn-sm btn-outline-gold">Rate & review</Link>
              </div>
            ))}
          </div>
        )) : (
          <div className="empty-state">
            <p>No orders yet.</p>
            <Link to="/gallery" className="btn btn-gold">Start exploring</Link>
          </div>
        )
      ) : <ProfileForm />}
    </>
  );
}

function AdminDash() {
  const [tab, setTab] = useState('users');
  const [d, setD] = useState({ users: [], arts: [], orders: [], posts: [] });
  const load = async () => {
    const [u, a, o, p] = await Promise.all(['/admin/users', '/artworks', '/admin/orders', '/posts'].map(x => api.get(x)));
    setD({ users: u.data, arts: a.data, orders: o.data, posts: p.data });
  };
  useEffect(() => { load(); }, []);
  const act = fn => async () => { await fn(); load(); };
  return (
    <>
      <Row className="g-3 mb-4">
        <Stat label="Users" value={d.users.length} />
        <Stat label="Artworks" value={d.arts.length} />
        <Stat label="Orders" value={d.orders.length} />
        <Stat label="Posts" value={d.posts.length} />
      </Row>
      <Tabs tab={tab} setTab={setTab} tabs={[['users', 'Users & Artists'], ['arts', 'Artworks'], ['orders', 'Orders'], ['posts', 'Community']]} />
      <div className="table-wrap">
        <Table className="ah-table mb-0">
          <tbody>
            {tab === 'users' && d.users.map(u => (
              <tr key={u._id}>
                <td>{u.name}</td><td>{u.email}</td><td><span className="badge-cat">{u.role}</span></td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-gold me-2" onClick={act(() => api.put(`/admin/users/${u._id}/block`))}>{u.blocked ? 'Unblock' : 'Block'}</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={act(() => confirm('Delete user and their content?') && api.delete('/admin/users/' + u._id))}>Delete</button>
                </td>
              </tr>
            ))}
            {tab === 'arts' && d.arts.map(a => (
              <tr key={a._id}>
                <td>{a.title}</td><td>{a.artist?.name}</td><td>{money(a.price)}</td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-gold me-2" onClick={act(() => api.put(`/artworks/${a._id}/featured`))}>{a.featured ? '★ Unfeature' : '☆ Feature'}</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={act(() => api.delete('/artworks/' + a._id))}>Delete</button>
                </td>
              </tr>
            ))}
            {tab === 'orders' && d.orders.map(o => (
              <tr key={o._id}>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td><td>{o.buyer?.name}</td><td>{money(o.total)}</td><td>{o.items.length} item(s)</td>
                <td>
                  <Form.Select size="sm" value={o.status} onChange={async e => { await api.put(`/orders/${o._id}/status`, { status: e.target.value }); load(); }}>
                    {['Placed', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </Form.Select>
                </td>
              </tr>
            ))}
            {tab === 'posts' && d.posts.map(p => (
              <tr key={p._id}>
                <td>{p.author?.name}</td><td>{p.text.slice(0, 90)}</td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={act(() => api.delete('/posts/' + p._id))}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}

export function Dashboard() {
  const { user } = useApp();
  const title = user.role === 'admin' ? 'Admin Console' : user.role === 'artist' ? 'Artist Studio' : 'My Collection';
  const sub = user.role === 'admin' ? 'Platform overview & moderation' : user.role === 'artist' ? 'Manage listings, sales & profile' : 'Orders, reviews & account';
  return (
    <Container className="py-5">
      <header className="dash-header">
        <h1 className="serif">{title}</h1>
        <p>{sub}</p>
      </header>
      {user.role === 'artist' ? <ArtistDash /> : user.role === 'admin' ? <AdminDash /> : <BuyerDash />}
    </Container>
  );
}
