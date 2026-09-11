import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Descriptions, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { productionOrdersApi } from '../../api/productionOrders';
import { productsApi } from '../../api/products';
import { StatusTag } from '../../components/common/StatusTag';
import { ApiError } from '../../lib/apiClient';
import { formatQty } from '../../lib/decimal';
import {
  PRODUCTION_ORDER_STATUS_COLORS,
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_ORDER_STATUS_TRANSITIONS,
  STOCK_MOVEMENT_IN_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
} from '../../types/enums';
import type { ProductionOrderStatus } from '../../types/enums';
import type { BareStockMovement } from '../../types/stockMovement';

export default function ProductionOrderDetail() {
  const { id } = useParams();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['production-orders', id],
    queryFn: () => productionOrdersApi.get(id as string),
  });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: productsApi.list });
  const [reportQuantity, setReportQuantity] = useState<number | null>(null);

  const productLabel = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    return product ? `${product.code} — ${product.name}` : productId;
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['production-orders', id] });
    void queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
  };
  const onError = (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.');

  // Aşamalı üretim bildirimi: girilen miktar bu partide üretilen ARTIŞtır (toplam değil).
  // Backend, BOM'u bu artış için özyinelemeli patlatıp bileşenleri tek transaction'da düşer,
  // üretilen ürünü depoya ekler — plannedQuantity'ye ulaşmadan da tekrar tekrar çağrılabilir.
  const reportMutation = useMutation({
    mutationFn: (quantity: number) => productionOrdersApi.reportProduction(id as string, quantity),
    onSuccess: () => {
      message.success('Üretim bildirildi, bileşenler stoktan düşüldü.');
      setReportQuantity(null);
      invalidate();
    },
    onError,
  });

  // Saf durum geçişi — stok/BOM'a dokunmaz. Eksik üretimle (plannedQuantity'ye ulaşmadan)
  // COMPLETED'e çekmek de geçerlidir: kısmi/erken kapanış, kalan miktar için bir şey olmaz.
  const statusMutation = useMutation({
    mutationFn: (status: ProductionOrderStatus) => productionOrdersApi.updateStatus(id as string, status),
    onSuccess: () => {
      message.success('Durum güncellendi.');
      invalidate();
    },
    onError,
  });

  if (isLoading || !data) {
    return <Card loading style={{ maxWidth: 900 }} />;
  }

  const nextStatuses = PRODUCTION_ORDER_STATUS_TRANSITIONS[data.status];

  // "Tamamlandı" tek tıkla anında kaydediliyordu — yanlışlıkla seçilirse üretim emri
  // geri dönüşü zor bir şekilde kapanmış oluyordu. Bu yüzden bu geçiş için onay isteniyor;
  // diğer geçişler (ör. IN_PROGRESS, CANCELLED) doğrudan uygulanır.
  const handleStatusChange = (status: (typeof nextStatuses)[number]) => {
    if (status === 'COMPLETED') {
      Modal.confirm({
        title: 'Üretim emrini tamamlandı olarak işaretle?',
        content:
          'Üretilen miktar planlanandan az olsa bile emir tamamlanmış sayılacak. Eksik üretim bildirimi yapmak isterseniz durumu tekrar "Devam Ediyor"a almanız gerekecek.',
        okText: 'Evet, tamamla',
        cancelText: 'Vazgeç',
        onOk: () => statusMutation.mutate(status),
      });
    } else {
      statusMutation.mutate(status);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Typography.Title level={3}>Üretim Emri Detayı</Typography.Title>
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Ürün">
            {data.product.code} — {data.product.name}
          </Descriptions.Item>
          <Descriptions.Item label="Depo">
            {data.warehouse.code} — {data.warehouse.name}
          </Descriptions.Item>
          <Descriptions.Item label="Reçete">{data.bom.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Durum">
            <StatusTag
              label={PRODUCTION_ORDER_STATUS_LABELS[data.status]}
              color={PRODUCTION_ORDER_STATUS_COLORS[data.status]}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Planlanan Miktar">{formatQty(data.plannedQuantity)}</Descriptions.Item>
          <Descriptions.Item label="Üretilen Miktar">{formatQty(data.producedQuantity)}</Descriptions.Item>
        </Descriptions>

        <Space style={{ marginTop: 16 }} wrap>
          {nextStatuses.length > 0 && (
            <Select<ProductionOrderStatus>
              style={{ width: 200 }}
              placeholder="Durumu değiştir"
              options={nextStatuses.map((status) => ({ value: status, label: PRODUCTION_ORDER_STATUS_LABELS[status] }))}
              loading={statusMutation.isPending}
              onChange={handleStatusChange}
            />
          )}
          <InputNumber
            min={0.0001}
            placeholder="Bu partide üretilen miktar"
            value={reportQuantity}
            onChange={(v) => setReportQuantity(v)}
          />
          <Button
            type="primary"
            loading={reportMutation.isPending}
            onClick={() => reportQuantity !== null && reportMutation.mutate(reportQuantity)}
            disabled={reportQuantity === null}
          >
            Üretimi Bildir
          </Button>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Her bildirimde BOM, girilen miktar kadar özyinelemeli patlatılır; ham madde bileşenleri
          hemen stoktan düşülür, üretilen ürün depoya eklenir — plannedQuantity'ye ulaşmadan da
          birden fazla kez bildirim yapılabilir (aşamalı üretim).
        </Typography.Paragraph>
      </Card>

      <Card title="Bu Emre Bağlı Stok Hareketleri">
        <Table<BareStockMovement>
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          dataSource={data.movements ?? []}
          columns={[
            { title: 'Tarih', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('tr-TR') },
            { title: 'Ürün', render: (_: unknown, r: BareStockMovement) => productLabel(r.productId) },
            {
              title: 'Tip',
              dataIndex: 'type',
              render: (t: BareStockMovement['type']) => (
                <Tag color={STOCK_MOVEMENT_IN_TYPES.includes(t) ? 'success' : 'error'}>
                  {STOCK_MOVEMENT_TYPE_LABELS[t]}
                </Tag>
              ),
            },
            { title: 'Miktar', dataIndex: 'quantity', render: (v: string) => formatQty(v) },
          ]}
        />
      </Card>
    </div>
  );
}
