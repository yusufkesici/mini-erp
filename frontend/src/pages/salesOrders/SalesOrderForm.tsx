import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Space, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { salesOrdersApi } from '../../api/salesOrders';
import { CustomerSelect } from '../../components/common/CustomerSelect';
import { ProductSelect } from '../../components/common/ProductSelect';
import { WarehouseSelect } from '../../components/common/WarehouseSelect';
import { ApiError } from '../../lib/apiClient';
import type { CreateSalesOrderInput } from '../../types/salesOrder';

interface FormValues {
  customerId: string;
  warehouseId: string;
  orderDate?: Dayjs;
  note?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

export default function SalesOrderForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId') ?? undefined;

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input: CreateSalesOrderInput = {
        customerId: values.customerId,
        warehouseId: values.warehouseId,
        orderDate: values.orderDate?.toISOString(),
        note: values.note,
        items: values.items,
      };
      return salesOrdersApi.create(input);
    },
    onSuccess: (order) => {
      message.success('Sipariş oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      navigate(`/sales-orders/${order.id}`);
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title="Yeni Satış Siparişi" style={{ maxWidth: 800 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values: FormValues) => mutation.mutate(values)}
        initialValues={{ customerId, items: [{}] }}
      >
        <Form.Item name="customerId" label="Müşteri" rules={[{ required: true, message: 'Müşteri zorunludur' }]}>
          <CustomerSelect />
        </Form.Item>
        <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Depo zorunludur' }]}>
          <WarehouseSelect />
        </Form.Item>
        <Form.Item name="orderDate" label="Sipariş Tarihi">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="note" label="Not">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Typography.Title level={5}>Kalemler</Typography.Title>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    name={[field.name, 'productId']}
                    rules={[{ required: true, message: 'Ürün zorunludur' }]}
                    style={{ width: 300, marginBottom: 0 }}
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
                  <Form.Item
                    name={[field.name, 'unitPrice']}
                    rules={[{ required: true, message: 'Birim fiyat zorunludur' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} placeholder="Birim Fiyat" />
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
                  Kalem Ekle
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/sales-orders')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
