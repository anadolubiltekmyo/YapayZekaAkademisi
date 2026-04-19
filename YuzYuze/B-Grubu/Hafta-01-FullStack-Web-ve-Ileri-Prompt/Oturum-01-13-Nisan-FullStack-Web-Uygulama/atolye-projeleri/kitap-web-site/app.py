import sqlite3
import os
import hashlib
import secrets
from functools import wraps
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, flash, g, jsonify
)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

DATABASE = os.environ.get('DATABASE_PATH', os.path.join(app.root_path, 'bookstore.db'))


# ── Database helpers ──────────────────────────────────────────────────────────

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            isbn TEXT UNIQUE,
            category TEXT,
            stock INTEGER DEFAULT 100,
            cover_url TEXT
        );

        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (book_id) REFERENCES books(id),
            UNIQUE(user_id, book_id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'completed',
            shipping_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (book_id) REFERENCES books(id)
        );
    ''')
    db.commit()


# ── Auth helpers ──────────────────────────────────────────────────────────────

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 200_000).hex()
    return pw_hash, salt


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            flash('Lütfen önce giriş yapın.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


# ── Seed data ─────────────────────────────────────────────────────────────────

BOOKS_SEED = [
    {
        "title": "Suç ve Ceza",
        "author": "Fyodor Dostoyevski",
        "description": "Raskolnikov'un işlediği cinayetin ardından yaşadığı psikolojik çöküşü anlatan başyapıt.",
        "price": 45.00,
        "isbn": "9780140449136",
        "category": "Klasik",
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "description": "Totaliter bir rejimde yaşayan Winston Smith'in özgürlük arayışı.",
        "price": 35.00,
        "isbn": "9780451524935",
        "category": "Distopya",
    },
    {
        "title": "Küçük Prens",
        "author": "Antoine de Saint-Exupéry",
        "description": "Bir çocuğun gözünden büyüklerin dünyasına bakış.",
        "price": 25.00,
        "isbn": "9780156012195",
        "category": "Klasik",
    },
    {
        "title": "Sefiller",
        "author": "Victor Hugo",
        "description": "Jean Valjean'ın kurtuluş ve adalet arayışının destansı hikayesi.",
        "price": 55.00,
        "isbn": "9780451419439",
        "category": "Klasik",
    },
    {
        "title": "Hayvan Çiftliği",
        "author": "George Orwell",
        "description": "Bir çiftlikteki hayvanların devriminin alegorik anlatımı.",
        "price": 30.00,
        "isbn": "9780451526342",
        "category": "Distopya",
    },
    {
        "title": "Dönüşüm",
        "author": "Franz Kafka",
        "description": "Gregor Samsa bir sabah uyandığında kendini dev bir böceğe dönüşmüş bulur.",
        "price": 20.00,
        "isbn": "9780553213690",
        "category": "Klasik",
    },
    {
        "title": "Simyacı",
        "author": "Paulo Coelho",
        "description": "Kişisel masalını arayan bir çobanın yolculuğu.",
        "price": 32.00,
        "isbn": "9780062315007",
        "category": "Roman",
    },
    {
        "title": "Yüzüklerin Efendisi",
        "author": "J.R.R. Tolkien",
        "description": "Orta Dünya'da tek yüzüğü yok etmek için çıkılan destansı macera.",
        "price": 75.00,
        "isbn": "9780618640157",
        "category": "Fantastik",
    },
    {
        "title": "Harry Potter ve Felsefe Taşı",
        "author": "J.K. Rowling",
        "description": "Genç büyücü Harry Potter'ın Hogwarts'taki ilk yılı.",
        "price": 40.00,
        "isbn": "9780590353427",
        "category": "Fantastik",
    },
    {
        "title": "Bülbülü Öldürmek",
        "author": "Harper Lee",
        "description": "Amerikan güneyinde ırkçılık ve adalet temalı klasik eser.",
        "price": 38.00,
        "isbn": "9780061120084",
        "category": "Klasik",
    },
    {
        "title": "Yeraltından Notlar",
        "author": "Fyodor Dostoyevski",
        "description": "Toplumdan kopmuş bir adamın iç dünyasını anlatan felsefi roman.",
        "price": 28.00,
        "isbn": "9780679734529",
        "category": "Klasik",
    },
    {
        "title": "Fareler ve İnsanlar",
        "author": "John Steinbeck",
        "description": "İki göçmen işçinin dostluk ve hayaller üzerine hikayesi.",
        "price": 27.00,
        "isbn": "9780140186420",
        "category": "Klasik",
    },
    {
        "title": "Saatleri Ayarlama Enstitüsü",
        "author": "Ahmet Hamdi Tanpınar",
        "description": "Türk modernleşmesinin hicivli ve felsefi bir portresi.",
        "price": 42.00,
        "isbn": "9789750718533",
        "category": "Türk Edebiyatı",
    },
    {
        "title": "İnce Memed",
        "author": "Yaşar Kemal",
        "description": "Toroslar'da bir eşkıyanın halk kahramanına dönüşümü.",
        "price": 48.00,
        "isbn": "9789750719868",
        "category": "Türk Edebiyatı",
    },
    {
        "title": "Tutunamayanlar",
        "author": "Oğuz Atay",
        "description": "Türk edebiyatının postmodern başyapıtı.",
        "price": 50.00,
        "isbn": "9789750509544",
        "category": "Türk Edebiyatı",
    },
    {
        "title": "Kürk Mantolu Madonna",
        "author": "Sabahattin Ali",
        "description": "Berlin'de geçen unutulmaz bir aşk hikayesi.",
        "price": 22.00,
        "isbn": "9789750736186",
        "category": "Türk Edebiyatı",
    },
    {
        "title": "Sapiens: İnsan Türünün Kısa Tarihi",
        "author": "Yuval Noah Harari",
        "description": "İnsanlığın 70.000 yıllık macerasının büyüleyici anlatımı.",
        "price": 60.00,
        "isbn": "9780062316097",
        "category": "Bilim",
    },
    {
        "title": "Cosmos",
        "author": "Carl Sagan",
        "description": "Evrenin büyüklüğünü ve güzelliğini anlatan bilim klasiği.",
        "price": 55.00,
        "isbn": "9780345539434",
        "category": "Bilim",
    },
    {
        "title": "Dune",
        "author": "Frank Herbert",
        "description": "Çöl gezegeni Arrakis'te geçen epik bilim kurgu destanı.",
        "price": 45.00,
        "isbn": "9780441172719",
        "category": "Bilim Kurgu",
    },
    {
        "title": "Fahrenheit 451",
        "author": "Ray Bradbury",
        "description": "Kitapların yakıldığı bir gelecekte bir itfaiyecinin uyanışı.",
        "price": 30.00,
        "isbn": "9781451673319",
        "category": "Distopya",
    },
]


def seed_books():
    db = get_db()
    count = db.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    if count == 0:
        for b in BOOKS_SEED:
            cover_url = f"https://covers.openlibrary.org/b/isbn/{b['isbn']}-L.jpg"
            db.execute(
                "INSERT INTO books (title, author, description, price, isbn, category, cover_url) VALUES (?,?,?,?,?,?,?)",
                (b['title'], b['author'], b['description'], b['price'], b['isbn'], b['category'], cover_url)
            )
        db.commit()


# ── Before every request ──────────────────────────────────────────────────────

@app.before_request
def before_request():
    init_db()
    seed_books()
    if 'user_id' in session:
        g.user = get_db().execute("SELECT * FROM users WHERE id = ?", (session['user_id'],)).fetchone()
        g.cart_count = get_db().execute(
            "SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE user_id = ?",
            (session['user_id'],)
        ).fetchone()[0]
    else:
        g.user = None
        g.cart_count = 0


# ── Routes: Auth ──────────────────────────────────────────────────────────────

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm', '')

        if not name or not email or not password:
            flash('Tüm alanları doldurun.', 'danger')
            return redirect(url_for('register'))
        if password != confirm:
            flash('Şifreler eşleşmiyor.', 'danger')
            return redirect(url_for('register'))
        if len(password) < 6:
            flash('Şifre en az 6 karakter olmalıdır.', 'danger')
            return redirect(url_for('register'))

        db = get_db()
        existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            flash('Bu e-posta adresi zaten kayıtlı.', 'danger')
            return redirect(url_for('register'))

        pw_hash, salt = hash_password(password)
        db.execute(
            "INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?)",
            (name, email, pw_hash, salt)
        )
        db.commit()
        flash('Kayıt başarılı! Giriş yapabilirsiniz.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        db = get_db()
        user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if user:
            pw_hash, _ = hash_password(password, user['salt'])
            if pw_hash == user['password_hash']:
                session['user_id'] = user['id']
                flash(f'Hoş geldiniz, {user["name"]}!', 'success')
                return redirect(url_for('index'))

        flash('E-posta veya şifre hatalı.', 'danger')
        return redirect(url_for('login'))

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    flash('Çıkış yapıldı.', 'info')
    return redirect(url_for('index'))


# ── Routes: Books ─────────────────────────────────────────────────────────────

@app.route('/')
def index():
    db = get_db()
    category = request.args.get('category', '')
    search = request.args.get('q', '').strip()

    query = "SELECT * FROM books WHERE 1=1"
    params = []

    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (title LIKE ? OR author LIKE ?)"
        params.extend([f'%{search}%', f'%{search}%'])

    query += " ORDER BY title"
    books = db.execute(query, params).fetchall()
    categories = [r[0] for r in db.execute("SELECT DISTINCT category FROM books ORDER BY category").fetchall()]

    return render_template('index.html', books=books, categories=categories,
                           current_category=category, search_query=search)


@app.route('/book/<int:book_id>')
def book_detail(book_id):
    db = get_db()
    book = db.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
        flash('Kitap bulunamadı.', 'danger')
        return redirect(url_for('index'))
    return render_template('book_detail.html', book=book)


# ── Routes: Cart ──────────────────────────────────────────────────────────────

@app.route('/cart')
@login_required
def cart():
    db = get_db()
    items = db.execute('''
        SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.author, b.price, b.cover_url
        FROM cart_items ci
        JOIN books b ON ci.book_id = b.id
        WHERE ci.user_id = ?
    ''', (session['user_id'],)).fetchall()
    total = sum(item['price'] * item['quantity'] for item in items)
    return render_template('cart.html', items=items, total=total)


@app.route('/cart/add/<int:book_id>', methods=['POST'])
@login_required
def add_to_cart(book_id):
    db = get_db()
    existing = db.execute(
        "SELECT id, quantity FROM cart_items WHERE user_id = ? AND book_id = ?",
        (session['user_id'], book_id)
    ).fetchone()

    if existing:
        db.execute("UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?", (existing['id'],))
    else:
        db.execute("INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, 1)",
                   (session['user_id'], book_id))
    db.commit()
    flash('Kitap sepete eklendi!', 'success')

    next_url = request.form.get('next', url_for('index'))
    return redirect(next_url)


@app.route('/cart/update/<int:item_id>', methods=['POST'])
@login_required
def update_cart(item_id):
    quantity = request.form.get('quantity', 1, type=int)
    db = get_db()
    if quantity <= 0:
        db.execute("DELETE FROM cart_items WHERE id = ? AND user_id = ?",
                   (item_id, session['user_id']))
    else:
        db.execute("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?",
                   (quantity, item_id, session['user_id']))
    db.commit()
    return redirect(url_for('cart'))


@app.route('/cart/remove/<int:item_id>', methods=['POST'])
@login_required
def remove_from_cart(item_id):
    db = get_db()
    db.execute("DELETE FROM cart_items WHERE id = ? AND user_id = ?",
               (item_id, session['user_id']))
    db.commit()
    flash('Ürün sepetten kaldırıldı.', 'info')
    return redirect(url_for('cart'))


# ── Routes: Checkout / Payment ────────────────────────────────────────────────

@app.route('/checkout', methods=['GET', 'POST'])
@login_required
def checkout():
    db = get_db()
    items = db.execute('''
        SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.price, b.cover_url
        FROM cart_items ci JOIN books b ON ci.book_id = b.id
        WHERE ci.user_id = ?
    ''', (session['user_id'],)).fetchall()

    if not items:
        flash('Sepetiniz boş.', 'warning')
        return redirect(url_for('cart'))

    total = sum(i['price'] * i['quantity'] for i in items)

    if request.method == 'POST':
        address = request.form.get('address', '').strip()
        card_number = request.form.get('card_number', '').strip()
        if not address:
            flash('Teslimat adresi gereklidir.', 'danger')
            return render_template('checkout.html', items=items, total=total)
        if not card_number or len(card_number.replace(' ', '')) < 16:
            flash('Geçerli bir kart numarası girin.', 'danger')
            return render_template('checkout.html', items=items, total=total)

        # Create order
        cursor = db.execute(
            "INSERT INTO orders (user_id, total_amount, shipping_address) VALUES (?, ?, ?)",
            (session['user_id'], total, address)
        )
        order_id = cursor.lastrowid

        for item in items:
            db.execute(
                "INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)",
                (order_id, item['book_id'], item['quantity'], item['price'])
            )

        # Clear cart
        db.execute("DELETE FROM cart_items WHERE user_id = ?", (session['user_id'],))
        db.commit()

        flash('Siparişiniz başarıyla oluşturuldu!', 'success')
        return redirect(url_for('order_detail', order_id=order_id))

    return render_template('checkout.html', items=items, total=total)


# ── Routes: Orders ────────────────────────────────────────────────────────────

@app.route('/orders')
@login_required
def orders():
    db = get_db()
    user_orders = db.execute(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
        (session['user_id'],)
    ).fetchall()
    return render_template('orders.html', orders=user_orders)


@app.route('/orders/<int:order_id>')
@login_required
def order_detail(order_id):
    db = get_db()
    order = db.execute(
        "SELECT * FROM orders WHERE id = ? AND user_id = ?",
        (order_id, session['user_id'])
    ).fetchone()
    if not order:
        flash('Sipariş bulunamadı.', 'danger')
        return redirect(url_for('orders'))

    items = db.execute('''
        SELECT oi.*, b.title, b.author, b.cover_url
        FROM order_items oi JOIN books b ON oi.book_id = b.id
        WHERE oi.order_id = ?
    ''', (order_id,)).fetchall()

    return render_template('order_detail.html', order=order, items=items)


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)
