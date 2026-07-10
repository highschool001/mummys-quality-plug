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