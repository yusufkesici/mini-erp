function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export type ProductType = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD';
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  RAW_MATERIAL: 'Hammadde',
  SEMI_FINISHED: 'Yarı Mamul',
  FINISHED_GOOD: 'Mamul',
};
export const PRODUCT_TYPE_OPTIONS = toOptions(PRODUCT_TYPE_LABELS);

// BOM_AUTO: üretim emirleriyle otomatik tüketilir/üretilir, barkod ekranından taranamaz.
// BARCODE_MANUAL: yalnızca barkod taramasıyla elle girilir/çıkarılır, BOM'da kullanılamaz.
export type TrackingType = 'BOM_AUTO' | 'BARCODE_MANUAL';
export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  BOM_AUTO: 'Otomatik (Üretim Emri)',
  BARCODE_MANUAL: 'Manuel (Barkod Taraması)',
};
export const TRACKING_TYPE_OPTIONS = toOptions(TRACKING_TYPE_LABELS);

export type UnitOfMeasure = 'PIECE' | 'KG' | 'GRAM' | 'LITER' | 'METER' | 'BOX' | 'PACKAGE';
export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  PIECE: 'Adet',
  KG: 'Kilogram',
  GRAM: 'Gram',
  LITER: 'Litre',
  METER: 'Metre',
  BOX: 'Kutu',
  PACKAGE: 'Paket',
};
export const UNIT_OF_MEASURE_OPTIONS = toOptions(UNIT_OF_MEASURE_LABELS);

export type ProductionOrderStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  PLANNED: 'Planlandı',
  IN_PROGRESS: 'Devam Ediyor',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal Edildi',
};
export const PRODUCTION_ORDER_STATUS_OPTIONS = toOptions(PRODUCTION_ORDER_STATUS_LABELS);
export const PRODUCTION_ORDER_STATUS_COLORS: Record<ProductionOrderStatus, string> = {
  PLANNED: 'default',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

// Backend'deki durum makinesiyle birebir eşleşir (bkz. production-orders.service.ts
// ALLOWED_STATUS_TRANSITIONS). COMPLETED -> IN_PROGRESS yeniden açma geçişini de içerir:
// erken/yanlışlıkla tamamlandı işaretlenmiş bir emirde eksik üretim bildirimi yapılabilsin diye.
export const PRODUCTION_ORDER_STATUS_TRANSITIONS: Record<ProductionOrderStatus, ProductionOrderStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['IN_PROGRESS'],
  CANCELLED: [],
};

export type AccountingEntryType = 'INCOME' | 'EXPENSE';
export const ACCOUNTING_ENTRY_TYPE_LABELS: Record<AccountingEntryType, string> = {
  INCOME: 'Gelir',
  EXPENSE: 'Gider',
};
export const ACCOUNTING_ENTRY_TYPE_OPTIONS = toOptions(ACCOUNTING_ENTRY_TYPE_LABELS);

export type SalesOrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal Edildi',
};
export const SALES_ORDER_STATUS_OPTIONS = toOptions(SALES_ORDER_STATUS_LABELS);
export const SALES_ORDER_STATUS_COLORS: Record<SalesOrderStatus, string> = {
  PENDING: 'default',
  CONFIRMED: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};
export const SALES_ORDER_ITEMS_EDITABLE: SalesOrderStatus[] = ['PENDING', 'CONFIRMED'];

// Backend'deki durum makinesiyle birebir eşleşir (bkz. sales-orders.service.ts ALLOWED_STATUS_TRANSITIONS)
export const SALES_ORDER_STATUS_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SALES_OUT'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_CONSUME_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'BARCODE_IN'
  | 'BARCODE_OUT';
export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  PURCHASE_IN: 'Satın Alma Girişi',
  SALES_OUT: 'Satış Çıkışı',
  PRODUCTION_IN: 'Üretim Girişi',
  PRODUCTION_CONSUME_OUT: 'Üretim Tüketimi',
  ADJUSTMENT_IN: 'Düzeltme Girişi',
  ADJUSTMENT_OUT: 'Düzeltme Çıkışı',
  BARCODE_IN: 'Barkod ile Giriş',
  BARCODE_OUT: 'Barkod ile Çıkış',
};
export const STOCK_MOVEMENT_TYPE_OPTIONS = toOptions(STOCK_MOVEMENT_TYPE_LABELS);
export const STOCK_MOVEMENT_IN_TYPES: StockMovementType[] = [
  'PURCHASE_IN',
  'PRODUCTION_IN',
  'ADJUSTMENT_IN',
  'BARCODE_IN',
];
