import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Descriptions,
  Input,
  InputNumber,
  Segmented,
  Space,
  Tag,
  Typography,
  type InputRef,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { warehouseScanApi } from '../../api/warehouseScan';
import { CameraScanner } from '../../components/scanner/CameraScanner';
import { useHidBarcodeScanner } from '../../hooks/useHidBarcodeScanner';
import { ApiError } from '../../lib/apiClient';
import { TRACKING_TYPE_LABELS } from '../../types/enums';
import { useScanStateMachine } from './useScanStateMachine';

type ScanMode = 'IN' | 'OUT';

export default function WarehouseScanPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ScanMode>('IN');
  const { state, dispatch } = useScanStateMachine();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<InputRef>(null);

  // Her adım değişiminde (raf/ürün çözümlendi, kaydedildi, vazgeçildi) girişi tekrar odakla —
  // hem manuel yazım hem klavye-emülasyonlu (HID) barkod okuyucular için (input odaktayken
  // useHidBarcodeScanner araya girmez, doğrudan bu input'un onChange/onPressEnter'ı çalışır).
  useEffect(() => {
    inputRef.current?.focus();
  }, [state.step]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
    void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
  };

  const resolveMutation = useMutation({
    mutationFn: (code: string) =>
      warehouseScanApi.resolve(code, state.step === 'RAF_BEKLENIYOR' ? 'LOCATION' : 'PRODUCT'),
    onSuccess: (result) => {
      if (result.kind === 'LOCATION') {
        dispatch({ type: 'LOCATION_RESOLVED', location: result.data });
      } else {
        dispatch({ type: 'PRODUCT_RESOLVED', product: result.data });
      }
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Barkod okunamadı.'),
  });

  const scanMutation = useMutation({
    mutationFn: () => {
      const input = {
        locationId: state.location!.id,
        productId: state.product!.id,
        quantity: state.quantity,
      };
      return mode === 'IN' ? warehouseScanApi.scanIn(input) : warehouseScanApi.scanOut(input);
    },
    onSuccess: () => {
      message.success(`${state.product?.code} — ${state.quantity} adet kaydedildi.`);
      dispatch({ type: 'SAVED' });
      invalidate();
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  // Tüm tarama mekanizmalarının (manuel giriş, global HID dinleyici, kamera) tek buluşma
  // noktası — hangi kaynaktan gelirse gelsin bir kod her zaman aynı şekilde işlenir.
  const handleScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    resolveMutation.mutate(trimmed);
  };

  // Görünür input odaktayken HID okuyucu zaten onun onChange/onPressEnter'ı üzerinden
  // çalışır (hook, editable bir hedefteyse hiç araya girmez — bkz. useHidBarcodeScanner).
  // Bu, odak başka bir yere kaydığında (örn. "Rafı Değiştir"e tıklandıktan hemen sonra)
  // taramanın kesintisiz çalışmasını sağlar.
  useHidBarcodeScanner(handleScan, !scanMutation.isPending);

  const handleSubmitCode = () => {
    const code = inputValue;
    setInputValue('');
    handleScan(code);
  };

  const handleModeChange = (value: ScanMode) => {
    setMode(value);
    dispatch({ type: 'RESET' });
  };

  const trackingBlocked = state.product && state.product.trackingType !== 'BARCODE_MANUAL';

  return (
    <div style={{ maxWidth: 640 }}>
      <Typography.Title level={3}>Depo Tarama</Typography.Title>
      <Card>
        <Segmented
          block
          value={mode}
          onChange={(value) => handleModeChange(value as ScanMode)}
          options={[
            { label: 'Giriş', value: 'IN' },
            { label: 'Çıkış', value: 'OUT' },
          ]}
          style={{ marginBottom: 16 }}
        />

        {state.location && (
          <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Aktif Raf">
              <Tag color="blue">{state.location.code}</Tag>
              {state.location.name} — {state.location.warehouse.code}
            </Descriptions.Item>
          </Descriptions>
        )}

        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          {state.step === 'RAF_BEKLENIYOR' ? 'Raf barkodunu okutun veya girin.' : 'Ürün barkodunu okutun veya girin.'}
        </Typography.Paragraph>
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            ref={inputRef}
            autoFocus
            size="large"
            style={{ flex: 1, minWidth: 0 }}
            placeholder={state.step === 'RAF_BEKLENIYOR' ? 'Raf barkodu (LOC-...)' : 'Ürün barkodu'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSubmitCode}
            disabled={resolveMutation.isPending}
          />
          <CameraScanner onScan={handleScan} />
        </Space.Compact>

        {state.product && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Ürün">
                {state.product.code} — {state.product.name}
              </Descriptions.Item>
              <Descriptions.Item label="Takip Yöntemi">
                <Tag color={trackingBlocked ? 'error' : 'success'}>
                  {TRACKING_TYPE_LABELS[state.product.trackingType]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {trackingBlocked && (
              <Typography.Paragraph type="danger">
                Bu ürün Otomatik (BOM_AUTO) olarak işaretli — yalnızca üretim emirleriyle
                girer/çıkar, barkod ekranından {mode === 'IN' ? 'girilemez' : 'çıkarılamaz'}.
              </Typography.Paragraph>
            )}

            <Space style={{ marginBottom: 16 }} align="center">
              <Typography.Text>Miktar:</Typography.Text>
              <InputNumber
                min={0.0001}
                value={state.quantity}
                onChange={(v) => dispatch({ type: 'SET_QUANTITY', quantity: v ?? 1 })}
                autoFocus={false}
              />
            </Space>
            <Space>
              <Button
                type="primary"
                danger={mode === 'OUT'}
                loading={scanMutation.isPending}
                disabled={!!trackingBlocked}
                onClick={() => scanMutation.mutate()}
              >
                {mode === 'IN' ? 'Girişi Kaydet' : 'Çıkışı Kaydet'}
              </Button>
              <Button onClick={() => dispatch({ type: 'CANCEL_PRODUCT' })}>Vazgeç</Button>
            </Space>
          </>
        )}

        {state.location && (
          <div style={{ marginTop: 24 }}>
            <Button onClick={() => dispatch({ type: 'CHANGE_LOCATION' })}>Rafı Değiştir</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
