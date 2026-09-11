import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Descriptions, InputNumber, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { salesOrdersApi } from '../../api/salesOrders';
import { StatusTag } from '../../components/common/StatusTag';
import { ApiError } from '../../lib/apiClient';
import { formatMoney, parseDecimal } from '../../lib/decimal';
import {
  SALES_ORDER_ITEMS_EDITABLE,
  SALES_ORDER_STATUS_COLORS,
  SALES_ORDER_STATUS_LABELS,
  SALES_ORDER_STATUS_TRANSITIONS,
} from '../../types/enums';
import type { SalesOrderStatus } from '../../types/enums';
import type { SalesOrderItem } from '../../types/salesOrder';

interface EditState {
  quantity: number;
  unitPrice: number;
}

export default function SalesOrderDetail() {
  const { id } = useParams();
  const orderId = id as string;
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', orderId],
    queryFn: () => salesOrdersApi.get(orderId),
  });
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  useEffect(() => {
    if (!data) return;
    setEdits(
      Object.fromEntries(
        data.items.map((item) => [item.id, { quantity: parseDecimal(item.quantity), unitPrice: parseDecimal(item.unitPrice) }]),
      ),
    );
  }, [data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
    void queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: SalesOrderStatus) => salesOrdersApi.updateStatus(orderId, status),
    onSuccess: () => {
      message.success('Sipariş durumu güncellendi.');
      invalidate();
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, values }: { itemId: string; values: EditState }) =>
      salesOrdersApi.updateItem(orderId, itemId, values),
    onSuccess: () => {
      message.success('Kalem güncellendi.');
      invalidate();
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => salesOrdersApi.removeItem(orderId, itemId),
    onSuccess: () => {
      message.success('Kalem silindi.');
      invalidate();
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  if (isLoading || !data) {
    return <Card loading style={{ maxWidth: 900 }} />;
  }

  const editable = SALES_ORDER_ITEMS_EDITABLE.includes(data.status);
  const nextStatuses = SALES_ORDER_STATUS_TRANSITIONS[data.status];
  const total = data.items.reduce((sum, item) => sum + parseDecimal(item.quantity) * parseDecimal(item.unitPrice), 0);

  return (
    <div style={{ maxWidth: 900 }}>
      <Typography.Title level={3}>Satış Siparişi Detayı</Typography.Title>
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Müşteri">
            {data.customer.code} — {data.customer.name}
          </Descriptions.Item>
          <Descriptions.Item label="Sipariş Tarihi">
            {new Date(data.orderDate).toLocaleDateString('tr-TR')}
          </Descriptions.Item>
          <Descriptions.Item label="Not" span={2}>
            {data.note ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Toplam">{formatMoney(total)}</Descriptions.Item>
          <Descriptions.Item label="Durum">
            <StatusTag label={SALES_ORDER_STATUS_LABELS[data.status]} color={SALES_ORDER_STATUS_COLORS[data.status]} />
          </Descriptions.Item>
        </Descriptions>
        {nextStatuses.length > 0 && (
          <Space style={{ marginTop: 16 }}>
            <Select<SalesOrderStatus>
              style={{ width: 200 }}
              placeholder="Durumu değiştir"
              options={nextStatuses.map((status) => ({ value: status, label: SALES_ORDER_STATUS_LABELS[status] }))}
              loading={statusMutation.isPending}
              onChange={(status) => statusMutation.mutate(status)}
            />
          </Space>
        )}
      </Card>

      <Card
        title="Kalemler"
        extra={
          !editable && (
            <Typography.Text type="secondary">
              Sipariş {SALES_ORDER_STATUS_LABELS[data.status]} durumunda — kalemler değiştirilemez.
            </Typography.Text>
          )
        }
      >
        <Table<SalesOrderItem>
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          dataSource={data.items}
          columns={[
            { title: 'Ürün', render: (_: unknown, r: SalesOrderItem) => `${r.product.code} — ${r.product.name}` },
            {
              title: 'Miktar',
              render: (_: unknown, r: SalesOrderItem) => (
                <InputNumber
                  min={0.0001}
                  disabled={!editable}
                  value={edits[r.id]?.quantity ?? parseDecimal(r.quantity)}
                  onChange={(v) =>
                    setEdits((prev) => ({ ...prev, [r.id]: { ...prev[r.id], quantity: v ?? 0 } }))
                  }
                />
              ),
            },
            {
              title: 'Birim Fiyat',
              render: (_: unknown, r: SalesOrderItem) => (
                <InputNumber
                  min={0}
                  disabled={!editable}
                  value={edits[r.id]?.unitPrice ?? parseDecimal(r.unitPrice)}
                  onChange={(v) =>
                    setEdits((prev) => ({ ...prev, [r.id]: { ...prev[r.id], unitPrice: v ?? 0 } }))
                  }
                />
              ),
            },
            {
              title: 'Ara Toplam',
              render: (_: unknown, r: SalesOrderItem) =>
                formatMoney(parseDecimal(edits[r.id]?.quantity ?? r.quantity) * parseDecimal(edits[r.id]?.unitPrice ?? r.unitPrice)),
            },
            {
              title: 'İşlemler',
              render: (_: unknown, r: SalesOrderItem) => (
                <Space>
                  <Button
                    size="small"
                    disabled={!editable}
                    loading={updateItemMutation.isPending}
                    onClick={() => edits[r.id] && updateItemMutation.mutate({ itemId: r.id, values: edits[r.id] })}
                  >
                    Kaydet
                  </Button>
                  <Popconfirm
                    title="Kalemi silmek istediğinize emin misiniz?"
                    okText="Sil"
                    cancelText="Vazgeç"
                    disabled={!editable || data.items.length <= 1}
                    onConfirm={() => removeItemMutation.mutate(r.id)}
                  >
                    <Button size="small" danger disabled={!editable || data.items.length <= 1}>
                      Sil
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          Not: Siparişin son kalan kalemi silinemez — bunun yerine siparişi iptal edin.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
