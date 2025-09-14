export interface Order {
    SHOP_DOMAIN: string;
    ORDER_ID: string;
    ORDER_NAME?: string;
    CREATED_AT?: string;
    UPDATED_AT?: string;
    FULFILLMENT_STATUS?: string;
    TAGS?: string;
    TOTAL?: number | string;
    CURRENCY?: string;
    CUSTOMER_EMAIL?: string;
  }
  
  export interface OrdersResponse {
    ok: boolean;
    items: Order[];
  }
  