import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Space, Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { productionOrdersApi } from '../../api/productionOrders';
import { StatusTag } from '../../components/common/StatusTag';
import { formatQty } from '../../lib/decimal';
import { PRODUCTION_ORDER_STATUS_COLORS, PRODUCTION_ORDER_STATUS_LABELS } from '../../types/enums';
import type { ProductionOrder } from '../../types/productionOrder';

export default function ProductionOrderList() {
  const { data, isLoading } = useQuery({ queryKey: ['production-orders'], queryFn: productionOrdersApi.list });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Üretim Emirleri
        </Typography.Title>
        <Link to="/production-orders/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Üretim Emri
          </Button>
        </Link>
      </Space>
      <Table<ProductionOrder>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Ürün', render: (_: unknown, r: ProductionOrder) => `${r.product.code} — ${r.product.name}` },
          { title: 'Depo', render: (_: unknown, r: ProductionOrder) => `${r.warehouse.code} — ${r.warehouse.name}` },
          { title: 'Planlanan', dataIndex: 'plannedQuantity', render: (v: string) => formatQty(v) },
          { title: 'Üretilen', dataIndex: 'producedQuantity', render: (v: string) => formatQty(v) },
          {
            title: 'Durum',
            dataIndex: 'status',
            render: (s: ProductionOrder['status']) => (
              <StatusTag label={PRODUCTION_ORDER_STATUS_LABELS[s]} color={PRODUCTION_ORDER_STATUS_COLORS[s]} />
            ),
          },
          {
            title: 'İşlemler',
            render: (_: unknown, record: ProductionOrder) => <Link to={`/production-orders/${record.id}`}>Detay</Link>,
          },
        ]}
      />
    </div>
  );
}
