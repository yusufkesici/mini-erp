import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { productsApi } from '../../api/products';
import { ApiError } from '../../lib/apiClient';
import { formatMoney } from '../../lib/decimal';
import { PRODUCT_TYPE_LABELS, TRACKING_TYPE_LABELS, UNIT_OF_MEASURE_LABELS } from '../../types/enums';
import type { Product } from '../../types/product';

export default function ProductList() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: productsApi.list });

  const removeMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => {
      message.success('Ürün silindi.');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Ürünler
        </Typography.Title>
        <Link to="/products/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Ürün
          </Button>
        </Link>
      </Space>
      <Table<Product>
        rowKey="id"
        scroll={{ x: 'max-content' }}
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Kod', dataIndex: 'code' },
          { title: 'Ad', dataIndex: 'name' },
          { title: 'Tür', dataIndex: 'type', render: (type: Product['type']) => PRODUCT_TYPE_LABELS[type] },
          { title: 'Birim', dataIndex: 'unit', render: (unit: Product['unit']) => UNIT_OF_MEASURE_LABELS[unit] },
          {
            title: 'Takip',
            dataIndex: 'trackingType',
            render: (t: Product['trackingType']) => (
              <Tag color={t === 'BARCODE_MANUAL' ? 'purple' : 'default'}>{TRACKING_TYPE_LABELS[t]}</Tag>
            ),
          },
          { title: 'Satış Fiyatı', dataIndex: 'salePrice', render: (v: string | null) => (v ? formatMoney(v) : '—') },
          {
            title: 'Durum',
            dataIndex: 'isActive',
            render: (active: boolean) => (active ? <Tag color="success">Aktif</Tag> : <Tag>Pasif</Tag>),
          },
          {
            title: 'İşlemler',
            render: (_: unknown, record: Product) => (
              <Space>
                <Link to={`/products/${record.id}/edit`}>Düzenle</Link>
                <Popconfirm
                  title="Ürünü silmek istediğinize emin misiniz?"
                  okText="Sil"
                  cancelText="Vazgeç"
                  onConfirm={() => removeMutation.mutate(record.id)}
                >
                  <a>Sil</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
