import {
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BuildOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Sider, Content, Header } = Layout;

const items = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Panel</Link> },
  { key: '/products', icon: <AppstoreOutlined />, label: <Link to="/products">Ürünler</Link> },
  { key: '/warehouses', icon: <BankOutlined />, label: <Link to="/warehouses">Depolar</Link> },
  { key: '/stock', icon: <DatabaseOutlined />, label: <Link to="/stock">Stok</Link> },
  { key: '/stock-movements', icon: <SwapOutlined />, label: <Link to="/stock-movements">Stok Hareketleri</Link> },
  { key: '/bom', icon: <BuildOutlined />, label: <Link to="/bom">Reçeteler (BOM)</Link> },
  {
    key: '/production-orders',
    icon: <BuildOutlined />,
    label: <Link to="/production-orders">Üretim Emirleri</Link>,
  },
  { key: '/customers', icon: <TeamOutlined />, label: <Link to="/customers">Müşteriler</Link> },
  { key: '/sales-orders', icon: <ShoppingCartOutlined />, label: <Link to="/sales-orders">Satış Siparişleri</Link> },
  { key: '/accounting', icon: <BarChartOutlined />, label: <Link to="/accounting">Muhasebe</Link> },
];

export function AppShell() {
  const location = useLocation();
  const selectedKey = items
    .map((i) => i.key)
    .filter((key) => key === '/' ? location.pathname === '/' : location.pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0] ?? '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} breakpoint="lg" collapsible>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <FileTextOutlined style={{ fontSize: 22, color: '#fff' }} />
          <Typography.Text strong style={{ color: '#fff', marginLeft: 8 }}>
            Mini ERP
          </Typography.Text>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', paddingInline: 24, display: 'flex', alignItems: 'center' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Mini ERP — Test Arayüzü
          </Typography.Title>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
