import { PrinterOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

interface BarcodeLabelProps {
  value?: string;
  title?: string;
}

// Üretilen/girilen kod değerini gerçek, taranabilir bir CODE128 barkod sembolüne çevirir —
// hem ürünlerin 13 haneli sayısal barkodunu hem konumların "LOC-XXXXXX" alfanümerik kodunu
// tek formatta kodlayabilir (bkz. warehouse-scan'in kamera taramasında zaten desteklenen
// CODE_128 — src/components/scanner/CameraScanner.tsx). Basılıp okutulduğunda sistem aynı
// metin değerini arayacağı için (LocationsService.findByCode / ProductsService.findByBarcode)
// backend tarafında hiçbir değişiklik gerekmez.
export function BarcodeLabel({ value, title }: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!value || !svgRef.current) return;
    JsBarcode(svgRef.current, value, {
      format: 'CODE128',
      displayValue: true,
      height: 60,
      margin: 8,
    });
  }, [value]);

  if (!value) return null;

  return (
    <Space orientation="vertical" align="center" style={{ width: '100%', marginTop: 8 }}>
      {/* Yazdırmada yalnızca bu alan görünür kalır (bkz. index.css .barcode-print-area) */}
      <div className="barcode-print-area" style={{ textAlign: 'center' }}>
        {title && (
          <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
            {title}
          </Typography.Text>
        )}
        <svg ref={svgRef} />
      </div>
      <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
        Barkodu Yazdır
      </Button>
    </Space>
  );
}
