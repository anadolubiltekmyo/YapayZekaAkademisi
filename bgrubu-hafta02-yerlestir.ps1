# ============================================================
# B Grubu Hafta 2 - Materyal Yerlestirme Script'i
# ============================================================
# Hafta 2 klasor yapisini kurar; PPTX'leri ve oyun ZIP'ini
# uygun konumlara kopyalar/acar.
#
# Kaynak dosyalar (Downloads klasorunde olmali):
#   - Inside_Flutter_Architecture.pptx
#   - Vibe_Coding_Flutter.pptx        (orijinal: Vibe_Coding__Flutter.pptx olabilir)
#   - Vibe_Coding_ile_Oyun_Gelistirme.html
#   - yza_21_nisan_oyun_gelistirme.zip   VEYA acilmis klasor
#
# KULLANIM:
#   cd C:\Users\MSI\Desktop\YapayZekaAkademisi
#   powershell -ExecutionPolicy Bypass -File .\bgrubu-hafta02-yerlestir.ps1
# ============================================================

$Downloads = "$env:USERPROFILE\Downloads"

$Hafta2 = "YuzYuze\B-Grubu\Hafta-02-Vibe-Coding"
$OturumMobil = "$Hafta2\Oturum-01-20-Nisan-Vibe-Coding-Mobil-Uygulama"
$OturumOyun  = "$Hafta2\Oturum-02-21-Nisan-Vibe-Coding-Oyun-Gelistirme"

Write-Host ""
Write-Host "===== B Grubu Hafta 2 Yerlestirme =====" -ForegroundColor Cyan

# --- 1. KLASOR YAPISI ---
Write-Host ""
Write-Host "[1/4] Klasorler olusturuluyor..." -ForegroundColor Yellow

$klasorler = @(
    "$OturumMobil\sunumlar",
    "$OturumOyun",
    "$OturumOyun\oyunlar"
)

foreach ($k in $klasorler) {
    if (-not (Test-Path $k)) {
        New-Item -ItemType Directory -Path $k -Force | Out-Null
        Write-Host "  [+] $k" -ForegroundColor Green
    } else {
        Write-Host "  [=] $k (mevcut)" -ForegroundColor DarkYellow
    }
}

# --- 2. MOBIL OTURUMU PPTX'LERI ---
Write-Host ""
Write-Host "[2/4] Mobil oturumu sunumlari kopyalaniyor..." -ForegroundColor Yellow

# Inside_Flutter_Architecture.pptx
$src1 = Join-Path $Downloads "Inside_Flutter_Architecture.pptx"
if (Test-Path $src1) {
    Copy-Item $src1 -Destination "$OturumMobil\sunumlar\Inside_Flutter_Architecture.pptx" -Force
    Write-Host "  [>] Inside_Flutter_Architecture.pptx" -ForegroundColor Green
} else {
    Write-Host "  [!] Inside_Flutter_Architecture.pptx bulunamadi" -ForegroundColor Red
}

# Vibe_Coding_Flutter.pptx (yuklenen orijinalde iki alt cizgi olabilir)
$src2_yeni = Join-Path $Downloads "Vibe_Coding_Flutter.pptx"
$src2_eski = Join-Path $Downloads "Vibe_Coding__Flutter.pptx"
if (Test-Path $src2_yeni) {
    Copy-Item $src2_yeni -Destination "$OturumMobil\sunumlar\Vibe_Coding_Flutter.pptx" -Force
    Write-Host "  [>] Vibe_Coding_Flutter.pptx" -ForegroundColor Green
} elseif (Test-Path $src2_eski) {
    Copy-Item $src2_eski -Destination "$OturumMobil\sunumlar\Vibe_Coding_Flutter.pptx" -Force
    Write-Host "  [>] Vibe_Coding__Flutter.pptx -> Vibe_Coding_Flutter.pptx (yeniden adlandirildi)" -ForegroundColor Green
} else {
    Write-Host "  [!] Vibe_Coding_Flutter.pptx bulunamadi" -ForegroundColor Red
}

# --- 3. OYUN OTURUMU - DERS NOTLARI VE OYUNLAR ---
Write-Host ""
Write-Host "[3/4] Oyun oturumu materyalleri yerlestiriliyor..." -ForegroundColor Yellow

# 3a) Ders notlari HTML
$srcHtmlYeni = Join-Path $Downloads "Vibe_Coding_ile_Oyun_Gelistirme.html"
$srcHtmlEski = Join-Path $Downloads "21nisan_game_dev_ders_notlari.html"
if (Test-Path $srcHtmlYeni) {
    Copy-Item $srcHtmlYeni -Destination "$OturumOyun\Vibe_Coding_ile_Oyun_Gelistirme.html" -Force
    Write-Host "  [>] Vibe_Coding_ile_Oyun_Gelistirme.html" -ForegroundColor Green
} elseif (Test-Path $srcHtmlEski) {
    Copy-Item $srcHtmlEski -Destination "$OturumOyun\Vibe_Coding_ile_Oyun_Gelistirme.html" -Force
    Write-Host "  [>] 21nisan_game_dev_ders_notlari.html -> Vibe_Coding_ile_Oyun_Gelistirme.html" -ForegroundColor Green
}

# 3b) Oyun klasorlerini bulalim. Ya zip aciksa Downloads\yza_21_nisan_oyun_gelistirme\ olur,
#     ya da kullanici manuel acmis olabilir
$oyunKaynakAcik = Join-Path $Downloads "yza_21_nisan_oyun_gelistirme"
$oyunKaynakZip  = Join-Path $Downloads "yza_21_nisan_oyun_gelistirme.zip"

$oyunKaynak = $null
if (Test-Path $oyunKaynakAcik) {
    $oyunKaynak = $oyunKaynakAcik
    Write-Host "  [i] Oyun klasoru bulundu: $oyunKaynakAcik" -ForegroundColor Cyan
} elseif (Test-Path $oyunKaynakZip) {
    Write-Host "  [i] Zip bulundu, aciliyor..." -ForegroundColor Cyan
    $tempAcma = Join-Path $env:TEMP "yza_oyun_temp"
    if (Test-Path $tempAcma) { Remove-Item $tempAcma -Recurse -Force }
    Expand-Archive -Path $oyunKaynakZip -DestinationPath $tempAcma -Force
    $oyunKaynak = Join-Path $tempAcma "yza_21_nisan_oyun_gelistirme"
    if (-not (Test-Path $oyunKaynak)) {
        # Bazen zip dogrudan dosyalari icerir, alternatif yol
        $oyunKaynak = $tempAcma
    }
    Write-Host "  [i] Zip acildi: $oyunKaynak" -ForegroundColor Cyan
} else {
    Write-Host "  [!] Oyun kaynagi bulunamadi (ne klasor ne zip)" -ForegroundColor Red
}

# 3c) 3 oyun klasorunu kopyala (balik-ekosistem bos oldugu icin atlaniyor)
if ($oyunKaynak) {
    $oyunListesi = @("breakout", "fizikliyapi", "sonsuz_kosucu")
    foreach ($oyun in $oyunListesi) {
        $kaynak = Join-Path $oyunKaynak $oyun
        if (Test-Path $kaynak) {
            $hedef = "$OturumOyun\oyunlar\$oyun"
            if (Test-Path $hedef) { Remove-Item $hedef -Recurse -Force }
            Copy-Item $kaynak -Destination "$OturumOyun\oyunlar\" -Recurse -Force
            Write-Host "  [>] $oyun\ -> oyunlar\" -ForegroundColor Green
        } else {
            Write-Host "  [!] $oyun klasoru bulunamadi" -ForegroundColor DarkYellow
        }
    }
}

# 3d) macOS artiklarini temizle
$macosx = Get-ChildItem -Path $Hafta2 -Recurse -Directory -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq "__MACOSX" }
foreach ($k in $macosx) {
    Remove-Item -LiteralPath $k.FullName -Recurse -Force
    Write-Host "  [x] __MACOSX silindi: $($k.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor DarkGray
}
$dsStore = Get-ChildItem -Path $Hafta2 -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq ".DS_Store" -or $_.Name -like "._*" }
foreach ($d in $dsStore) {
    Remove-Item -LiteralPath $d.FullName -Force
    Write-Host "  [x] $($d.Name) silindi" -ForegroundColor DarkGray
}

# --- 4. SON DURUM ---
Write-Host ""
Write-Host "[4/4] Olusturulan yapi:" -ForegroundColor Yellow

Get-ChildItem -Path $Hafta2 -Recurse | Sort-Object FullName | ForEach-Object {
    $rolatif = $_.FullName.Replace((Get-Location).Path + "\", "")
    $derinlik = ($rolatif.Split("\").Count - 1)
    $girinti = "  " * $derinlik
    if ($_.PSIsContainer) {
        Write-Host "$girinti$($_.Name)\" -ForegroundColor Gray
    } else {
        $boyutKB = [math]::Round($_.Length / 1KB, 1)
        Write-Host "$girinti$($_.Name) ($boyutKB KB)" -ForegroundColor DarkGreen
    }
}

Write-Host ""
Write-Host "===== TAMAMLANDI =====" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sonraki adimlar:" -ForegroundColor White
Write-Host "  1. Ana README.md, B-Grubu README.md ve Hafta-02 README.md dosyalarini yerlerine koy"
Write-Host "  2. git add ."
Write-Host "  3. git commit -m 'B Grubu Hafta 2 - Vibe Coding ile Mobil ve Oyun Gelistirme'"
Write-Host "  4. git push"
Write-Host ""