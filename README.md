# Palet — Aplikasi Ekstraksi Palet Warna

Implementasi tugas UTS Pengolahan Citra Digital menggunakan HTML, CSS, JavaScript, dan library **Color Thief 2.6.0** dari Lokesh Dhakar.

## Cara menjalankan di laptop

1. Ekstrak seluruh isi ZIP terlebih dahulu.
2. Buka folder `palet-warna` hasil ekstraksi.
3. Klik dua kali `index.html` untuk membukanya di Chrome atau Edge.
4. Klik **Pilih gambar**, lalu pilih gambar dari perangkat.
5. Palet warna dan kode HEX muncul otomatis. Klik kotak warna untuk menyalin kodenya.

Tidak perlu memasang Node.js atau menjalankan `npm install`. Library sudah disertakan di folder `vendor`, sehingga unggah gambar lokal tidak membutuhkan koneksi internet.

Jangan memindahkan `index.html` sendirian: `style.css`, `script.js`, dan folder `vendor` harus tetap berada di lokasi relatif yang sama. Jika memakai VS Code, aplikasi juga bisa dibuka melalui Live Server.

## Fitur

- Unggah gambar dari perangkat atau drag-and-drop ke area gambar.
- Memuat gambar melalui URL langsung berawalan HTTP/HTTPS. Pada halaman HTTPS, URL gambar harus HTTPS.
- Pratinjau gambar dan informasi dimensi asli.
- Ekstraksi otomatis hingga 6 warna utama dan satu warna dominan.
- Kode HEX seperti `#2354A9`, tombol salin setiap warna, dan salin semua.
- Ganti atau hapus gambar.
- Tampilan responsif untuk desktop dan ponsel.
- Pesan kesalahan untuk format tidak didukung, file di atas 15 MB, gambar rusak, gambar transparan, dan URL yang tidak dapat diakses.

Gambar dari perangkat diproses di browser dan tidak dikirim ke server aplikasi. Memuat URL tetap menghubungi situs pemilik gambar. Aplikasi tidak menyimpan riwayat; memuat ulang halaman mengosongkan gambar dan palet.

## Isi proyek

| File | Fungsi |
| --- | --- |
| `index.html` | Struktur halaman, formulir gambar, serta area hasil. |
| `style.css` | Warna antarmuka, tata letak, dan penyesuaian layar kecil. |
| `script.js` | Memuat gambar, memanggil Color Thief, menampilkan hasil, serta menyalin kode. |
| `vendor/color-thief.umd.js` | Library Color Thief asli, versi 2.6.0. |
| `vendor/COLOR-THIEF-LICENSE` | Lisensi MIT library yang wajib tetap disertakan. |
| `.nojekyll` | Menandai proyek sebagai berkas statis untuk GitHub Pages. |

## Cara deploy ke GitHub Pages

Paket ini **siap diunggah**, tetapi belum dipublikasikan ke akun GitHub mana pun.

1. Masuk ke akun GitHub kamu.
2. Buat repository baru, misalnya **palet-warna**. Pilih **Public** bila menggunakan GitHub Free.
3. Buka repository, pilih **Add file → Upload files**, lalu unggah **isi** folder `palet-warna`, termasuk folder `vendor`. Jangan mengunggah ZIP sebagai pengganti berkas aplikasi.
4. Pastikan `index.html` berada langsung di halaman utama repository, sejajar dengan `style.css` dan `script.js`. Jangan menaruh seluruh aplikasi di dalam folder tambahan.
5. Klik **Commit changes** untuk menyimpan berkas ke branch `main`.
6. Buka **Settings → Pages**.
7. Pada **Build and deployment**, pilih **Source: Deploy from a branch**.
8. Pilih branch **main** dan folder **/(root)**, lalu klik **Save**.
9. Tunggu proses publikasi selesai. Tautan situs akan tersedia di bagian Pages; gunakan tombol **Visit site**.

Untuk repository bernama `palet-warna`, pola alamatnya adalah `https://USERNAME.github.io/palet-warna/`. Ganti `USERNAME` dengan username GitHub kamu. Ini contoh pola alamat, bukan tautan situs yang sudah dibuat.

Panduan resmi: [Membuat situs GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) dan [Mengatur sumber publikasi](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Alur program untuk dipelajari

1. Pengguna memilih file atau memasukkan URL.
2. `handleFile()` memeriksa format dan ukuran file. Untuk URL, handler formulir memeriksa protokolnya.
3. `loadImage()` menunggu gambar selesai dimuat. Properti `crossOrigin` diatur sebelum `src` untuk gambar dari situs lain.
4. `extractPalette()` menggambar gambar ke canvas dengan sisi terpanjang maksimal 900 piksel. Pembatasan ini mempercepat analisis foto berukuran besar.
5. Fungsi memanggil library:

```js
const thief = new ColorThief();
const palette = thief.getPalette(canvas, 6, quality);
const dominant = thief.getColor(canvas, quality);
```

6. Library mengembalikan nilai RGB. `rgbToHex()` mengubah setiap kanal menjadi dua digit heksadesimal. Contohnya `[0, 128, 255]` menjadi `#0080FF`.
7. `renderPalette()` membuat kotak warna dan teks HEX. `copyText()` menyalin hasil ke clipboard.

`getPalette()` melakukan kuantisasi: piksel dengan warna serupa dirangkum menjadi beberapa warna perwakilan. Jadi hasilnya tidak selalu identik dengan semua piksel asli. `getColor()` menggunakan aturan warna dominan milik Color Thief; aplikasi tidak menampilkan persentase luas warna.

## Perilaku dan batasan

- Format: JPG/JPEG, PNG, WebP, GIF, AVIF, dan BMP yang dapat dibaca browser. Dukungan AVIF bergantung pada browser. HEIC dan SVG tidak diterima pada versi ini.
- Color Thief 2.6.0 mengabaikan piksel mendekati putih murni dan piksel dengan alpha di bawah 125/255. Karena itu, pada gambar campuran, putih dapat tidak muncul dalam hasil library.
- Gambar satu warna atau seluruhnya mendekati putih ditangani khusus melalui data piksel canvas agar tetap menghasilkan warna yang masuk akal. Gambar tanpa piksel yang cukup terlihat menampilkan pesan kesalahan.
- Gambar animasi dianalisis sebagai satu frame saat dimuat. Pratinjau dibekukan ke frame yang sama dengan hasil analisis.
- Situs sumber URL harus mengizinkan pembacaan gambar lintas situs melalui CORS. Tautan halaman artikel bukan tautan langsung gambar. Jika ditolak, unduh gambarnya dan gunakan unggah file.
- Gambar besar diperkecil hanya untuk analisis dan pratinjau. Detail warna yang sangat kecil dapat berubah karena proses ini; dimensi yang ditampilkan tetap dimensi asli.
- Saat browser menolak clipboard, aplikasi mencoba metode salin cadangan. Jika keduanya ditolak, kode HEX tetap dapat disalin secara manual.
- Gambar dan palet terakhir tetap ditampilkan jika gambar pengganti gagal dibaca.

## Pemeriksaan yang sudah dilakukan

16 pemeriksaan logika lulus menggunakan implementasi Canvas dan library Color Thief asli. Cakupannya: konversi HEX, gambar satu warna/putih/hitam, gambar merah-hijau-biru, gambar transparan, area warna kecil, gambar besar, pembuatan hasil, salin kode, validasi tipe dan ukuran, gambar rusak, protokol URL, reset, serta pergantian gambar yang berlangsung cepat.

Elemen halaman disimulasikan untuk pemeriksaan tersebut. Pemeriksaan tampilan dan interaksi pada browser sungguhan, akses URL lintas situs, serta publikasi GitHub Pages belum dilakukan dari lingkungan pembuatan ini. Setelah dibuka di laptop, coba unggah satu foto, klik kode HEX, dan tempelkan hasilnya ke Notepad; ulangi di URL GitHub Pages setelah dipublikasikan.

## Sumber library

- Proyek resmi: [lokesh/color-thief](https://github.com/lokesh/color-thief)
- Berkas browser yang disertakan: [Color Thief v2.6.0 UMD](https://raw.githubusercontent.com/lokesh/color-thief/v2.6.0/dist/color-thief.umd.js)
- Versi dikunci ke 2.6.0 untuk menggunakan API browser klasik tanpa build atau impor modul. API versi 3 berbeda; jangan mengganti berkas vendor tanpa menyesuaikan kode.

Library disertakan tanpa modifikasi dengan lisensi MIT. Kode antarmuka dan integrasi ada terpisah di tiga berkas utama agar mudah dipelajari.
