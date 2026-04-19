// Peynir Ürünleri
const products = [
    { id: 1, name: "Ezine Tam Yağlı", region: "Çanakkale", price: 250, image: "https://placehold.co/300x200/F5D76E/333333?text=Ezine+Peyniri" },
    { id: 2, name: "Kars Eski Kaşar", region: "Kars", price: 350, image: "https://placehold.co/300x200/F89406/ffffff?text=Kars+Kasari" },
    { id: 3, name: "İzmir Tulumu", region: "İzmir", price: 280, image: "https://placehold.co/300x200/F9BF3B/333333?text=Izmir+Tulum" },
    { id: 4, name: "Divle Obruk", region: "Karaman", price: 460, image: "https://placehold.co/300x200/FDE3A7/333333?text=Divle+Obruk" },
    { id: 5, name: "Van Otlu Peyniri", region: "Van", price: 270, image: "https://placehold.co/300x200/E87E04/ffffff?text=Van+Otlu+Peynir" },
    { id: 6, name: "Erzurum Çeçil", region: "Erzurum", price: 240, image: "https://placehold.co/300x200/F4D03F/333333?text=Erzurum+Cecil" },
];

let cart = [];

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const cartModal = document.getElementById('cart-modal');
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartCountElement = document.getElementById('cart-count');
const cartTotalElement = document.getElementById('cart-total');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    loadCartFromCookie();
    updateCartUI();
});

// Ürünleri Ekrana Çizme
function renderProducts() {
    productsGrid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <div class="product-region">📍 ${product.region}</div>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-footer">
                    <span class="product-price">${product.price} TL</span>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">Sepete Ekle</button>
                </div>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

// Sepete Ürün Ekleme
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Aynı üründen varsa miktarını artırabiliriz veya tekrar listeleyebiliriz (şuan basit tutuyoruz)
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    saveCartToCookie();
    updateCartUI();
    
    // Küçük bildirim (Opsiyonel)
    alert(`"${product.name}" sepete eklendi!`);
}

// Sepetten Ürün Çıkarma
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToCookie();
    updateCartUI();
}

// Sepeti Boşaltma
function clearCart() {
    cart = [];
    saveCartToCookie();
    updateCartUI();
}

// Cookie İşlemleri (Cart Kaydetme & Okuma)
function saveCartToCookie() {
    // Cookie boyutu limitini aşmamak için cart'ı serialize edip URI encode yapıyoruz
    const cartData = JSON.stringify(cart);
    // 7 gün geçerli cookie (max-age = saniye cinsinden, 7 * 24 * 60 * 60)
    document.cookie = `cheese_cart=${encodeURIComponent(cartData)}; path=/; max-age=604800`;
}

function loadCartFromCookie() {
    const match = document.cookie.match(new RegExp('(^| )cheese_cart=([^;]+)'));
    if (match) {
        try {
            cart = JSON.parse(decodeURIComponent(match[2]));
        } catch (e) {
            console.error("Sepet cookie okunurken hata oluştu:", e);
            cart = [];
        }
    } else {
        cart = [];
    }
}

// Arayüzü Güncelleme (Sepet Modal UI)
function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let totalItems = 0;
    let totalPrice = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d; margin-top: 20px;">Sepetiniz boş.</p>';
    } else {
        cart.forEach(item => {
            totalItems += item.quantity;
            totalPrice += item.price * item.quantity;

            const cartItemEl = document.createElement('div');
            cartItemEl.classList.add('cart-item');
            cartItemEl.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <span class="cart-item-price">${item.price} TL</span> x ${item.quantity}
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">Kaldır</button>
            `;
            cartItemsContainer.appendChild(cartItemEl);
        });
    }

    cartCountElement.textContent = totalItems;
    cartTotalElement.textContent = totalPrice;
}

// Modal Kontrolleri
cartBtn.addEventListener('click', () => {
    cartModal.style.display = 'block';
    // Animasyon için kısa bir gecikme
    setTimeout(() => {
        cartModal.classList.add('open');
    }, 10);
});

closeCartBtn.addEventListener('click', () => {
    cartModal.classList.remove('open');
    setTimeout(() => {
        cartModal.style.display = 'none';
    }, 300);
});

// Modal dışına tıklayınca kapama
cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        closeCartBtn.click();
    }
});