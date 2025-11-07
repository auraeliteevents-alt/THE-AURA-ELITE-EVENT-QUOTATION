

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Client {
  name: string;
  phone: string;
}

export interface Quotation {
  company: {
    name: string;
    logoUrl?: string;
    address: string;
    email: string;
    phone: string;
  };
  client: Client;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  items: LineItem[];
  termsAndConditions: string;
  gstRate: number;
  advancePercentage: number;
  authorizedSignature?: string;
  clientSignature?: string;
}