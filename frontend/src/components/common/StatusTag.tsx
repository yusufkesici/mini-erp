import { Tag } from 'antd';

export function StatusTag({ label, color }: { label: string; color: string }) {
  return <Tag color={color}>{label}</Tag>;
}
