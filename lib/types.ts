export type DiscountId =
  | "d1"
  | "d2"
  | "d3"
  | "rrp"
  | "private-5"
  | "private-10";

export type PriceMode =
  | "policy"
  | "wholesale"
  | "rrp"
  | "moc"
  | "prepay"
  | "deferral";

export type PriceOrigin = "public-retail" | "demo-snapshot";

export type Segment =
  | "partner"
  | "installer"
  | "trader"
  | "private"
  | "management";

export type DealStage =
  | "new"
  | "qualify"
  | "offer"
  | "negotiate"
  | "invoice"
  | "won"
  | "lost";

export type OfferStatus = "draft" | "sent" | "accepted" | "rejected";

export type TaskKind = "call" | "email" | "meeting" | "offer" | "visit";

export type Product = {
  id: string;
  article: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  unit: "шт";
  rrp: number | null;
  wholesale: number | null;
  moc: number | null;
  distributorPrepay: number | null;
  distributorDeferral: number | null;
  powerKw: number | null;
  dnMm: number | null;
  description: string;
  specs: string;
  notes: string;
  priceDate: string | null;
  priceSource: string;
  priceOrigin: PriceOrigin;
  sourceLocation: string;
  order: number;
};

export type Company = {
  id: string;
  name: string;
  city: string;
  inn: string;
  phone: string;
  email: string;
  segment: Segment;
  note: string;
  demo: boolean;
};

export type Contact = {
  id: string;
  companyId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  demo: boolean;
};

export type Deal = {
  id: string;
  companyId: string;
  contactId: string | null;
  title: string;
  stage: DealStage;
  amount: number;
  nextStep: string;
  updatedAt: string;
};

export type OfferLine = {
  id: string;
  productId: string;
  quantity: number;
  priceMode: PriceMode;
  article: string;
  name: string;
  unit: string;
  unitPrice: number | null;
  priceLabel: string;
  priceOrigin: PriceOrigin;
};

export type Offer = {
  id: string;
  number: string;
  companyId: string;
  contactId: string | null;
  dealId: string | null;
  discountId: DiscountId;
  status: OfferStatus;
  issuedOn: string;
  validDays: number;
  note: string;
  lines: OfferLine[];
};

export type Task = {
  id: string;
  title: string;
  kind: TaskKind;
  due: string;
  done: boolean;
  companyId: string | null;
  dealId: string | null;
  contactId: string | null;
  leadId: string | null;
};

export type LeadGroup = "new" | "no-answer" | "reschedule" | "feedback" | "warm";

export type Seller = {
  id: string;
  name: string;
  role: string;
  city: string;
  phone: string;
  demo: boolean;
};

export type LeadPhone = {
  id: string;
  number: string;
  owner: string;
};

export type Lead = {
  id: string;
  sellerId: string;
  name: string;
  phones: LeadPhone[];
  companyName: string;
  city: string;
  email: string;
  segment: Segment;
  interest: string;
  group: LeadGroup;
  website: string;
  mapUrl: string;
  createdAt: string;
  demo: boolean;
};

export type SellerNote = {
  id: string;
  sellerId: string;
  leadId: string;
  text: string;
  createdAt: string;
};

export type CrmData = {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  offers: Offer[];
  tasks: Task[];
  sellers: Seller[];
  leads: Lead[];
  sellerNotes: SellerNote[];
};
