const m = require('mongoose'); const { Schema } = m;
const ref = n => ({ type: Schema.Types.ObjectId, ref: n });
const T = { timestamps: true };
exports.User = m.model('User', new Schema({ name: String, email: { type: String, unique: true, lowercase: true }, password: String,
  role: { type: String, enum: ['buyer', 'artist', 'admin'], default: 'buyer' }, bio: { type: String, default: '' }, avatar: { type: String, default: '' }, blocked: { type: Boolean, default: false } }, T));
exports.Artwork = m.model('Artwork', new Schema({ title: String, description: String, category: String, price: Number, image: String, artist: ref('User'),
  featured: { type: Boolean, default: false }, rating: { type: Number, default: 0 }, reviews: [{ user: ref('User'), name: String, rating: Number, comment: String }] }, T));
exports.Order = m.model('Order', new Schema({ buyer: ref('User'), total: Number, address: String, status: { type: String, default: 'Placed' },
  items: [{ artwork: ref('Artwork'), artist: ref('User'), title: String, price: Number, image: String }] }, T));
exports.Post = m.model('Post', new Schema({ author: ref('User'), text: String, image: String, comments: [{ user: ref('User'), text: String, createdAt: { type: Date, default: Date.now } }] }, T));
exports.Message = m.model('Message', new Schema({ from: ref('User'), to: ref('User'), text: String }, T));
