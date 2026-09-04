import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Descriptions, Form, InputNumber, Space } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { stockApi } from '../../api/stock';
import { ProductSelect } from '../../components/common/ProductSelect';
import { WarehouseSelect } from '../../components/common/WarehouseSelect';
import { ApiError } from '../../lib/apiClient';
import { formatQty, parseDecimal } from '../../lib/decimal';
import type { CreateStockInput } from '../../types/stock';

export default function StockAdjustForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateStockInput>();

  const { data, isLoading } = useQuery({
    queryKey: ['stock', id],
    queryFn: () => stockApi.get(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue({
      productId: data.productId,
      warehouseId: data.warehouseId,
      minStockLevel: data.minStockLevel ? parseDecimal(data.minStockLevel) : undefined,
    });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: CreateStockInput) =>
      isEdit
        ? stockApi.update(id as string, { minStockLevel: values.minStockLevel })
        : stockApi.create(values),
    onSuccess: () => {
      message.success(isEdit ? 'Stok kaydı güncellendi.' : 'Stok kaydı oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      navigate('/stock');
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title={isEdit ? 'Stok Kaydını Düzenle' : 'Yeni Stok Kaydı'} loading={isEdit && isLoading} style={{ maxWidth: 560 }}>
      {isEdit && data && (
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Ürün">
            {data.product.code} — {data.product.name}
          </Descriptions.Item>
          <Descriptions.Item label="Depo">
            {data.warehouse.code} — {data.warehouse.name}
          </Descriptions.Item>
          <Descriptions.Item label="Mevcut Miktar">{formatQty(data.quantity)}</Descriptions.Item>
        </Descriptions>
      )}
      <Form form={form} layout="vertical" onFinish={(values: CreateStockInput) => mutation.mutate(values)}>
        {!isEdit && (
          <>
            <Form.Item name="productId" label="Ürün" rules={[{ required: true, message: 'Ürün zorunludur' }]}>
              <ProductSelect />
            </Form.Item>
            <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Depo zorunludur' }]}>
              <WarehouseSelect />
            </Form.Item>
          </>
        )}
        {!isEdit && (
          <Form.Item name="quantity" label="Başlangıç Miktarı">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        )}
        <Form.Item name="minStockLevel" label="Minimum Stok Seviyesi">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/stock')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
