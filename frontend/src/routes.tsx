import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Dashboard from './pages/dashboard/Dashboard';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import WarehouseList from './pages/warehouses/WarehouseList';
import WarehouseForm from './pages/warehouses/WarehouseForm';
import StockList from './pages/stock/StockList';
import StockAdjustForm from './pages/stock/StockAdjustForm';
import StockMovementList from './pages/stockMovements/StockMovementList';
import StockMovementForm from './pages/stockMovements/StockMovementForm';
import BomList from './pages/bom/BomList';
import BomForm from './pages/bom/BomForm';
import BomDetail from './pages/bom/BomDetail';
import ProductionOrderList from './pages/productionOrders/ProductionOrderList';
import ProductionOrderForm from './pages/productionOrders/ProductionOrderForm';
import ProductionOrderDetail from './pages/productionOrders/ProductionOrderDetail';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import CustomerDetail from './pages/customers/CustomerDetail';
import SalesOrderList from './pages/salesOrders/SalesOrderList';
import SalesOrderForm from './pages/salesOrders/SalesOrderForm';
import SalesOrderDetail from './pages/salesOrders/SalesOrderDetail';
import AccountingList from './pages/accounting/AccountingList';
import AccountingForm from './pages/accounting/AccountingForm';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, Component: Dashboard },
      { path: 'products', Component: ProductList },
      { path: 'products/new', Component: ProductForm },
      { path: 'products/:id/edit', Component: ProductForm },
      { path: 'warehouses', Component: WarehouseList },
      { path: 'warehouses/new', Component: WarehouseForm },
      { path: 'warehouses/:id/edit', Component: WarehouseForm },
      { path: 'stock', Component: StockList },
      { path: 'stock/new', Component: StockAdjustForm },
      { path: 'stock/:id/edit', Component: StockAdjustForm },
      { path: 'stock-movements', Component: StockMovementList },
      { path: 'stock-movements/new', Component: StockMovementForm },
      { path: 'bom', Component: BomList },
      { path: 'bom/new', Component: BomForm },
      { path: 'bom/:id', Component: BomDetail },
      { path: 'bom/:id/edit', Component: BomForm },
      { path: 'production-orders', Component: ProductionOrderList },
      { path: 'production-orders/new', Component: ProductionOrderForm },
      { path: 'production-orders/:id', Component: ProductionOrderDetail },
      { path: 'customers', Component: CustomerList },
      { path: 'customers/new', Component: CustomerForm },
      { path: 'customers/:id', Component: CustomerDetail },
      { path: 'customers/:id/edit', Component: CustomerForm },
      { path: 'sales-orders', Component: SalesOrderList },
      { path: 'sales-orders/new', Component: SalesOrderForm },
      { path: 'sales-orders/:id', Component: SalesOrderDetail },
      { path: 'accounting', Component: AccountingList },
      { path: 'accounting/new', Component: AccountingForm },
    ],
  },
]);
