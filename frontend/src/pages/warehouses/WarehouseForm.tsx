import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Space, Switch } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { warehousesApi } from '../../api/warehouses';
import { ApiError } from '../../lib/apiClient';
import type { CreateWarehouseInput } from '../../types/warehouse';

export default function WarehouseForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateWarehouseInput>();

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', id],
    queryFn: () => warehousesApi.get(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue({
      code: data.code,
      name: data.name,
      address: data.address ?? undefined,
      isActive: data.isActive,
    });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: CreateWarehouseInput) =>
      isEdit ? warehousesApi.update(id as string, values) : warehousesApi.create(values),
    onSuccess: () => {
      message.success(isEdit ? 'Depo güncellendi.' : 'Depo oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      navigate('/warehouses');
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title={isEdit ? 'Depoyu Düzenle' : 'Yeni Depo'} loading={isEdit && isLoading} style={{ maxWidth: 560 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values: CreateWarehouseInput) => mutation.mutate(values)}
        initialValues={{ isActive: true }}
      >
        <Form.Item name="code" label="Kod" rules={[{ required: true, message: 'Kod zorunludur' }]}>
          <Input placeholder="DPO-1" />
        </Form.Item>
        <Form.Item name="name" label="Ad" rules={[{ required: true, message: 'Ad zorunludur' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Adres">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="isActive" label="Aktif" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/warehouses')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
