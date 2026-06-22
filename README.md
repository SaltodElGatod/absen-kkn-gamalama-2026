# Absensi KKN Tematik Kel. Gamalama 2026

Website statis untuk absensi 40 hari KKN mulai 22/06/2026 sampai 31/07/2026. Aplikasi ini bisa diunggah ke GitHub Pages karena tidak memakai PHP atau MySQL.

## Login

Admin:

- Username: `admin`
- Password: `admin123`

Peserta login memakai nama lengkap sebagai username dan NPM sebagai password.

## Akun Peserta

- Rusdi Usman: `04392211024`
- Muhamad Ramdani Daud: `04392311002`
- M. Mufrih Syafrudin: `03082311032`
- Isnadina Putri Iksan: `03082311033`
- Asti: `03082311035`
- Affan Husen: `03082311036`
- Asria A. Arif: `03082311038`
- Nurul Husni Husen: `07352311154`
- Rezha Amelia Putri Firmansyah: `07352311127`
- Muhammad Salwan Wahab: `07352311159`

## Cara Pakai

1. Admin membuka website dan menampilkan QR absensi harian.
2. Peserta scan QR. Jika belum login, peserta akan diminta login dulu.
3. Setelah login, link QR otomatis mencatat status `hadir` untuk akun peserta tersebut.
4. Jika peserta tidak scan QR sampai hari berganti, riwayat akan menampilkan `alpa` otomatis.
5. Admin bisa mencatat `izin` atau `sakit` dari panel admin.
6. Admin bisa export data ke file CSV yang bisa dibuka di Excel.

## Catatan Database

Data dipisahkan berdasarkan NPM dan disimpan di `localStorage` browser. Ini cocok untuk demo/prototipe GitHub Pages, tetapi belum menjadi database online terpusat.

Kalau semua peserta scan dari HP masing-masing dan admin harus melihat data dari perangkat berbeda secara realtime, gunakan backend online seperti Firebase Firestore, Supabase, atau Google Sheets API.
