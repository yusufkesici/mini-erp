import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { warehousesApi } from '../../api/warehouses';
import { ApiError } from '../../lib/apiClient';
import type { Warehouse } from '../../types/warehouse';

export default function WarehouseList() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });

  const removeMutation = useMutation({
    mutationFn: warehousesApi.remove,
    onSuccess: () => {
      message.success('Depo pasifleştirildi.');
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Depolar
        </Typography.Title>
        <Link to="/warehouses/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Depo
          </Button>
        </Link>
      </Space>
      <Table<Warehouse>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Kod', dataIndex: 'code' },
          { title: 'Ad', dataIndex: 'name' },
          { title: 'Adres', dataIndex: 'address', render: (v: string | null) => v ?? '—' },
          {
            title: 'Durum',
            dataIndex: 'isActive',
            render: (active: boolean) => (active ? <Tag color="success">Aktif</Tag> : <Tag>Pasif</Tag>),
          },
          {
            title: 'İşlemler',
            render: (_: unknown, record: Warehouse) => (
              <Space>
                <Link to={`/warehouses/${record.id}/edit`}>Düzenle</Link>
                <Popconfirm
                  title="Depoyu pasifleştirmek istediğinize emin misiniz?"
                  okText="Pasifleştir"
                  cancelText="Vazgeç"
                  onConfirm={() => removeMutation.mutate(record.id)}
                >
                  <a>Pasifleştir</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
