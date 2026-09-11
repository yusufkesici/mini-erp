import { useQuery } from '@tanstack/react-query';
import { Button, Card, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import { salesOrdersApi } from '../../api/salesOrders';
import { StatusTag } from '../../components/common/StatusTag';
import { SALES_ORDER_STATUS_COLORS, SALES_ORDER_STATUS_LABELS } from '../../types/enums';
import type { SalesOrder } from '../../types/salesOrder';

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.get(id as string),
  });
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['sales-orders', 'customer', id],
    queryFn: () => salesOrdersApi.listByCustomer(id as string),
  });

  return (
    <Card loading={isLoading} style={{ maxWidth: 900 }}>
      {customer && (
        <>
          <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }} wrap>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {customer.code} — {customer.name}
            </Typography.Title>
            <Space>
              <Link to={`/customers/${customer.id}/edit`}>
                <Button>Düzenle</Button>
              </Link>
              <Link to={`/sales-orders/new?customerId=${customer.id}`}>
                <Button type="primary">Yeni Sipariş</Button>
              </Link>
            </Space>
          </Space>
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="E-posta">{customer.email ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Telefon">{customer.phone ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Adres" span={2}>
              {customer.address ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Durum">
              {customer.isActive ? <Tag color="success">Aktif</Tag> : <Tag>Pasif</Tag>}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5}>Sipariş Geçmişi</Typography.Title>
          <Table<SalesOrder>
            rowKey="id"
            scroll={{ x: 'max-content' }}
            loading={ordersLoading}
            dataSource={orders}
            columns={[
              { title: 'Tarih', dataIndex: 'orderDate', render: (v: string) => new Date(v).toLocaleDateString('tr-TR') },
              { title: 'Kalem Sayısı', render: (_: unknown, r: SalesOrder) => r.items.length },
              {
                title: 'Durum',
                dataIndex: 'status',
                render: (s: SalesOrder['status']) => (
                  <StatusTag label={SALES_ORDER_STATUS_LABELS[s]} color={SALES_ORDER_STATUS_COLORS[s]} />
                ),
              },
              {
                title: 'İşlemler',
                render: (_: unknown, record: SalesOrder) => <Link to={`/sales-orders/${record.id}`}>Detay</Link>,
              },
            ]}
          />
        </>
      )}
    </Card>
  );
}
