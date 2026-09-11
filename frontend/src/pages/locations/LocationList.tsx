import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { locationsApi } from '../../api/locations';
import { ApiError } from '../../lib/apiClient';
import type { Location } from '../../types/location';

export default function LocationList() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['locations'], queryFn: locationsApi.list });

  const removeMutation = useMutation({
    mutationFn: locationsApi.remove,
    onSuccess: () => {
      message.success('Konum pasifleştirildi.');
      void queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Konumlar (Raflar)
        </Typography.Title>
        <Link to="/locations/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Konum
          </Button>
        </Link>
      </Space>
      <Table<Location>
        rowKey="id"
        scroll={{ x: 'max-content' }}
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Kod (Barkod)', dataIndex: 'code' },
          { title: 'Ad', dataIndex: 'name' },
          { title: 'Depo', render: (_: unknown, r: Location) => `${r.warehouse.code} — ${r.warehouse.name}` },
          {
            title: 'Genel Alan',
            dataIndex: 'isDefault',
            render: (isDefault: boolean) => (isDefault ? <Tag color="blue">Genel</Tag> : null),
          },
          {
            title: 'Durum',
            dataIndex: 'isActive',
            render: (active: boolean) => (active ? <Tag color="success">Aktif</Tag> : <Tag>Pasif</Tag>),
          },
          {
            title: 'İşlemler',
            render: (_: unknown, record: Location) => (
              <Space>
                <Link to={`/locations/${record.id}/edit`}>Düzenle</Link>
                <Popconfirm
                  title="Konumu pasifleştirmek istediğinize emin misiniz?"
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
