// ===== SHOPPING CART =====

let cart = [];

// Load cart from localStorage when page loads
function loadCart() {
    const savedCart = localStorage.getItem('mummysCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    updateCartCount();
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('mummysCart', JSON.stringify(cart));
}

// Add item to cart
function addToCart(name, price, image) {
    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            price: price,
            image: image,
            quantity: 1
        });
    }

    saveCart();
    updateCartCount();
    showAddedMessage(name);
}

// Remove item from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartCount();
    displayCartItems();
}

// Update item quantity
function updateQuantity(index, change) {
    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    saveCart();
    updateCartCount();
    displayCartItems();
}

// Get total number of items
function getTotalItems() {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

// Get total price
function getTotalPrice() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Update cart count display in nav and mobile badge
function updateCartCount() {
    const cartLink = document.getElementById('cart-link');
    const mobileBadge = document.getElementById('mobile-cart-badge');
    const totalItems = getTotalItems();

    if (cartLink) {
        if (totalItems > 0) {
            cartLink.innerHTML = `🛒 Cart (${totalItems})`;
        } else {
            cartLink.innerHTML = '🛒 Cart';
        }
    }

    if (mobileBadge) {
        if (totalItems > 0) {
            mobileBadge.style.display = 'flex';
            mobileBadge.textContent = totalItems;
        } else {
            mobileBadge.style.display = 'none';
        }
    }
}

// Show toast notification when item is added
function showAddedMessage(name) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `✅ ${name} added to cart!`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Display cart items on cart page
function displayCartItems() {
    const cartContainer = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartContent = document.getElementById('cart-content');
    const cartTotal = document.getElementById('cart-total');

    if (!cartContainer) return;

    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartContent.style.display = 'none';
    } else {
        emptyCart.style.display = 'none';
        cartContent.style.display = 'block';

        cartContainer.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-img">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='images/placeholder.jpeg'">
                </div>
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p class="cart-item-price">₦${item.price.toLocaleString()}</p>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">−</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <div class="cart-item-subtotal">
                    ₦${(item.price * item.quantity).toLocaleString()}
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})">✕</button>
            </div>
        `).join('');

        cartTotal.textContent = `₦${getTotalPrice().toLocaleString()}`;
    }
}

// ===== SEARCH FUNCTIONALITY =====
function handleSearch(event) {
    if (event.key === 'Enter') {
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
        }
    }
}

// Load products from API or fallback to static HTML
async function loadProducts(searchQuery = '', categoryFilter = 'All') {
    try {
        const url = searchQuery
            ? `/api/products?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(categoryFilter)}`
            : `/api/products?category=${encodeURIComponent(categoryFilter)}`;

        const response = await fetch(url);
        const products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.log('Using static product display');
    }
}

function renderProducts(products) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;

    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1/-1; text-align:center; padding:60px;">
                <p>No products found. Try a different search term.</p>
                <a href="shop.html" class="btn btn-primary">View All Products</a>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <a href="product.html?id=${product.id}">
                <div class="product-img">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='images/placeholder.jpeg'">
                </div>
            </a>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
                <p class="product-price">₦${product.price.toLocaleString()}</p>
                <a href="javascript:void(0)" class="btn btn-primary btn-sm" onclick="addToCart('${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image}')">Add to Cart</a>
            </div>
        </div>
    `).join('');
}

// Check for search query on shop page
document.addEventListener('DOMContentLoaded', function () {
    loadCart();

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery && window.location.pathname.includes('shop.html')) {
        loadProducts(searchQuery);
    }
});

function toggleMenu() {
    var nav = document.querySelector('.nav-links');
    var hamburger = document.querySelector('.hamburger');
    nav.classList.toggle('active');
    hamburger.classList.toggle('active');
}