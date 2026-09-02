import { useQuery } from '@tanstack/react-query';
import { Select, type SelectProps } from 'antd';
import { customersApi } from '../../api/customers';

export function CustomerSelect(props: SelectProps) {
  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const options = (data ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }));

  return (
    <Select
      showSearch
      placeholder="Müşteri seçin"
      loading={isLoading}
      optionFilterProp="label"
      options={options}
      {...props}
    />
  );
}
