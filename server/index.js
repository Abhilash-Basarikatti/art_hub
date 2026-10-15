require('dotenv').config(); require('express-async-errors');
const fs = require('fs'), path = require('path');
const express = require('express'), cors = require('cors'), mongoose = require('mongoose'), bcrypt = require('bcryptjs');
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
const { User } = require('./models');
const app = express();
app.use(cors()); app.use(express.json()); app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', require('./routes'));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: err.message || 'Server error' }); });
mongoose.connect(process.env.MONGO_URI).then(async () => {
  if (!(await User.exists({ role: 'admin' })) && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) // seed first admin from .env
    await User.create({ name: 'Admin', email: process.env.ADMIN_EMAIL, password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10), role: 'admin' });
  app.listen(process.env.PORT || 5000, () => console.log('ArtHub API running'));
}).catch(e => console.error('Mongo error', e.message));
