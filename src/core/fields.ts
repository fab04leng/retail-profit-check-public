import type { FileKind } from './types';

/**
 * Columns each input file can have, with header names we recognise
 * (English, Bahasa Melayu, 中文). Add more synonyms here; matching is
 * case-, space- and punctuation-insensitive.
 */

export type FieldType = 'text' | 'number' | 'date';

export interface FieldDef {
  key: string;
  type: FieldType;
  /** Required = row is skipped if missing. `oneOf` groups: at least one of the group must be mapped. */
  required?: boolean;
  oneOf?: string;
  synonyms: string[];
  example: [string, string];
}

export const FIELDS: Record<FileKind, FieldDef[]> = {
  sales: [
    { key: 'date', type: 'date', required: true, synonyms: ['date', 'sales date', 'transaction date', 'txn date', 'trans date', 'doc date', 'business date', 'tarikh', 'tarikh jualan', 'tarikh transaksi', '日期', '销售日期', '交易日期'], example: ['02/01/2026', '02/01/2026'] },
    { key: 'receipt', type: 'text', synonyms: ['receipt', 'receipt no', 'receipt number', 'invoice no', 'invoice number', 'bill no', 'doc no', 'document no', 'transaction id', 'transaction no', 'order no', 'order id', 'resit', 'no resit', 'nombor resit', 'no bil', 'bil', '收据', '收据号', '单号', '小票号', '发票号'], example: ['R-000101', 'R-000102'] },
    { key: 'sku', type: 'text', oneOf: 'item', synonyms: ['sku', 'item code', 'product code', 'stock code', 'barcode', 'item no', 'article no', 'plu', 'kod', 'kod item', 'kod produk', 'kod barang', '货号', '商品编码', '产品编码', '编码', '条码'], example: ['SKU-0001', 'SKU-0002'] },
    { key: 'name', type: 'text', oneOf: 'item', synonyms: ['product name', 'item name', 'product', 'item', 'description', 'item description', 'nama', 'nama produk', 'nama barang', 'keterangan', '品名', '商品名称', '产品名称', '名称', '商品'], example: ['Beras Wangi 5kg', 'Kopi O 1kg'] },
    { key: 'category', type: 'text', synonyms: ['category', 'department', 'dept', 'group', 'product group', 'kategori', 'jabatan', '类别', '分类', '品类', '部门'], example: ['Groceries', 'Beverages'] },
    { key: 'qty', type: 'number', required: true, synonyms: ['quantity', 'qty', 'qty sold', 'units', 'units sold', 'kuantiti', 'bilangan', 'unit', '数量', '销售数量', '件数'], example: ['2', '1'] },
    { key: 'unitPrice', type: 'number', oneOf: 'amount', synonyms: ['unit price', 'price', 'selling price', 'retail price', 'harga', 'harga seunit', 'harga unit', 'harga jualan', '单价', '售价', '价格', '零售价'], example: ['28.90', '24.50'] },
    { key: 'discount', type: 'number', synonyms: ['discount', 'disc', 'discount amount', 'diskaun', 'potongan', '折扣', '优惠', '折扣金额'], example: ['0', '2.00'] },
    { key: 'total', type: 'number', oneOf: 'amount', synonyms: ['total', 'amount', 'line total', 'net amount', 'net sales', 'net total', 'subtotal', 'sales amount', 'jumlah', 'amaun', 'jumlah bersih', '金额', '总额', '合计', '小计', '销售额'], example: ['57.80', '22.50'] },
    { key: 'outlet', type: 'text', synonyms: ['outlet', 'branch', 'store', 'shop', 'location', 'outlet name', 'cawangan', 'kedai', 'lokasi', '分店', '门店', '店铺', '分行'], example: ['Jelutong', 'Bayan Lepas'] },
  ],
  products: [
    { key: 'sku', type: 'text', oneOf: 'item', synonyms: ['sku', 'item code', 'product code', 'stock code', 'barcode', 'item no', 'plu', 'kod', 'kod item', 'kod produk', 'kod barang', '货号', '商品编码', '产品编码', '编码', '条码'], example: ['SKU-0001', 'SKU-0002'] },
    { key: 'name', type: 'text', oneOf: 'item', synonyms: ['product name', 'item name', 'product', 'item', 'description', 'nama', 'nama produk', 'nama barang', 'keterangan', '品名', '商品名称', '产品名称', '名称'], example: ['Beras Wangi 5kg', 'Kopi O 1kg'] },
    { key: 'category', type: 'text', synonyms: ['category', 'department', 'dept', 'group', 'kategori', 'jabatan', '类别', '分类', '品类', '部门'], example: ['Groceries', 'Beverages'] },
    { key: 'unitCost', type: 'number', required: true, synonyms: ['unit cost', 'cost', 'cost price', 'average cost', 'avg cost', 'purchase price', 'kos', 'kos seunit', 'harga kos', 'harga belian', '成本', '单位成本', '进价', '成本价', '平均成本'], example: ['22.40', '18.10'] },
    { key: 'qtyOnHand', type: 'number', required: true, synonyms: ['quantity on hand', 'qty on hand', 'on hand', 'stock on hand', 'soh', 'stock', 'stock qty', 'balance', 'balance qty', 'closing stock', 'stok', 'baki stok', 'kuantiti stok', '库存', '库存数量', '现有库存', '结存'], example: ['36', '12'] },
    { key: 'lastReceived', type: 'date', synonyms: ['last received', 'last received date', 'last purchase date', 'last grn', 'last grn date', 'received date', 'tarikh terima', 'tarikh terima terakhir', 'tarikh belian terakhir', '最后进货日期', '最近入库', '入库日期', '进货日期'], example: ['15/12/2025', '03/01/2026'] },
  ],
  invoices: [
    { key: 'supplier', type: 'text', required: true, synonyms: ['supplier', 'supplier name', 'vendor', 'vendor name', 'creditor', 'creditor name', 'pembekal', 'nama pembekal', 'pemiutang', '供应商', '供应商名称', '厂商', '供货商'], example: ['Example Supplier A', 'Example Supplier A'] },
    { key: 'invoiceNo', type: 'text', required: true, synonyms: ['invoice no', 'invoice number', 'invoice', 'inv no', 'bill no', 'supplier invoice', 'doc no', 'document no', 'no invois', 'nombor invois', 'invois', '发票号', '发票号码', '发票', '单据号'], example: ['INV-1001', 'INV-1001'] },
    { key: 'date', type: 'date', required: true, synonyms: ['date', 'invoice date', 'doc date', 'tarikh', 'tarikh invois', '日期', '发票日期', '开票日期'], example: ['05/01/2026', '05/01/2026'] },
    { key: 'sku', type: 'text', synonyms: ['sku', 'item code', 'product code', 'stock code', 'barcode', 'kod', 'kod item', 'kod produk', '货号', '商品编码', '编码'], example: ['SKU-0001', 'SKU-0002'] },
    { key: 'description', type: 'text', synonyms: ['description', 'item', 'item description', 'product', 'product name', 'particulars', 'keterangan', 'butiran', 'nama barang', '品名', '描述', '商品名称', '摘要'], example: ['Beras Wangi 5kg', 'Kopi O 1kg'] },
    { key: 'qty', type: 'number', synonyms: ['quantity', 'qty', 'units', 'kuantiti', 'bilangan', '数量'], example: ['20', '10'] },
    { key: 'unitPrice', type: 'number', oneOf: 'amount', synonyms: ['unit price', 'price', 'unit cost', 'cost', 'harga', 'harga seunit', 'harga unit', '单价', '价格', '进价'], example: ['22.40', '18.10'] },
    { key: 'total', type: 'number', oneOf: 'amount', synonyms: ['total', 'amount', 'line total', 'net amount', 'total amount', 'invoice amount', 'jumlah', 'amaun', '金额', '总额', '合计'], example: ['448.00', '181.00'] },
    { key: 'dueDate', type: 'date', synonyms: ['due date', 'payment due', 'due', 'payment due date', 'tarikh akhir', 'tarikh tamat tempoh', 'tarikh matang', 'tarikh bayar', '到期日', '付款期限', '应付日期', '到期日期'], example: ['04/02/2026', '04/02/2026'] },
  ],
  payments: [
    { key: 'date', type: 'date', required: true, synonyms: ['date', 'payment date', 'paid date', 'value date', 'tarikh', 'tarikh bayaran', '日期', '付款日期', '支付日期'], example: ['01/02/2026', '03/02/2026'] },
    { key: 'supplier', type: 'text', required: true, synonyms: ['supplier', 'supplier name', 'vendor', 'payee', 'creditor', 'paid to', 'pembekal', 'penerima', 'nama pembekal', '供应商', '收款人', '收款方'], example: ['Example Supplier A', 'Example Supplier B'] },
    { key: 'amount', type: 'number', required: true, synonyms: ['amount', 'amount paid', 'paid', 'payment', 'payment amount', 'total', 'jumlah', 'amaun', 'bayaran', 'jumlah bayaran', '金额', '付款金额', '支付金额'], example: ['629.00', '1250.00'] },
    { key: 'reference', type: 'text', synonyms: ['reference', 'ref', 'ref no', 'reference no', 'cheque no', 'payment ref', 'memo', 'remarks', 'invoice no', 'rujukan', 'no rujukan', 'catatan', '参考号', '备注', '摘要', '发票号'], example: ['INV-1001', 'INV-2040'] },
  ],
};

export function fieldsFor(kind: FileKind): FieldDef[] {
  return FIELDS[kind];
}

/** Lower-case, drop punctuation and units in brackets, collapse spaces. Keeps CJK. */
export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .toLowerCase()
    .replace(/\((rm|myr|%|units?|pcs)\)/g, ' ')
    .replace(/[._/\\\-#:()[\]{}"'’*?]+/g, ' ')
    .replace(/\bno\b\.?/g, 'no')
    .replace(/\s+/g, ' ')
    .trim();
}
