import { useQuery } from '@tanstack/react-query';
import { Select, type SelectProps } from 'antd';
import { warehousesApi } from '../../api/warehouses';

export function WarehouseSelect(props: SelectProps) {
  const { data, isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });
  const options = (data ?? [])
    .filter((w) => w.isActive)
    .map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }));

  return (
    <Select
      showSearch
      placeholder="Depo seçin"
      loading={isLoading}
      optionFilterProp="label"
      options={options}
      {...props}
    />
  );
}
