import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Descriptions, InputNumber, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productionOrdersApi } from '../../api/productionOrders';
import { productsApi } from '../../api/products';
import { StatusTag } from '../../components/common/StatusTag';
import { ApiError } from '../../lib/apiClient';
import { formatQty, parseDecimal } from '../../lib/decimal';
import {
  PRODUCTION_ORDER_STATUS_COLORS,
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_ORDER_STATUS_OPTIONS,
  STOCK_MOVEMENT_IN_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
} from '../../types/enums';
import type { ProductionOrderStatus } from '../../types/enums';
import type { BomItem } from '../../types/bom';
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
  const [producedQuantity, setProducedQuantity] = useState<number | null>(null);

  const productLabel = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    return product ? `${product.code} — ${product.name}` : productId;
  };
  const componentLabel = (item: BomItem) =>
    item.component ? `${item.component.code} — ${item.component.name}` : productLabel(item.componentProductId);

  const updateMutation = useMutation({
    mutationFn: (input: { status?: ProductionOrderStatus; producedQuantity?: number }) =>
      productionOrdersApi.update(id as string, input),
    onSuccess: () => {
      message.success('Üretim emri güncellendi.');
      void queryClient.invalidateQueries({ queryKey: ['production-orders', id] });
      void queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  if (isLoading || !data) {
    return <Card loading style={{ maxWidth: 900 }} />;
  }

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
          <Select<ProductionOrderStatus>
            style={{ width: 200 }}
            defaultValue={data.status}
            options={PRODUCTION_ORDER_STATUS_OPTIONS}
            onChange={(status) => updateMutation.mutate({ status })}
          />
          <InputNumber
            min={0}
            placeholder="Üretilen miktar"
            value={producedQuantity ?? parseDecimal(data.producedQuantity)}
            onChange={(v) => setProducedQuantity(v)}
          />
          <Button
            loading={updateMutation.isPending}
            onClick={() => producedQuantity !== null && updateMutation.mutate({ producedQuantity })}
            disabled={producedQuantity === null}
          >
            Üretilen Miktarı Kaydet
          </Button>
        </Space>
      </Card>

      <Card title="Stok Hareketi Kaydı" style={{ marginBottom: 24 }}>
        <Typography.Paragraph type="secondary">
          Üretim emri tamamlandığında stok otomatik güncellenmez — çıktı ve bileşen tüketimini burada elle kaydedin.
        </Typography.Paragraph>
        <Space orientation="vertical">
          <Link
            to={`/stock-movements/new?productId=${data.productId}&warehouseId=${data.warehouseId}&type=PRODUCTION_IN&productionOrderId=${data.id}`}
          >
            <Button type="primary">Üretim Girişi Kaydet ({data.product.code})</Button>
          </Link>
          <Typography.Text strong>Bileşen Tüketimi:</Typography.Text>
          <Table<BomItem>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={data.bom.items}
            columns={[
              { title: 'Bileşen', render: (_: unknown, item: BomItem) => componentLabel(item) },
              { title: 'Reçete Miktarı', dataIndex: 'quantity', render: (v: string) => formatQty(v) },
              {
                title: 'İşlem',
                render: (_: unknown, item: BomItem) => (
                  <Link
                    to={`/stock-movements/new?productId=${item.componentProductId}&warehouseId=${data.warehouseId}&type=PRODUCTION_CONSUME_OUT&productionOrderId=${data.id}`}
                  >
                    <Button size="small">Tüketim Kaydet</Button>
                  </Link>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Card title="Bu Emre Bağlı Stok Hareketleri">
        <Table<BareStockMovement>
          rowKey="id"
          size="small"
          pagination={false}
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
