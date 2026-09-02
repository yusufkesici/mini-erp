import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, InputNumber, Space, Switch, Typography } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bomApi } from '../../api/bom';
import { ProductSelect } from '../../components/common/ProductSelect';
import { ApiError } from '../../lib/apiClient';
import { parseDecimal } from '../../lib/decimal';
import type { CreateBomInput } from '../../types/bom';

export default function BomForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateBomInput>();

  const { data, isLoading } = useQuery({
    queryKey: ['bom', id],
    queryFn: () => bomApi.get(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue({
      productId: data.productId,
      name: data.name ?? undefined,
      outputQuantity: parseDecimal(data.outputQuantity),
      isActive: data.isActive,
      items: data.items.map((item) => ({
        componentProductId: item.componentProductId,
        quantity: parseDecimal(item.quantity),
      })),
    });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: CreateBomInput) => (isEdit ? bomApi.update(id as string, values) : bomApi.create(values)),
    onSuccess: () => {
      message.success(isEdit ? 'Reçete güncellendi.' : 'Reçete oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['bom'] });
      navigate('/bom');
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title={isEdit ? 'Reçeteyi Düzenle' : 'Yeni Reçete'} loading={isEdit && isLoading} style={{ maxWidth: 720 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values: CreateBomInput) => mutation.mutate(values)}
        initialValues={{ outputQuantity: 1, isActive: true, items: [{}] }}
      >
        <Form.Item name="productId" label="Çıktı Ürünü" rules={[{ required: true, message: 'Ürün zorunludur' }]}>
          <ProductSelect />
        </Form.Item>
        <Form.Item name="name" label="Reçete Adı">
          <Input />
        </Form.Item>
        <Form.Item name="outputQuantity" label="Çıktı Miktarı">
          <InputNumber min={0.0001} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="isActive" label="Aktif" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Typography.Title level={5}>Bileşenler</Typography.Title>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    name={[field.name, 'componentProductId']}
                    rules={[{ required: true, message: 'Bileşen zorunludur' }]}
                    style={{ width: 320, marginBottom: 0 }}
                  >
                    <ProductSelect />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'quantity']}
                    rules={[{ required: true, message: 'Miktar zorunludur' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0.0001} placeholder="Miktar" />
                  </Form.Item>
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    disabled={fields.length <= 1}
                    onClick={() => remove(field.name)}
                  />
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  Bileşen Ekle
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/bom')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
