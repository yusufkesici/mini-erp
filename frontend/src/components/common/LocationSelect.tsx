import { useQuery } from '@tanstack/react-query';
import { Select, type SelectProps } from 'antd';
import { locationsApi } from '../../api/locations';

export function LocationSelect(props: SelectProps) {
  const { data, isLoading } = useQuery({ queryKey: ['locations'], queryFn: locationsApi.list });
  const options = (data ?? [])
    .filter((l) => l.isActive)
    .map((l) => ({ value: l.id, label: `${l.code} — ${l.name} (${l.warehouse.code})` }));

  return (
    <Select
      showSearch
      placeholder="Konum (raf) seçin"
      loading={isLoading}
      optionFilterProp="label"
      options={options}
      {...props}
    />
  );
}
