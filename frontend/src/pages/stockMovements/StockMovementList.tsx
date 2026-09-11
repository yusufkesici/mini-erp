import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { stockMovementsApi } from '../../api/stockMovements';
import { formatQty } from '../../lib/decimal';
import { STOCK_MOVEMENT_IN_TYPES, STOCK_MOVEMENT_TYPE_LABELS } from '../../types/enums';
import type { StockMovement } from '../../types/stockMovement';

export default function StockMovementList() {
  const { data, isLoading } = useQuery({ queryKey: ['stock-movements'], queryFn: stockMovementsApi.list });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Stok Hareketleri
        </Typography.Title>
        <Link to="/stock-movements/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Hareket
          </Button>
        </Link>
      </Space>
      <Table<StockMovement>
        rowKey="id"
        scroll={{ x: 'max-content' }}
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Tarih', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('tr-TR') },
          { title: 'Ürün', render: (_: unknown, r: StockMovement) => `${r.product.code} — ${r.product.name}` },
          { title: 'Konum', render: (_: unknown, r: StockMovement) => `${r.location.code} (${r.location.warehouse.code})` },
          {
            title: 'Tip',
            dataIndex: 'type',
            render: (t: StockMovement['type']) => (
              <Tag color={STOCK_MOVEMENT_IN_TYPES.includes(t) ? 'success' : 'error'}>
                {STOCK_MOVEMENT_TYPE_LABELS[t]}
              </Tag>
            ),
          },
          { title: 'Miktar', dataIndex: 'quantity', render: (v: string) => formatQty(v) },
          { title: 'Not', dataIndex: 'note', render: (v: string | null) => v ?? '—' },
        ]}
      />
    </div>
  );
}
