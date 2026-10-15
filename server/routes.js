const r = require('express').Router(), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Artwork, Order, Post, Message } = require('./models');
const { auth, upload } = require('./middleware');
const sign = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = u => ({ _id: u._id, name: u.name, email: u.email, role: u.role, bio: u.bio, avatar: u.avatar });
const img = f => (f ? '/uploads/' + f.filename : undefined);
const bad = (res, message, code = 400) => res.status(code).json({ message });

/* ---------- AUTH ---------- */
r.post('/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || password.length < 6) return bad(res, 'Name, email and a 6+ character password are required');
  if (await User.findOne({ email: email.toLowerCase() })) return bad(res, 'Email already registered');
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: role === 'artist' ? 'artist' : 'buyer' });
  res.json({ token: sign(u), user: pub(u) });
});
r.post('/auth/login', async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return bad(res, 'Invalid email or password', 401);
  if (u.blocked) return bad(res, 'Account is blocked', 403);
  res.json({ token: sign(u), user: pub(u) });
});
r.get('/auth/me', auth(), (req, res) => res.json(pub(req.user)));
r.put('/auth/me', auth(), upload.single('avatar'), async (req, res) => {
  const u = req.user; u.name = req.body.name || u.name; if (req.body.bio !== undefined) u.bio = req.body.bio;
  if (req.file) u.avatar = img(req.file); await u.save(); res.json(pub(u));
});
r.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('name bio avatar role');
  if (!user) return bad(res, 'Not found', 404);
  res.json({ user, artworks: await Artwork.find({ artist: user._id }).populate('artist', 'name avatar') });
});
r.get('/artists', async (req, res) => res.json(await User.find({ role: 'artist', blocked: false }).select('name bio avatar')));

/* ---------- ARTWORKS ---------- */
r.get('/artworks', async (req, res) => {
  const { q, category, sort, featured, artist } = req.query, f = {};
  if (q) f.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (category) f.category = category; if (featured) f.featured = true; if (artist) f.artist = artist;
  const s = { newest: { createdAt: -1 }, top: { rating: -1 }, low: { price: 1 }, high: { price: -1 } }[sort] || { createdAt: -1 };
  res.json(await Artwork.find(f).sort(s).populate('artist', 'name avatar'));
});
r.get('/artworks/mine', auth('artist'), async (req, res) => res.json(await Artwork.find({ artist: req.user._id }).sort('-createdAt')));
r.get('/artworks/:id', async (req, res) => {
  const a = await Artwork.findById(req.params.id).populate('artist', 'name avatar bio');
  a ? res.json(a) : bad(res, 'Artwork not found', 404);
});
r.post('/artworks', auth('artist'), upload.single('image'), async (req, res) => {
  const { title, description, category, price } = req.body;
  if (!req.file || !title || !price) return bad(res, 'Image, title and price are required');
  res.json(await Artwork.create({ title, description, category, price: +price, image: img(req.file), artist: req.user._id }));
});
r.put('/artworks/:id', auth('artist'), upload.single('image'), async (req, res) => {
  const a = await Artwork.findOne({ _id: req.params.id, artist: req.user._id }); if (!a) return bad(res, 'Not found', 404);
  ['title', 'description', 'category'].forEach(k => req.body[k] !== undefined && (a[k] = req.body[k]));
  if (req.body.price) a.price = +req.body.price; if (req.file) a.image = img(req.file);
  res.json(await a.save());
});
r.delete('/artworks/:id', auth('artist', 'admin'), async (req, res) => {
  const f = { _id: req.params.id }; if (req.user.role === 'artist') f.artist = req.user._id;
  await Artwork.findOneAndDelete(f); res.json({ ok: true });
});
r.put('/artworks/:id/featured', auth('admin'), async (req, res) => {
  const a = await Artwork.findById(req.params.id); if (!a) return bad(res, 'Artwork not found', 404);
  a.featured = !a.featured; res.json(await a.save());
});
r.post('/artworks/:id/reviews', auth('buyer'), async (req, res) => {
  const bought = await Order.exists({ buyer: req.user._id, 'items.artwork': req.params.id });
  if (!bought) return bad(res, 'Only buyers of this artwork can review it', 403);
  const a = await Artwork.findById(req.params.id); if (!a) return bad(res, 'Artwork not found', 404);
  const rating = Math.min(5, Math.max(1, +req.body.rating || 5));
  a.reviews = a.reviews.filter(v => String(v.user) !== String(req.user._id));
  a.reviews.push({ user: req.user._id, name: req.user.name, rating, comment: req.body.comment });
  a.rating = a.reviews.reduce((s, v) => s + v.rating, 0) / a.reviews.length;
  res.json(await a.save());
});

/* ---------- ORDERS ---------- */
r.post('/orders', auth('buyer'), async (req, res) => {
  const arts = await Artwork.find({ _id: { $in: req.body.ids || [] } });
  if (!arts.length || !req.body.address) return bad(res, 'Cart and shipping address are required');
  const items = arts.map(a => ({ artwork: a._id, artist: a.artist, title: a.title, price: a.price, image: a.image }));
  res.json(await Order.create({ buyer: req.user._id, items, total: items.reduce((s, i) => s + i.price, 0), address: req.body.address }));
});
r.get('/orders/mine', auth('buyer'), async (req, res) => res.json(await Order.find({ buyer: req.user._id }).sort('-createdAt')));
r.get('/orders/sales', auth('artist'), async (req, res) => {
  const os = await Order.find({ 'items.artist': req.user._id }).sort('-createdAt').populate('buyer', 'name email').lean();
  res.json(os.map(o => ({ ...o, items: o.items.filter(i => String(i.artist) === String(req.user._id)) })));
});
r.put('/orders/:id/status', auth('artist', 'admin'), async (req, res) => {
  const o = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!o) return bad(res, 'Order not found', 404);
  res.json(o);
});

/* ---------- COMMUNITY ---------- */
r.get('/posts', async (req, res) => res.json(await Post.find().sort('-createdAt').populate('author', 'name avatar role').populate('comments.user', 'name')));
r.post('/posts', auth(), upload.single('image'), async (req, res) => {
  if (!req.body.text) return bad(res, 'Write something first');
  res.json(await Post.create({ author: req.user._id, text: req.body.text, image: img(req.file) }));
});
r.post('/posts/:id/comments', auth(), async (req, res) => {
  if (!req.body.text?.trim()) return bad(res, 'Comment cannot be empty');
  const p = await Post.findById(req.params.id); if (!p) return bad(res, 'Post not found', 404);
  p.comments.push({ user: req.user._id, text: req.body.text.trim() }); await p.save(); res.json({ ok: true });
});
r.delete('/posts/:id', auth(), async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return bad(res, 'Post not found', 404);
  if (req.user.role !== 'admin' && String(p.author) !== String(req.user._id)) return bad(res, 'Access denied', 403);
  await p.deleteOne();
  res.json({ ok: true });
});

/* ---------- DIRECT MESSAGES ---------- */
r.get('/messages', auth(), async (req, res) => {
  const me = String(req.user._id);
  const ms = await Message.find({ $or: [{ from: me }, { to: me }] }).sort('-createdAt').populate('from to', 'name avatar');
  const seen = new Map(); ms.forEach(m => { const o = String(m.from._id) === me ? m.to : m.from; if (!seen.has(String(o._id))) seen.set(String(o._id), { user: o, last: m.text }); });
  res.json([...seen.values()]);
});
r.get('/messages/:uid', auth(), async (req, res) => {
  const me = req.user._id, o = req.params.uid;
  res.json(await Message.find({ $or: [{ from: me, to: o }, { from: o, to: me }] }).sort('createdAt'));
});
r.post('/messages/:uid', auth(), async (req, res) => {
  if (!req.body.text) return bad(res, 'Empty message');
  res.json(await Message.create({ from: req.user._id, to: req.params.uid, text: req.body.text }));
});

/* ---------- ADMIN ---------- */
r.get('/admin/users', auth('admin'), async (req, res) => res.json(await User.find({ role: { $ne: 'admin' } }).select('-password').sort('-createdAt')));
r.put('/admin/users/:id/block', auth('admin'), async (req, res) => {
  const u = await User.findById(req.params.id); if (!u) return bad(res, 'User not found', 404);
  u.blocked = !u.blocked; await u.save(); res.json({ blocked: u.blocked });
});
r.delete('/admin/users/:id', auth('admin'), async (req, res) => {
  await Artwork.deleteMany({ artist: req.params.id }); await Post.deleteMany({ author: req.params.id }); await User.findByIdAndDelete(req.params.id); res.json({ ok: true });
});
r.get('/admin/orders', auth('admin'), async (req, res) => res.json(await Order.find().sort('-createdAt').populate('buyer', 'name email')));

module.exports = r;
