import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic } from 'antd';
import { accountingApi } from '../../api/accounting';
import { parseDecimal } from '../../lib/decimal';

export function AccountingSummaryWidget() {
  const { data, isLoading } = useQuery({ queryKey: ['accounting', 'summary'], queryFn: accountingApi.getSummary });

  return (
    <Row gutter={16}>
      <Col span={8}>
        <Card loading={isLoading}>
          <Statistic
            title="Toplam Gelir"
            value={data ? parseDecimal(data.totalIncome) : 0}
            precision={2}
            suffix="₺"
            styles={{ content: { color: '#3f8600' } }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card loading={isLoading}>
          <Statistic
            title="Toplam Gider"
            value={data ? parseDecimal(data.totalExpense) : 0}
            precision={2}
            suffix="₺"
            styles={{ content: { color: '#cf1322' } }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card loading={isLoading}>
          <Statistic
            title="Bakiye"
            value={data ? parseDecimal(data.balance) : 0}
            precision={2}
            suffix="₺"
            styles={{ content: { color: data && parseDecimal(data.balance) < 0 ? '#cf1322' : '#3f8600' } }}
          />
        </Card>
      </Col>
    </Row>
  );
}
