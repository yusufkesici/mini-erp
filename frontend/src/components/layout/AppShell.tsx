import {
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BuildOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ScanOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Grid, Layout, Menu, Typography } from 'antd';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Sider, Content, Header } = Layout;
const { useBreakpoint } = Grid;

const items = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Panel</Link> },
  { key: '/products', icon: <AppstoreOutlined />, label: <Link to="/products">Ürünler</Link> },
  { key: '/warehouses', icon: <BankOutlined />, label: <Link to="/warehouses">Depolar</Link> },
  { key: '/locations', icon: <EnvironmentOutlined />, label: <Link to="/locations">Konumlar (Raflar)</Link> },
  { key: '/stock', icon: <DatabaseOutlined />, label: <Link to="/stock">Stok</Link> },
  { key: '/stock-movements', icon: <SwapOutlined />, label: <Link to="/stock-movements">Stok Hareketleri</Link> },
  { key: '/warehouse-scan', icon: <ScanOutlined />, label: <Link to="/warehouse-scan">Depo Tarama</Link> },
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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [collapsed, setCollapsed] = useState(false);

  const selectedKey = items
    .map((i) => i.key)
    .filter((key) => key === '/' ? location.pathname === '/' : location.pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0] ?? '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Menü mobilde açıkken içeriği kararan bir arka plan (backdrop) örter — dışarı
          tıklamak menüyü kapatır, tıpkı bir çekmece (drawer) gibi davranır. */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9 }}
        />
      )}
      <Sider
        width={240}
        breakpoint="lg"
        collapsedWidth={0}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={
          isMobile
            ? { position: 'fixed', insetBlockStart: 0, insetInlineStart: 0, height: '100vh', zIndex: 10 }
            : undefined
        }
      >
        <div style={{ padding: 16, textAlign: 'center' }}>
          <FileTextOutlined style={{ fontSize: 22, color: '#fff' }} />
          <Typography.Text strong style={{ color: '#fff', marginLeft: 8 }}>
            Mini ERP
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={() => isMobile && setCollapsed(true)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            paddingInline: isMobile ? 12 : 24,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }} ellipsis>
            {isMobile ? 'Mini ERP' : 'Mini ERP — Test Arayüzü'}
          </Typography.Title>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
