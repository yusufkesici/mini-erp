import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Space, Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { salesOrdersApi } from '../../api/salesOrders';
import { StatusTag } from '../../components/common/StatusTag';
import { formatMoney, parseDecimal } from '../../lib/decimal';
import { SALES_ORDER_STATUS_COLORS, SALES_ORDER_STATUS_LABELS } from '../../types/enums';
import type { SalesOrder } from '../../types/salesOrder';

function orderTotal(order: SalesOrder): number {
  return order.items.reduce((sum, item) => sum + parseDecimal(item.quantity) * parseDecimal(item.unitPrice), 0);
}

export default function SalesOrderList() {
  const { data, isLoading } = useQuery({ queryKey: ['sales-orders'], queryFn: salesOrdersApi.list });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Satış Siparişleri
        </Typography.Title>
        <Link to="/sales-orders/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Sipariş
          </Button>
        </Link>
      </Space>
      <Table<SalesOrder>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Tarih', dataIndex: 'orderDate', render: (v: string) => new Date(v).toLocaleDateString('tr-TR') },
          { title: 'Müşteri', render: (_: unknown, r: SalesOrder) => `${r.customer.code} — ${r.customer.name}` },
          { title: 'Kalem Sayısı', render: (_: unknown, r: SalesOrder) => r.items.length },
          { title: 'Toplam', render: (_: unknown, r: SalesOrder) => formatMoney(orderTotal(r)) },
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
    </div>
  );
}
