import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import trTR from 'antd/locale/tr_TR';
import { RouterProvider } from 'react-router-dom';
import { ApiKeyGate } from './components/common/ApiKeyGate';
import { queryClient } from './lib/queryClient';
import { router } from './routes';

export default function App() {
  return (
    <ConfigProvider locale={trTR} theme={{ token: { colorPrimary: '#1668dc' } }}>
      <AntdApp>
        <ApiKeyGate>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </ApiKeyGate>
      </AntdApp>
    </ConfigProvider>
  );
}
