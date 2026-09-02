import { PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { stockApi } from '../../api/stock';
import { formatQty, parseDecimal } from '../../lib/decimal';
import type { Stock } from '../../types/stock';

export default function StockList() {
  const { data, isLoading } = useQuery({ queryKey: ['stock'], queryFn: stockApi.list });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Stok Durumu
        </Typography.Title>
        <Link to="/stock/new">
          <Button icon={<PlusOutlined />}>Yeni Stok Kaydı</Button>
        </Link>
      </Space>
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        title="Stok miktarını değiştirmenin normal yolu 'Stok Hareketi' eklemektir. Buradaki düzenleme, sadece manuel düzeltme/başlangıç kaydı içindir."
      />
      <Table<Stock>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Ürün', render: (_: unknown, r: Stock) => `${r.product.code} — ${r.product.name}` },
          { title: 'Depo', render: (_: unknown, r: Stock) => `${r.warehouse.code} — ${r.warehouse.name}` },
          { title: 'Miktar', dataIndex: 'quantity', render: (v: string) => formatQty(v) },
          {
            title: 'Min. Stok',
            dataIndex: 'minStockLevel',
            render: (v: string | null) => (v ? formatQty(v) : '—'),
          },
          {
            title: 'Uyarı',
            render: (_: unknown, r: Stock) =>
              r.minStockLevel && parseDecimal(r.quantity) < parseDecimal(r.minStockLevel) ? (
                <Tag color="warning">Düşük Stok</Tag>
              ) : null,
          },
          {
            title: 'İşlemler',
            render: (_: unknown, record: Stock) => (
              <Space>
                <Link to={`/stock/${record.id}/edit`}>Düzenle</Link>
                <Link
                  to={`/stock-movements/new?productId=${record.productId}&warehouseId=${record.warehouseId}`}
                >
                  <SwapOutlined /> Hareket Ekle
                </Link>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
