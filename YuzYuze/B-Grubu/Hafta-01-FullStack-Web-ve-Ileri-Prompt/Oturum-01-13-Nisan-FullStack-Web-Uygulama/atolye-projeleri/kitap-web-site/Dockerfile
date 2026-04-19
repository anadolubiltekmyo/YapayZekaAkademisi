FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# SQLite veritabanı dosyası container içinde /app/data/ altında tutulur.
# Volume mount ile kalıcı hale getirilebilir.
RUN mkdir -p /app/data
ENV DATABASE_PATH=/app/data/bookstore.db

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
