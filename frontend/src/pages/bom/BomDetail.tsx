import { useQuery } from '@tanstack/react-query';
import { Button, Card, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { bomApi } from '../../api/bom';
import { formatQty } from '../../lib/decimal';
import { UNIT_OF_MEASURE_LABELS } from '../../types/enums';
import type { BomItem } from '../../types/bom';

export default function BomDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['bom', id],
    queryFn: () => bomApi.get(id as string),
  });

  return (
    <Card loading={isLoading} style={{ maxWidth: 800 }}>
      {data && (
        <>
          <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }} wrap>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {data.name ?? 'Reçete'} — {data.product.code}
            </Typography.Title>
            <Link to={`/bom/${data.id}/edit`}>
              <Button>Düzenle</Button>
            </Link>
          </Space>
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Çıktı Ürünü">
              {data.product.code} — {data.product.name}
            </Descriptions.Item>
            <Descriptions.Item label="Çıktı Miktarı">{formatQty(data.outputQuantity)}</Descriptions.Item>
            <Descriptions.Item label="Durum">
              {data.isActive ? <Tag color="success">Aktif</Tag> : <Tag>Pasif</Tag>}
            </Descriptions.Item>
          </Descriptions>
          <Typography.Title level={5}>Bileşenler</Typography.Title>
          <Table<BomItem>
            rowKey="id"
            dataSource={data.items}
            pagination={false}
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'Bileşen',
                render: (_: unknown, item: BomItem) =>
                  item.component ? `${item.component.code} — ${item.component.name}` : item.componentProductId,
              },
              { title: 'Miktar', dataIndex: 'quantity', render: (v: string) => formatQty(v) },
              {
                title: 'Birim',
                render: (_: unknown, item: BomItem) =>
                  item.component ? UNIT_OF_MEASURE_LABELS[item.component.unit] : '—',
              },
            ]}
          />
        </>
      )}
    </Card>
  );
}
