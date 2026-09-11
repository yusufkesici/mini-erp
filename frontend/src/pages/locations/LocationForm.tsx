import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Space, Switch } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { locationsApi } from '../../api/locations';
import { BarcodeLabel } from '../../components/common/BarcodeLabel';
import { WarehouseSelect } from '../../components/common/WarehouseSelect';
import { ApiError } from '../../lib/apiClient';
import { generateLocationCode } from '../../lib/barcode';
import type { CreateLocationInput } from '../../types/location';

export default function LocationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateLocationInput>();
  const codeValue = Form.useWatch('code', form);
  const nameValue = Form.useWatch('name', form);

  const { data, isLoading } = useQuery({
    queryKey: ['locations', id],
    queryFn: () => locationsApi.get(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue({
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      isActive: data.isActive,
    });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: CreateLocationInput) =>
      isEdit ? locationsApi.update(id as string, values) : locationsApi.create(values),
    onSuccess: () => {
      message.success(isEdit ? 'Konum güncellendi.' : 'Konum oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['locations'] });
      navigate('/locations');
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title={isEdit ? 'Konumu Düzenle' : 'Yeni Konum'} loading={isEdit && isLoading} style={{ maxWidth: 560 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values: CreateLocationInput) => mutation.mutate(values)}
        initialValues={{ isActive: true }}
      >
        <Form.Item label="Kod (Barkod)" required>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="code"
              noStyle
              rules={[
                { required: true, message: 'Kod zorunludur' },
                { pattern: /^LOC-/, message: 'Konum kodu "LOC-" ile başlamalıdır' },
              ]}
            >
              <Input placeholder="LOC-DPO-1-A1" style={{ flex: 1, minWidth: 0 }} />
            </Form.Item>
            <Button onClick={() => form.setFieldValue('code', generateLocationCode())}>
              Rastgele Üret
            </Button>
          </Space.Compact>
          <BarcodeLabel value={codeValue} title={nameValue} />
        </Form.Item>
        <Form.Item name="name" label="Ad" rules={[{ required: true, message: 'Ad zorunludur' }]}>
          <Input placeholder="A Koridoru 1. Raf" />
        </Form.Item>
        <Form.Item name="warehouseId" label="Depo" rules={[{ required: true, message: 'Depo zorunludur' }]}>
          <WarehouseSelect disabled={isEdit} />
        </Form.Item>
        <Form.Item name="isActive" label="Aktif" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/locations')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
