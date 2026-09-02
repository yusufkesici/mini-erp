import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, DatePicker, Form, InputNumber, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { bomApi } from '../../api/bom';
import { productionOrdersApi } from '../../api/productionOrders';
import { ProductSelect } from '../../components/common/ProductSelect';
import { WarehouseSelect } from '../../components/common/WarehouseSelect';
import { ApiError } from '../../lib/apiClient';
import type { CreateProductionOrderInput } from '../../types/productionOrder';

interface FormValues {
  productId: string;
  bomId?: string;
  warehouseId: string;
  plannedQuantity: number;
  plannedStartDate?: Dayjs;
  plannedEndDate?: Dayjs;
}

export default function ProductionOrderForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const productId = Form.useWatch('productId', form);

  const { data: bomList } = useQuery({ queryKey: ['bom'], queryFn: bomApi.list });
  const bomOptions = (bomList ?? [])
    .filter((b) => b.isActive && (!productId || b.productId === productId))
    .map((b) => ({ value: b.id, label: `${b.name ?? 'Reçete'} (${b.product.code})` }));

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input: CreateProductionOrderInput = {
        productId: values.productId,
        bomId: values.bomId,
        warehouseId: values.warehouseId,
        plannedQuantity: values.plannedQuantity,
        plannedStartDate: values.plannedStartDate?.toISOString(),
        plannedEndDate: values.plannedEndDate?.toISOString(),
      };
      return productionOrdersApi.create(input);
    },
    onSuccess: (order) => {
      message.success('Üretim emri oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      navigate(`/production-orders/${order.id}`);
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title="Yeni Üretim Emri" style={{ maxWidth: 640 }}>
      <Form form={form} layout="vertical" onFinish={(values: FormValues) => mutation.mutate(values)}>
        <Form.Item name="productId" label="Ürün" rules={[{ required: true, message: 'Ürün zorunludur' }]}>
          <ProductSelect />
        </Form.Item>
        <Form.Item
          name="bomId"
          label="Reçete (BOM)"
          help="Boş bırakılırsa ürünün aktif reçetesi otomatik kullanılır."
        >
          <Select allowClear options={bomOptions} placeholder="Otomatik (aktif reçete)" />
        </Form.Item>
        <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Depo zorunludur' }]}>
          <WarehouseSelect />
        </Form.Item>
        <Form.Item
          name="plannedQuantity"
          label="Planlanan Miktar"
          rules={[{ required: true, message: 'Planlanan miktar zorunludur' }]}
        >
          <InputNumber min={0.0001} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="plannedStartDate" label="Planlanan Başlangıç">
          <DatePicker style={{ width: '100%' }} showTime />
        </Form.Item>
        <Form.Item name="plannedEndDate" label="Planlanan Bitiş">
          <DatePicker style={{ width: '100%' }} showTime />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/production-orders')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
