import qrcode

def create_qr_code():
    # Hedef URL
    url = "https://forms.gle/asKtRPGXQ2PDqZc89"
    
    # QR kod nesnesini oluştur
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    
    # Veriyi (URL'i) QR koda ekle
    qr.add_data(url)
    qr.make(fit=True)
    
    # QR kodunu görsel (resim) olarak oluştur
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Resmi dosya olarak kaydet
    dosya_adi = "google_form_qr.png"
    img.save(dosya_adi)
    print(f"QR kod başarıyla oluşturuldu ve '{dosya_adi}' olarak kaydedildi.")

if __name__ == "__main__":
    create_qr_code()
