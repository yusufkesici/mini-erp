import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { bomApi } from '../../api/bom';
import { ApiError } from '../../lib/apiClient';
import { formatQty } from '../../lib/decimal';
import type { BillOfMaterial } from '../../types/bom';

export default function BomList() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['bom'], queryFn: bomApi.list });

  const removeMutation = useMutation({
    mutationFn: bomApi.remove,
    onSuccess: () => {
      message.success('Reçete silindi.');
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Reçeteler (BOM)
        </Typography.Title>
        <Link to="/bom/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Reçete
          </Button>
        </Link>
      </Space>
      <Table<BillOfMaterial>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Ürün', render: (_: unknown, r: BillOfMaterial) => `${r.product.code} — ${r.product.name}` },
          { title: 'Reçete Adı', dataIndex: 'name', render: (v: string | null) => v ?? '—' },
          { title: 'Çıktı Miktarı', dataIndex: 'outputQuantity', render: (v: string) => formatQty(v) },
          { title: 'Bileşen Sayısı', render: (_: unknown, r: BillOfMaterial) => r.items.length },
          {
            title: 'Durum',
            dataIndex: 'isActive',
            render: (active: boolean) => (active ? <Tag color="success">Aktif</Tag> : <Tag>Pasif</Tag>),
          },
          {
            title: 'İşlemler',
            render: (_: unknown, record: BillOfMaterial) => (
              <Space>
                <Link to={`/bom/${record.id}`}>Detay</Link>
                <Link to={`/bom/${record.id}/edit`}>Düzenle</Link>
                <Popconfirm
                  title="Reçeteyi silmek istediğinize emin misiniz?"
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
