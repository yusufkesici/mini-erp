import { useQuery } from '@tanstack/react-query';
import { Select, type SelectProps } from 'antd';
import { productsApi } from '../../api/products';

export function ProductSelect(props: SelectProps) {
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: productsApi.list });
  const options = (data ?? [])
    .filter((p) => p.isActive)
    .map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }));

  return (
    <Select
      showSearch
      placeholder="Ürün seçin"
      loading={isLoading}
      optionFilterProp="label"
      options={options}
      {...props}
    />
  );
}
