import { IsIn, IsString } from 'class-validator';

export class ResolveScanDto {
  @IsString()
  code!: string;

  // Tarama ekranının o an hangi tip barkod beklediği — durum makinesindeki adıma göre
  // (RAF_BEKLENIYOR -> LOCATION, ÜRÜN_BEKLENIYOR -> PRODUCT) frontend tarafından gönderilir.
  @IsIn(['LOCATION', 'PRODUCT'])
  expect!: 'LOCATION' | 'PRODUCT';
}
