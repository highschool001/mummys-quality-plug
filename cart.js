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

// Update cart count display in nav
function updateCartCount() {
    const cartLink = document.getElementById('cart-link');
    if (cartLink) {
        const totalItems = getTotalItems();
        if (totalItems > 0) {
            cartLink.innerHTML = `🛒 Cart (${totalItems})`;
        } else {
            cartLink.innerHTML = '🛒 Cart';
        }
    }
}

// Show message when item is added
function showAddedMessage(name) {
    const msg = document.createElement('div');
    msg.className = 'cart-message';
    msg.textContent = `${name} added to cart!`;
    document.body.appendChild(msg);

    setTimeout(() => {
        msg.classList.add('show');
    }, 100);

    setTimeout(() => {
        msg.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(msg);
        }, 300);
    }, 2000);
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
            <div class="no-results">
                <p>No products found. Try a different search term.</p>
                <a href="shop.html" class="btn btn-primary">View All Products</a>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-img">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3>${product.name}</h3>
                <p class="product-price">₦${product.price.toLocaleString()}</p>
                <a href="javascript:void(0)" class="btn btn-primary btn-sm" onclick="addToCart('${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image}')">Add to Cart</a>
            </div>
        </div>
    `).join('');
}

// Make product cards clickable
document.addEventListener('DOMContentLoaded', function () {
    // This only affects dynamically rendered product cards from API
    document.addEventListener('click', function(e) {
        const card = e.target.closest('.product-card');
        if (card) {
            const link = card.querySelector('a[href*="product.html"]');
            if (link && !e.target.closest('button') && !e.target.closest('.btn')) {
                window.location.href = link.href;
            }
        }
    });
});

// Check for search query on shop page
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery && window.location.pathname.includes('shop.html')) {
        loadProducts(searchQuery);
    }
});

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
                    <img src="${item.image}" alt="${item.name}">
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

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', function () {
    loadCart();
    displayCartItems();
});