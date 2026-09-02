import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../api/accounting';
import { formatMoney } from '../../lib/decimal';
import { ACCOUNTING_ENTRY_TYPE_LABELS } from '../../types/enums';
import type { AccountingEntry } from '../../types/accounting';
import { AccountingSummaryWidget } from './AccountingSummaryWidget';

export default function AccountingList() {
  const { data, isLoading } = useQuery({ queryKey: ['accounting', 'entries'], queryFn: accountingApi.listEntries });

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Muhasebe
        </Typography.Title>
        <Link to="/accounting/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Yeni Kayıt
          </Button>
        </Link>
      </Space>
      <div style={{ marginBottom: 24 }}>
        <AccountingSummaryWidget />
      </div>
      <Table<AccountingEntry>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Tarih', dataIndex: 'entryDate', render: (v: string) => new Date(v).toLocaleDateString('tr-TR') },
          {
            title: 'Tip',
            dataIndex: 'type',
            render: (t: AccountingEntry['type']) => (
              <Tag color={t === 'INCOME' ? 'success' : 'error'}>{ACCOUNTING_ENTRY_TYPE_LABELS[t]}</Tag>
            ),
          },
          { title: 'Kategori', dataIndex: 'category', render: (v: string | null) => v ?? '—' },
          { title: 'Açıklama', dataIndex: 'description', render: (v: string | null) => v ?? '—' },
          { title: 'Tutar', dataIndex: 'amount', render: (v: string) => formatMoney(v) },
        ]}
      />
    </div>
  );
}
