import { useQuery } from '@tanstack/react-query';
import { Card, Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { stockApi } from '../../api/stock';
import { AccountingSummaryWidget } from '../accounting/AccountingSummaryWidget';
import { formatQty, parseDecimal } from '../../lib/decimal';
import type { Stock } from '../../types/stock';

export default function Dashboard() {
  const { data: stock, isLoading } = useQuery({ queryKey: ['stock'], queryFn: stockApi.list });
  const lowStock = (stock ?? []).filter(
    (s) => s.minStockLevel && parseDecimal(s.quantity) < parseDecimal(s.minStockLevel),
  );

  return (
    <div>
      <Typography.Title level={3}>Panel</Typography.Title>
      <div style={{ marginBottom: 24 }}>
        <AccountingSummaryWidget />
      </div>
      <Card title="Düşük Stoklu Ürünler">
        <Table<Stock>
          rowKey="id"
          scroll={{ x: 'max-content' }}
          loading={isLoading}
          dataSource={lowStock}
          locale={{ emptyText: 'Düşük stoklu ürün yok.' }}
          pagination={false}
          columns={[
            {
              title: 'Ürün',
              render: (_: unknown, r: Stock) => <Link to={`/products/${r.productId}/edit`}>{r.product.code} — {r.product.name}</Link>,
            },
            { title: 'Depo', render: (_: unknown, r: Stock) => `${r.warehouse.code} — ${r.warehouse.name}` },
            { title: 'Miktar', dataIndex: 'quantity', render: (v: string) => formatQty(v) },
            { title: 'Min. Stok', dataIndex: 'minStockLevel', render: (v: string) => formatQty(v) },
          ]}
        />
      </Card>
    </div>
  );
}
