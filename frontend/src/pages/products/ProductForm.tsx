import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, InputNumber, Select, Space, Switch } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productsApi } from '../../api/products';
import { BarcodeLabel } from '../../components/common/BarcodeLabel';
import { ApiError } from '../../lib/apiClient';
import { generateProductBarcode } from '../../lib/barcode';
import { parseDecimal } from '../../lib/decimal';
import { PRODUCT_TYPE_OPTIONS, TRACKING_TYPE_OPTIONS, UNIT_OF_MEASURE_OPTIONS } from '../../types/enums';
import type { CreateProductInput } from '../../types/product';

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateProductInput>();
  const barcodeValue = Form.useWatch('barcode', form);
  const codeValue = Form.useWatch('code', form);

  const { data, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue({
      code: data.code,
      barcode: data.barcode ?? undefined,
      name: data.name,
      description: data.description ?? undefined,
      type: data.type,
      unit: data.unit,
      trackingType: data.trackingType,
      costPrice: data.costPrice ? parseDecimal(data.costPrice) : undefined,
      salePrice: data.salePrice ? parseDecimal(data.salePrice) : undefined,
      isActive: data.isActive,
    });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: CreateProductInput) =>
      isEdit ? productsApi.update(id as string, values) : productsApi.create(values),
    onSuccess: () => {
      message.success(isEdit ? 'Ürün güncellendi.' : 'Ürün oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title={isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün'} loading={isEdit && isLoading} style={{ maxWidth: 640 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values: CreateProductInput) => mutation.mutate(values)}
        initialValues={{ unit: 'PIECE', isActive: true, trackingType: 'BOM_AUTO' }}
      >
        <Form.Item name="code" label="Kod" rules={[{ required: true, message: 'Kod zorunludur' }]}>
          <Input placeholder="SKU-001" />
        </Form.Item>
        <Form.Item name="name" label="Ad" rules={[{ required: true, message: 'Ad zorunludur' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Barkod">
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="barcode" noStyle>
              <Input style={{ flex: 1, minWidth: 0 }} />
            </Form.Item>
            <Button onClick={() => form.setFieldValue('barcode', generateProductBarcode())}>
              Rastgele Üret
            </Button>
          </Space.Compact>
          <BarcodeLabel value={barcodeValue} title={codeValue} />
        </Form.Item>
        <Form.Item name="description" label="Açıklama">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="type" label="Ürün Türü" rules={[{ required: true, message: 'Ürün türü zorunludur' }]}>
          <Select options={PRODUCT_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="unit" label="Birim">
          <Select options={UNIT_OF_MEASURE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="trackingType"
          label="Stok Takip Yöntemi"
          rules={[{ required: true, message: 'Stok takip yöntemi zorunludur' }]}
          tooltip="Otomatik: yalnızca üretim emirleriyle tüketilir/üretilir, BOM'da kullanılabilir. Manuel: yalnızca barkod taramasıyla depoya girer/çıkar, BOM'da kullanılamaz."
        >
          <Select options={TRACKING_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="costPrice" label="Maliyet Fiyatı">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="salePrice" label="Satış Fiyatı">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="isActive" label="Aktif" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/products')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
