# ============================================================
# Guvenc Hoca - Hafta 1 Materyalleri Yerlestirme Script'i
# ============================================================
# Kaynak:  C:\Users\MSI\Downloads\guvenc_yza_hafta_1
# Hedef:   YuzYuze\B-Grubu\Hafta-01-FullStack-Web-ve-Ileri-Prompt\
#
# Yerlestirme:
#   13nisan_ders_notlari.html -> Oturum-01\ders-notlari\
#   14nisan_ders_notlari.html -> Oturum-02\ders-notlari\
#   promptlar.txt             -> Oturum-02\ders-notlari\
#   6 proje klasoru           -> Oturum-01\atolye-projeleri\
#
# KULLANIM:
#   cd C:\Users\MSI\Desktop\YapayZekaAkademisi
#   powershell -ExecutionPolicy Bypass -File .\guvenc-hoca-yerlestir.ps1
# ============================================================

# ===== KAYNAK KLASOR =====
$KaynakKlasor = "C:\Users\MSI\Downloads\guvenc_yza_hafta_1"
# =========================

$BHafta1 = "YuzYuze\B-Grubu\Hafta-01-FullStack-Web-ve-Ileri-Prompt"
$Oturum1 = "$BHafta1\Oturum-01-13-Nisan-FullStack-Web-Uygulama"
$Oturum2 = "$BHafta1\Oturum-02-14-Nisan-API-ve-Ileri-Prompt"

Write-Host ""
Write-Host "===== Guvenc Hoca Materyalleri Yerlestirme =====" -ForegroundColor Cyan
Write-Host "Kaynak: $KaynakKlasor" -ForegroundColor Gray

if (-not (Test-Path $KaynakKlasor)) {
    Write-Host "[HATA] Kaynak klasor bulunamadi: $KaynakKlasor" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $BHafta1)) {
    Write-Host "[HATA] B-Grubu Hafta-01 klasoru bulunamadi. Repo kokunde misin?" -ForegroundColor Red
    exit 1
}

# --- 1. HEDEF KLASORLERI OLUSTUR ---
Write-Host ""
Write-Host "[1/4] Hedef klasorler hazirlaniyor..." -ForegroundColor Yellow

$hedefler = @(
    "$Oturum1\ders-notlari",
    "$Oturum1\atolye-projeleri",
    "$Oturum2\ders-notlari"
)

foreach ($h in $hedefler) {
    if (-not (Test-Path $h)) {
        New-Item -ItemType Directory -Path $h -Force | Out-Null
        Write-Host "  [+] $h" -ForegroundColor Green
    } else {
        Write-Host "  [=] $h (mevcut)" -ForegroundColor DarkYellow
    }
}

# --- 2. DERS NOTLARINI KOPYALA ---
Write-Host ""
Write-Host "[2/4] Ders notlari kopyalaniyor..." -ForegroundColor Yellow

# 13 Nisan -> Oturum 1
$src13 = Join-Path $KaynakKlasor "13nisan_ders_notlari.html"
if (Test-Path $src13) {
    Copy-Item $src13 -Destination "$Oturum1\ders-notlari\" -Force
    Write-Host "  [>] 13nisan_ders_notlari.html -> Oturum-01\ders-notlari\" -ForegroundColor Green
} else {
    Write-Host "  [!] 13nisan_ders_notlari.html bulunamadi" -ForegroundColor DarkYellow
}

# 14 Nisan -> Oturum 2
$src14 = Join-Path $KaynakKlasor "14nisan_ders_notlari.html"
if (Test-Path $src14) {
    Copy-Item $src14 -Destination "$Oturum2\ders-notlari\" -Force
    Write-Host "  [>] 14nisan_ders_notlari.html -> Oturum-02\ders-notlari\" -ForegroundColor Green
} else {
    Write-Host "  [!] 14nisan_ders_notlari.html bulunamadi" -ForegroundColor DarkYellow
}

# promptlar.txt -> Oturum 2
$srcPrompt = Join-Path $KaynakKlasor "promptlar.txt"
if (Test-Path $srcPrompt) {
    Copy-Item $srcPrompt -Destination "$Oturum2\ders-notlari\" -Force
    Write-Host "  [>] promptlar.txt -> Oturum-02\ders-notlari\" -ForegroundColor Green
} else {
    Write-Host "  [!] promptlar.txt bulunamadi" -ForegroundColor DarkYellow
}

# --- 3. ATOLYE PROJELERINI KOPYALA ---
Write-Host ""
Write-Host "[3/4] Atolye projeleri kopyalaniyor..." -ForegroundColor Yellow

$projeler = @(
    "basic-chatbot",
    "kitap-web-site",
    "note-app",
    "online-alisveris",
    "qr-code-generator",
    "simpson-uni"
)

foreach ($proje in $projeler) {
    $kaynak = Join-Path $KaynakKlasor $proje
    $hedef = "$Oturum1\atolye-projeleri\$proje"

    if (Test-Path $kaynak) {
        Copy-Item $kaynak -Destination "$Oturum1\atolye-projeleri\" -Recurse -Force
        Write-Host "  [>] $proje\ -> Oturum-01\atolye-projeleri\" -ForegroundColor Green
    } else {
        Write-Host "  [!] $proje klasoru bulunamadi" -ForegroundColor DarkYellow
    }
}

# --- 4. macOS ARTIKLARINI VE .DS_STORE'LARI TEMIZLE ---
Write-Host ""
Write-Host "[4/4] macOS artiklari temizleniyor..." -ForegroundColor Yellow

# __MACOSX klasorleri
$macosxKlasorleri = Get-ChildItem -Path $BHafta1 -Recurse -Directory -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq "__MACOSX" }
foreach ($klasor in $macosxKlasorleri) {
    Remove-Item -LiteralPath $klasor.FullName -Recurse -Force
    Write-Host "  [x] Silindi: $($klasor.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor DarkGray
}

# .DS_Store dosyalari
$dsStoreDosyalari = Get-ChildItem -Path $BHafta1 -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq ".DS_Store" }
foreach ($dosya in $dsStoreDosyalari) {
    Remove-Item -LiteralPath $dosya.FullName -Force
    Write-Host "  [x] Silindi: $($dosya.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor DarkGray
}

if ($macosxKlasorleri.Count -eq 0 -and $dsStoreDosyalari.Count -eq 0) {
    Write-Host "  [=] macOS artigi bulunamadi" -ForegroundColor DarkYellow
}

# --- OZET ---
Write-Host ""
Write-Host "===== YERLESIM SONRASI YAPI =====" -ForegroundColor Cyan
Get-ChildItem -Path $BHafta1 -Recurse -Directory | Sort-Object FullName | ForEach-Object {
    $rolatif = $_.FullName.Replace((Get-Location).Path + "\", "")
    $derinlik = ($rolatif.Split("\").Count - 1)
    $girinti = "  " * $derinlik
    Write-Host "$girinti$($_.Name)\" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===== TAMAMLANDI =====" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sonraki adimlar:" -ForegroundColor White
Write-Host "  1. git status"
Write-Host "  2. git add ."
Write-Host "  3. git commit -m 'Guvenc Hoca Hafta 1 materyalleri eklendi'"
Write-Host "  4. git push"
Write-Host ""