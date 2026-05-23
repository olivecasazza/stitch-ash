/// <reference types="astro/client" />

interface CartItem {
  id: string;
  name: string;
  size: string;
  price: number;
  qty: number;
  imageSrc?: string;
}

interface Window {
  CartDrawer?: {
    open: () => void;
    close: () => void;
    addItem: (item: CartItem) => void;
  };
}
