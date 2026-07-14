const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mummys-quality-plug';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const productSchema = new mongoose.Schema({
    id: Number,
    name: String,
    price: Number,
    category: String,
    description: String,
    image: String
});

const categorySchema = new mongoose.Schema({
    name: String
});

const orderSchema = new mongoose.Schema({
    id: String,
    date: { type: Date, default: Date.now },
    customer: {
        fullname: String,
        phone: String,
        email: String,
        state: String,
        city: String,
        address: String,
        notes: String
    },
    items: Array,
    subtotal: Number,
    paymentRef: String,
    status: { type: String, default: 'Order Confirmed' },
    statusHistory: [{ status: String, date: { type: Date, default: Date.now } }]
});

const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);
const Order = mongoose.model('Order', orderSchema);

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());

// Rate limiter for login endpoint
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});

// General rate limiter for all API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Auth middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'images'));
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: storage });

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

// API: Login (with bcrypt)
app.post('/api/login', loginLimiter, async (req, res) => {
    const { password } = req.body;
    const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (valid) {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token });
    }
    res.status(401).json({ error: 'Invalid password' });
});

// API: Categories
app.get('/api/categories', async (req, res) => {
    const categories = await Category.find();
    res.json(categories.map(c => c.name));
});

app.post('/api/categories', authMiddleware, async (req, res) => {
    const exists = await Category.findOne({ name: req.body.name });
    if (!exists) {
        await new Category({ name: req.body.name }).save();
    }
    const categories = await Category.find();
    res.json(categories.map(c => c.name));
});

app.delete('/api/categories/:name', authMiddleware, async (req, res) => {
    await Category.deleteOne({ name: req.params.name });
    res.json({ success: true });
});

// API: Upload image
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ path: 'images/' + req.file.filename });
});

// API: Products
app.get('/api/products', async (req, res) => {
    let query = {};
    if (req.query.search) {
        const term = req.query.search.toLowerCase();
        query.$or = [
            { name: { $regex: term, $options: 'i' } },
            { category: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } }
        ];
    }
    if (req.query.category && req.query.category !== 'All') {
        query.category = req.query.category;
    }
    const products = await Product.find(query).sort({ id: -1 });
    res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    if (product) res.json(product);
    else res.status(404).json({ error: 'Product not found' });
});

app.post('/api/products', authMiddleware, async (req, res) => {
    const newProduct = new Product({
        id: Date.now(),
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        description: req.body.description,
        image: req.body.image
    });
    await newProduct.save();
    res.json(newProduct);
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
    const product = await Product.findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { new: true }
    );
    if (product) res.json(product);
    else res.status(404).json({ error: 'Product not found' });
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
    await Product.deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
});

// API: Orders
app.get('/api/orders', authMiddleware, async (req, res) => {
    let query = {};
    if (req.query.status && req.query.status !== 'All') {
        query.status = req.query.status;
    }
    const orders = await Order.find(query).sort({ date: -1 });
    res.json(orders);
});

app.post('/api/orders', async (req, res) => {
    const newOrder = new Order({
        id: 'MQP-' + Date.now().toString().slice(-8),
        customer: req.body.customer,
        items: req.body.items,
        subtotal: req.body.subtotal,
        paymentRef: req.body.paymentRef,
        statusHistory: [{ status: 'Order Confirmed', date: new Date() }]
    });
    await newOrder.save();
    res.json(newOrder);
});

app.put('/api/orders/:id', authMiddleware, async (req, res) => {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = req.body.status;
    order.statusHistory.push({ status: req.body.status, date: new Date() });
    await order.save();
    res.json(order);
});

app.delete('/api/orders/:id', authMiddleware, async (req, res) => {
    await Order.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// Seed initial data if empty
async function seedData() {
    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();

    if (categoryCount === 0) {
        await Category.insertMany([
            { name: 'Beauty & Hair' },
            { name: 'Home & Kitchen' },
            { name: 'Electronics' }
        ]);
        console.log('Categories seeded');
    }

    if (productCount === 0) {
        const products = [
            { id: 1, name: 'Olive Oil & Hair Mayonnaise', price: 3600, category: 'Beauty & Hair', description: 'A nourishing blend of olive oil and hair mayonnaise.', image: 'images/Olive Oil.jpeg' },
            { id: 2, name: 'Turmeric Body Oil', price: 3600, category: 'Beauty & Hair', description: 'A lightweight body oil infused with turmeric.', image: 'images/Turmeric Body Oil.jpeg' },
            { id: 3, name: 'Anti-Dandruff 2-in-1 Aloe Vera Shampoo & Conditioner', price: 4380, category: 'Beauty & Hair', description: '2-in-1 formula that cleanses and conditions.', image: 'images/Anti-Dandruff 2-in-1 Aloe Vera Shampoo & Conditioner.jpeg' },
            { id: 4, name: 'Face Cleanser Soap (Pack of 10)', price: 6500, category: 'Beauty & Hair', description: 'Gentle facial cleansing soap for all skin types.', image: 'images/Face Cleanser Soap (Pack of 10).jpeg' },
            { id: 5, name: 'Charcoal Toothpaste', price: 4400, category: 'Beauty & Hair', description: 'Charcoal-infused toothpaste for whitening.', image: 'images/Charcoal Toothpaste.jpeg' },
            { id: 6, name: '2 Litres Food Flask', price: 18000, category: 'Home & Kitchen', description: 'High-quality insulated food flask.', image: 'images/Food Flask.jpeg' },
            { id: 7, name: '2.8 Litres Food Flask', price: 20000, category: 'Home & Kitchen', description: 'Larger 2.8-litre food flask.', image: 'images/Food Flask.jpeg' },
            { id: 8, name: '2.5 Litres Water Bottle', price: 2500, category: 'Home & Kitchen', description: 'Leak-proof and portable water bottle.', image: 'images/Water Bottle.jpeg' },
            { id: 9, name: '7 Litres Pressure Pot + 5 Litres Steamer', price: 65000, category: 'Home & Kitchen', description: 'Combo pressure pot and steamer set.', image: 'images/7 Litres Pressure Pot + 5 Litres Steamer.jpeg' },
            { id: 10, name: 'Small Storage Plate Rack', price: 10300, category: 'Home & Kitchen', description: 'Compact and sturdy plate rack.', image: 'images/Small Storage Plate Rack.jpeg' },
            { id: 11, name: 'Cooking Utensils Collection', price: 13000, category: 'Home & Kitchen', description: 'Essential cooking utensils set.', image: 'images/Cooking Utensils Collection.jpeg' },
            { id: 12, name: 'Crownmax Soundproof Blender', price: 210000, category: 'Home & Kitchen', description: 'High-performance soundproof blender.', image: 'images/Crownmax Soundproof Blender.jpeg' },
            { id: 13, name: '3-in-1 Digital Blender', price: 90000, category: 'Home & Kitchen', description: 'Versatile digital blender.', image: 'images/3-in-1 Digital Blender.jpeg' },
            { id: 14, name: 'Solar Light — 4800mAh', price: 9650, category: 'Electronics', description: 'Complete solar lighting kit.', image: 'images/Solar Light .jpeg' },
            { id: 15, name: 'Solar Light — 6000mAh', price: 10900, category: 'Electronics', description: 'Upgraded solar light system.', image: 'images/Solar Light .jpeg' },
            { id: 16, name: 'Solar Light — 10000mAh', price: 11500, category: 'Electronics', description: 'Most powerful solar light option.', image: 'images/Solar Light .jpeg' },
            { id: 17, name: 'Rechargeable Lighter', price: 2000, category: 'Electronics', description: 'USB rechargeable electric lighter.', image: 'images/Rechargeable Lighter.jpeg' },
            { id: 18, name: 'Rechargeable Solar Fan', price: 56000, category: 'Electronics', description: 'Powerful rechargeable solar fan.', image: 'images/Rechargeable Solar Fan.jpeg' },
            { id: 19, name: 'Rat Trap (Pack of 2)', price: 3000, category: 'Electronics', description: 'Sturdy and effective rat traps.', image: 'images/Rat Trap (Pack of 2).jpeg' }
        ];
        await Product.insertMany(products);
        console.log('Products seeded');
    }
}

// Serve HTML files
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath) && filePath.endsWith('.html')) {
        res.sendFile(filePath);
    } else if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not found' });
    } else {
        res.status(404).send('Page not found');
    }
});

app.listen(PORT, async () => {
    await seedData();
    console.log(`Server running on port ${PORT}`);
});
