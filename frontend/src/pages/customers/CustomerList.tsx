import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import { ApiError } from '../../lib/apiClient';
import type { Customer } from '../../types/customer';

export default function CustomerList() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      message.success('Müşteri silindi.');
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Müşteriler
        </Typography.Title>
        <Link to="/customers/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Müşteri
          </Button>
        </Link>
      </Space>
      <Table<Customer>
        rowKey="id"
        scroll={{ x: 'max-content' }}
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Kod', dataIndex: 'code' },
          { title: 'Ad', dataIndex: 'name' },
          { title: 'E-posta', dataIndex: 'email', render: (v: string | null) => v ?? '—' },
          { title: 'Telefon', dataIndex: 'phone', render: (v: string | null) => v ?? '—' },
          {
            title: 'Durum',
            dataIndex: 'isActive',
            render: (active: boolean) => (active ? <Tag color="success">Aktif</Tag> : <Tag>Pasif</Tag>),
          },
          {
            title: 'İşlemler',
            render: (_: unknown, record: Customer) => (
              <Space>
                <Link to={`/customers/${record.id}`}>Detay</Link>
                <Link to={`/customers/${record.id}/edit`}>Düzenle</Link>
                <Popconfirm
                  title="Müşteriyi silmek istediğinize emin misiniz?"
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
