import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, InputNumber, Select, Space } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stockMovementsApi } from '../../api/stockMovements';
import { ProductSelect } from '../../components/common/ProductSelect';
import { WarehouseSelect } from '../../components/common/WarehouseSelect';
import { ApiError } from '../../lib/apiClient';
import { STOCK_MOVEMENT_TYPE_OPTIONS } from '../../types/enums';
import type { CreateStockMovementInput } from '../../types/stockMovement';

export default function StockMovementForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateStockMovementInput>();
  const [searchParams] = useSearchParams();

  const productionOrderId = searchParams.get('productionOrderId') ?? undefined;
  const initialValues: Partial<CreateStockMovementInput> = {
    productId: searchParams.get('productId') ?? undefined,
    warehouseId: searchParams.get('warehouseId') ?? undefined,
    type: (searchParams.get('type') as CreateStockMovementInput['type'] | null) ?? undefined,
  };

  const mutation = useMutation({
    mutationFn: (values: CreateStockMovementInput) =>
      stockMovementsApi.create({ ...values, productionOrderId }),
    onSuccess: () => {
      message.success('Stok hareketi kaydedildi.');
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      if (productionOrderId) {
        void queryClient.invalidateQueries({ queryKey: ['production-orders', productionOrderId] });
        navigate(`/production-orders/${productionOrderId}`);
      } else {
        navigate('/stock-movements');
      }
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title="Yeni Stok Hareketi" style={{ maxWidth: 560 }}>
      <Form form={form} layout="vertical" onFinish={(values: CreateStockMovementInput) => mutation.mutate(values)} initialValues={initialValues}>
        <Form.Item name="productId" label="Ürün" rules={[{ required: true, message: 'Ürün zorunludur' }]}>
          <ProductSelect />
        </Form.Item>
        <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Depo zorunludur' }]}>
          <WarehouseSelect />
        </Form.Item>
        <Form.Item name="type" label="Hareket Tipi" rules={[{ required: true, message: 'Hareket tipi zorunludur' }]}>
          <Select options={STOCK_MOVEMENT_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="quantity"
          label="Miktar"
          rules={[{ required: true, message: 'Miktar zorunludur' }]}
        >
          <InputNumber min={0.0001} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="note" label="Not">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate(-1)}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
