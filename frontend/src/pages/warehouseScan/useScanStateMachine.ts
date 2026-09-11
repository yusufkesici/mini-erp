import { useReducer } from 'react';
import type { Location } from '../../types/location';
import type { Product } from '../../types/product';

// Saf state machine: RAF_BEKLENIYOR -> (raf çözümlenince) URUN_BEKLENIYOR -> (ürün
// çözümlenince) MIKTAR_ONAY -> kaydet başarılı -> geri URUN_BEKLENIYOR (raf SABİT kalır,
// böylece aynı rafa art arda farklı ürünler hızlıca taranabilir). Giriş mekanizmasından
// (klavye/HID okuyucu, kamera — bkz. Faz D) tamamen bağımsız: dışarıdan yalnızca
// LOCATION_RESOLVED / PRODUCT_RESOLVED action'ları alır, kod çözümleme (resolve API çağrısı)
// bu hook'un dışında (WarehouseScanPage'de) yapılır.
export type ScanStep = 'RAF_BEKLENIYOR' | 'URUN_BEKLENIYOR' | 'MIKTAR_ONAY';

export interface ScanState {
  step: ScanStep;
  location: Location | null;
  product: Product | null;
  quantity: number;
}

export type ScanAction =
  | { type: 'LOCATION_RESOLVED'; location: Location }
  | { type: 'PRODUCT_RESOLVED'; product: Product }
  | { type: 'SET_QUANTITY'; quantity: number }
  | { type: 'SAVED' }
  | { type: 'CANCEL_PRODUCT' }
  | { type: 'CHANGE_LOCATION' }
  | { type: 'RESET' };

const initialState: ScanState = {
  step: 'RAF_BEKLENIYOR',
  location: null,
  product: null,
  quantity: 1,
};

function reducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'LOCATION_RESOLVED':
      return { step: 'URUN_BEKLENIYOR', location: action.location, product: null, quantity: 1 };
    case 'PRODUCT_RESOLVED':
      return { ...state, step: 'MIKTAR_ONAY', product: action.product, quantity: 1 };
    case 'SET_QUANTITY':
      return { ...state, quantity: action.quantity };
    case 'SAVED':
    case 'CANCEL_PRODUCT':
      // Raf sabit kalır — yalnızca ürün/miktar sıfırlanır (bkz. dosya başı açıklaması)
      return { ...state, step: 'URUN_BEKLENIYOR', product: null, quantity: 1 };
    case 'CHANGE_LOCATION':
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useScanStateMachine() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state, dispatch };
}
