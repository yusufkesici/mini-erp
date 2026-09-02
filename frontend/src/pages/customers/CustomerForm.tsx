import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Space, Switch } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import { ApiError } from '../../lib/apiClient';
import type { CreateCustomerInput } from '../../types/customer';

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateCustomerInput>();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.get(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue({
      code: data.code,
      name: data.name,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      address: data.address ?? undefined,
      isActive: data.isActive,
    });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: CreateCustomerInput) =>
      isEdit ? customersApi.update(id as string, values) : customersApi.create(values),
    onSuccess: () => {
      message.success(isEdit ? 'Müşteri güncellendi.' : 'Müşteri oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title={isEdit ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'} loading={isEdit && isLoading} style={{ maxWidth: 560 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values: CreateCustomerInput) => mutation.mutate(values)}
        initialValues={{ isActive: true }}
      >
        <Form.Item name="code" label="Kod" rules={[{ required: true, message: 'Kod zorunludur' }]}>
          <Input placeholder="MUS-001" />
        </Form.Item>
        <Form.Item name="name" label="Ad" rules={[{ required: true, message: 'Ad zorunludur' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="E-posta" rules={[{ type: 'email', message: 'Geçerli bir e-posta girin' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Telefon">
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
          <Button onClick={() => navigate('/customers')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
