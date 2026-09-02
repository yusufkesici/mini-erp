import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { accountingApi } from '../../api/accounting';
import { ApiError } from '../../lib/apiClient';
import { ACCOUNTING_ENTRY_TYPE_OPTIONS } from '../../types/enums';
import type { CreateAccountingEntryInput } from '../../types/accounting';

interface FormValues {
  type: CreateAccountingEntryInput['type'];
  amount: number;
  category?: string;
  description?: string;
  entryDate?: Dayjs;
}

export default function AccountingForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      accountingApi.createEntry({
        type: values.type,
        amount: values.amount,
        category: values.category,
        description: values.description,
        entryDate: values.entryDate?.toISOString(),
      }),
    onSuccess: () => {
      message.success('Kayıt oluşturuldu.');
      void queryClient.invalidateQueries({ queryKey: ['accounting'] });
      navigate('/accounting');
    },
    onError: (err: unknown) => message.error(err instanceof ApiError ? err.message : 'Bir hata oluştu.'),
  });

  return (
    <Card title="Yeni Muhasebe Kaydı" style={{ maxWidth: 560 }}>
      <Form form={form} layout="vertical" onFinish={(values: FormValues) => mutation.mutate(values)}>
        <Form.Item name="type" label="Tip" rules={[{ required: true, message: 'Tip zorunludur' }]}>
          <Select options={ACCOUNTING_ENTRY_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="amount" label="Tutar" rules={[{ required: true, message: 'Tutar zorunludur' }]}>
          <InputNumber min={0.01} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="category" label="Kategori">
          <Input placeholder="Satış, Kira, Maaş..." />
        </Form.Item>
        <Form.Item name="description" label="Açıklama">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="entryDate" label="Tarih">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Kaydet
          </Button>
          <Button onClick={() => navigate('/accounting')}>Vazgeç</Button>
        </Space>
      </Form>
    </Card>
  );
}
