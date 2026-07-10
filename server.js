const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Multer setup for image uploads
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

// Load data
function getProducts() {
    const data = fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8');
    return JSON.parse(data);
}

function saveProducts(products) {
    fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(products, null, 2));
}

function getCategories() {
    const data = fs.readFileSync(path.join(__dirname, 'categories.json'), 'utf-8');
    return JSON.parse(data);
}

function saveCategories(categories) {
    fs.writeFileSync(path.join(__dirname, 'categories.json'), JSON.stringify(categories, null, 2));
}

// API: Get all categories
app.get('/api/categories', (req, res) => {
    const categories = getCategories();
    res.json(categories);
});

// API: Add category
app.post('/api/categories', (req, res) => {
    const categories = getCategories();
    const newCategory = req.body.name;
    if (!categories.includes(newCategory)) {
        categories.push(newCategory);
        saveCategories(categories);
    }
    res.json(categories);
});

// API: Delete category
app.delete('/api/categories/:name', (req, res) => {
    let categories = getCategories();
    categories = categories.filter(c => c !== req.params.name);
    saveCategories(categories);
    res.json({ success: true });
});

// API: Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imagePath = 'images/' + req.file.filename;
    res.json({ path: imagePath });
});

// API: Get all products
app.get('/api/products', (req, res) => {
    const products = getProducts();
    const { search, category } = req.query;
    let filtered = products;

    if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
        );
    }

    if (category && category !== 'All') {
        filtered = filtered.filter(p => p.category === category);
    }

    res.json(filtered);
});

// API: Get single product
app.get('/api/products/:id', (req, res) => {
    const products = getProducts();
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

// API: Add product
app.post('/api/products', (req, res) => {
    const products = getProducts();
    const newProduct = {
        id: Date.now(),
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        description: req.body.description,
        image: req.body.image
    };
    products.push(newProduct);
    saveProducts(products);
    res.json(newProduct);
});

// API: Update product
app.put('/api/products/:id', (req, res) => {
    const products = getProducts();
    const index = products.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        products[index] = { ...products[index], ...req.body };
        saveProducts(products);
        res.json(products[index]);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

// API: Delete product
app.delete('/api/products/:id', (req, res) => {
    let products = getProducts();
    products = products.filter(p => p.id !== parseInt(req.params.id));
    saveProducts(products);
    res.json({ success: true });
});

// Serve HTML files
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath) && filePath.endsWith('.html')) {
        res.sendFile(filePath);
    } else if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API route not found' });
    } else {
        res.status(404).send('Page not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});