import { CameraOutlined } from '@ant-design/icons';
import { App, Button, Modal } from 'antd';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

const READER_ELEMENT_ID = 'warehouse-scan-camera-reader';

// Depo/ürün barkodları hem QR hem de yaygın 1D barkod formatlarıyla basılmış olabilir —
// formatsToSupport bu listeyle sınırlanır, aksi halde kütüphane tüm formatları taramaya
// çalışıp gereksiz CPU harcar.
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_39,
];

interface CameraScannerProps {
  onScan: (code: string) => void;
}

// Kamera otomatik açılmaz — mobil tarayıcılar izin istemini yalnızca bir kullanıcı jestine
// (buton tıklaması) yanıt olarak gösterir. Scanner'ın başlatılması `afterOpenChange` (Modal'ın
// açılış animasyonu TAMAMLANDIĞINDA tetiklenen callback) içinde yapılır — `open` state'ine
// bağlı düz bir useEffect ile başlatmak, Modal'ın içeriği (reader div'i) henüz DOM'a
// mount OLMADAN çalışıp "HTML Element not found" hatasıyla tüm uygulamayı çökertiyordu.
export function CameraScanner({ onScan }: CameraScannerProps) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const onScanRef = useRef(onScan);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  // Component unmount olursa (örn. sayfa değişirse) kamerayı serbest bırak.
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleAfterOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      scanner?.stop().catch(() => {});
      return;
    }

    const scanner = new Html5Qrcode(READER_ELEMENT_ID, {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false,
    });
    scannerRef.current = scanner;
    let handled = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (handled) return;
          handled = true;
          onScanRef.current(decodedText);
          setOpen(false);
        },
        () => {
          // Kare çözümlenemedi — her karede tetiklenen normal bir durum, sessizce yoksay.
        },
      )
      .catch(() => {
        message.error('Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin.');
        setOpen(false);
      });
  };

  return (
    <>
      <Button icon={<CameraOutlined />} onClick={() => setOpen(true)}>
        Kamera ile Tara
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        afterOpenChange={handleAfterOpenChange}
        footer={null}
        title="Barkod/QR Tara"
        destroyOnHidden
      >
        <div id={READER_ELEMENT_ID} style={{ width: '100%' }} />
      </Modal>
    </>
  );
}
