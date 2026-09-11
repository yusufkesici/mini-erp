// Rastgele barkod/kod üretimi — yalnızca dahili kullanım içindir, gerçek GS1/EAN kontrol
// hanesi hesaplanmaz. Çakışma ihtimali (13 haneli sayısal / 6 haneli alfanümerik için
// pratikte ihmal edilebilir) backend'in @unique kısıtına takılırsa kullanıcı butona
// tekrar tıklayıp yeni bir değer üretebilir.

function randomDigit(): string {
  return Math.floor(Math.random() * 10).toString();
}

// EAN-13 benzeri, 13 haneli sayısal ürün barkodu (ilk hane 0 olmaz, gerçekçi görünüm için).
export function generateProductBarcode(): string {
  const first = (1 + Math.floor(Math.random() * 9)).toString();
  const rest = Array.from({ length: 12 }, randomDigit).join('');
  return first + rest;
}

// 0/O ve 1/I hariç — fiziksel etikette karışıklık yaratmasın diye.
const LOCATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// "LOC-" öneki backend'de (@Matches) zorunlu — CreateLocationDto ile uyumlu üretir.
export function generateLocationCode(): string {
  const suffix = Array.from(
    { length: 6 },
    () => LOCATION_CODE_ALPHABET[Math.floor(Math.random() * LOCATION_CODE_ALPHABET.length)],
  ).join('');
  return `LOC-${suffix}`;
}
