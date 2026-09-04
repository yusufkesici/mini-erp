import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card, Flex, Form, Input, Typography } from 'antd';
import { getApiKey, registerUnauthorizedHandler, setApiKey } from '../../lib/apiClient';

export function ApiKeyGate({ children }: { children: ReactNode }) {
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));

  useEffect(() => {
    registerUnauthorizedHandler(() => setHasKey(false));
  }, []);

  if (hasKey) {
    return <>{children}</>;
  }

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
      <Card title="Mini-ERP" style={{ width: 360 }}>
        <Typography.Paragraph type="secondary">
          Devam etmek için API anahtarını girin.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          onFinish={(values: { apiKey: string }) => {
            setApiKey(values.apiKey.trim());
            setHasKey(true);
          }}
        >
          <Form.Item name="apiKey" rules={[{ required: true, message: 'API anahtarı zorunludur' }]}>
            <Input.Password placeholder="API anahtarı" autoFocus />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block>
              Devam Et
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Flex>
  );
}
