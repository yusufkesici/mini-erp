import { useEffect, useRef } from 'react';

// USB/Bluetooth HID barkod okuyucular klavye gibi davranır: karakterleri çok hızlı art arda
// (genelde <10-20ms aralıklarla) "yazıp" sonunda Enter gönderir — insan yazımından belirgin
// şekilde hızlıdır. Bu eşiğin üzerindeki bir aralık, yeni bir burst'ün (yeni bir tarama veya
// insan yazımının) başladığı anlamına gelir.
const MAX_INTERVAL_MS = 40;
// Çok kısa/anlamsız burst'leri (yanlışlıkla basılan tek tuş vb.) tarama olarak kabul etme.
const MIN_CODE_LENGTH = 3;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

// Sayfa/pencere seviyesinde global bir keydown dinleyicisi kurar — görünür barkod input'u
// odakta olmasa bile (örn. "Rafı Değiştir" butonuna tıklandıktan hemen sonra, ya da input
// başka bir sebeple focus'unu kaybetmişse) HID okuyucudan gelen taramaları yakalar.
//
// Odak zaten bir input/textarea üzerindeyse bu hook'a HİÇ karışmaz — o input'un kendi
// onChange/onPressEnter'ı (bkz. WarehouseScanPage'deki manuel input) olduğu gibi çalışmaya
// devam eder. Bu, aynı taramanın iki kez (hem input'un kendi mantığından hem bu global
// dinleyiciden) işlenmesini yapısal olarak imkansız kılar — tek bir taramanın tek bir yolu var.
export function useHidBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const bufferRef = useRef('');
  const lastTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  // Render sırasında değil, her render sonrası effect içinde senkronize edilir (React
  // kuralları ref'e render sırasında yazılmasına izin vermez) — aşağıdaki dinleyici effect'i
  // her zaman en güncel `onScan`'i görsün diye.
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (event.key === 'Enter') {
        const code = bufferRef.current;
        bufferRef.current = '';
        if (code.length >= MIN_CODE_LENGTH) {
          onScanRef.current(code);
        }
        return;
      }

      if (event.key.length !== 1) return; // Shift/Ctrl/ok tuşları vb. — yoksay

      bufferRef.current = elapsed > MAX_INTERVAL_MS ? event.key : bufferRef.current + event.key;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
