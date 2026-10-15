const fs = require('fs'), jwt = require('jsonwebtoken'), multer = require('multer'), path = require('path');
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const { User } = require('./models');
// auth('artist','admin') -> only those roles; auth() -> any logged-in user
exports.auth = (...roles) => async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const u = await User.findById(id).select('-password');
    if (!u || u.blocked) return res.status(401).json({ message: 'Account unavailable' });
    if (roles.length && !roles.includes(u.role)) return res.status(403).json({ message: 'Access denied' });
    req.user = u; next();
  } catch { res.status(401).json({ message: 'Please log in' }); }
};
exports.upload = multer({
  storage: multer.diskStorage({ destination: uploadDir, filename: (q, f, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(f.originalname)) }),
  limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (q, f, cb) => cb(null, /image\/(jpe?g|png|webp|gif)/.test(f.mimetype)),
});
