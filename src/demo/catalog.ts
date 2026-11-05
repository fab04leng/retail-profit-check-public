/**
 * Invented product catalogue and suppliers for the fictional demo shop.
 * Product names are generic Malaysian grocery descriptions (no brands).
 * Supplier names are coined words chosen to avoid matching real businesses.
 */

export type MarginBand = 'staple' | 'normal' | 'high';
export type Season = 'cny' | 'raya' | 'yearend2025' | 'yearend2026';

export interface BaseItem {
  name: string;
  category: string;
  supplier: number; // index into SUPPLIERS
  /** Unit cost in RM of the first variant. */
  cost: number;
  band: MarginBand;
  /** Relative selling frequency 1–10. */
  pop: number;
  variants: [suffix: string, costFactor: number][];
  season?: Season;
}

export const SHOP_NAME = 'Pinangria Mart (fictional demo shop)';
export const OUTLETS = ['Jelutong', 'Bayan Lepas'] as const;

export const SUPPLIERS: { name: string; terms: number; prefix: string; style: 0 | 1 | 2 | 3 }[] = [
  { name: 'Padiwangi Grains Supply', terms: 30, prefix: 'PW', style: 0 },
  { name: 'Gandumas Flour & Sugar Trading', terms: 30, prefix: 'GM', style: 1 },
  { name: 'Sawitara Oils Distribution', terms: 30, prefix: 'SO', style: 0 },
  { name: 'Rempahku Spice House', terms: 45, prefix: 'RK', style: 2 },
  { name: 'Kicapina Sauces Agency', terms: 30, prefix: 'KS', style: 3 },
  { name: 'Tinmerah Canned Foods', terms: 30, prefix: 'TM', style: 0 },
  { name: 'Mikuning Noodle Supply', terms: 14, prefix: 'MK', style: 1 },
  { name: 'Kopisenja Beverage Agency', terms: 30, prefix: 'KB', style: 0 },
  { name: 'Airlembah Drinks Distribution', terms: 30, prefix: 'AL', style: 3 },
  { name: 'Susumurni Dairy Supply', terms: 14, prefix: 'SM', style: 2 },
  { name: 'Snekria Snacks Trading', terms: 30, prefix: 'SN', style: 0 },
  { name: 'Biskutera Biscuit Agency', terms: 45, prefix: 'BE', style: 1 },
  { name: 'Bekuria Frozen Foods', terms: 14, prefix: 'BF', style: 0 },
  { name: 'Rotimas Bakery Supply', terms: 14, prefix: 'RM', style: 2 },
  { name: 'Bersihana Household Supply', terms: 45, prefix: 'BH', style: 0 },
  { name: 'Wangisari Personal Care', terms: 60, prefix: 'WS', style: 3 },
  { name: 'Bayimesra Baby Care Agency', terms: 30, prefix: 'BM', style: 1 },
  { name: 'Kuihraya Festive Goods', terms: 30, prefix: 'KR', style: 0 },
  { name: 'Tahunbaru Festive Trading', terms: 30, prefix: 'TB', style: 2 },
  { name: 'Hamperia Gift Supply', terms: 30, prefix: 'HG', style: 0 },
  { name: 'Telurmas Egg Supply', terms: 14, prefix: 'TE', style: 1 },
  { name: 'Bilisora Dry Seafood', terms: 30, prefix: 'BS', style: 0 },
  { name: 'Kertasina Paper Products', terms: 45, prefix: 'KP', style: 3 },
  { name: 'Sihatora Health Supply', terms: 60, prefix: 'SH', style: 0 },
  { name: 'Alatria Kitchenware', terms: 60, prefix: 'AK', style: 2 },
  { name: 'Lampuria Electrical Sundries', terms: 60, prefix: 'LE', style: 0 },
  { name: 'Tulisana Stationery', terms: 45, prefix: 'TS', style: 1 },
  { name: 'Haiwania Pet Supplies', terms: 30, prefix: 'HP', style: 0 },
  { name: 'Kacangora Nuts & Dried Fruit', terms: 30, prefix: 'KN', style: 3 },
  { name: 'Kristalis Chilled Drinks', terms: 14, prefix: 'KC', style: 0 },
];

const S = (n: string) => SUPPLIERS.findIndex((s) => s.name.startsWith(n));

export const BASE_ITEMS: BaseItem[] = [
  // Rice & Grains — staples, thin margins
  { name: 'Beras Wangi', category: 'Rice & Grains', supplier: S('Padiwangi'), cost: 16.5, band: 'staple', pop: 9, variants: [['5kg', 1], ['10kg', 1.95]] },
  { name: 'Beras Putih Tempatan', category: 'Rice & Grains', supplier: S('Padiwangi'), cost: 13.2, band: 'staple', pop: 8, variants: [['5kg', 1], ['10kg', 1.95]] },
  { name: 'Beras Basmathi', category: 'Rice & Grains', supplier: S('Padiwangi'), cost: 11.8, band: 'normal', pop: 4, variants: [['1kg', 1], ['2kg', 1.9], ['5kg', 4.6]] },
  { name: 'Beras Pulut', category: 'Rice & Grains', supplier: S('Padiwangi'), cost: 4.9, band: 'normal', pop: 3, variants: [['1kg', 1], ['2kg', 1.9]] },
  { name: 'Oat Gulung', category: 'Rice & Grains', supplier: S('Padiwangi'), cost: 5.6, band: 'normal', pop: 4, variants: [['500g', 1], ['1kg', 1.85]] },
  // Flour, sugar, oil — staples
  { name: 'Gula Pasir Halus', category: 'Sugar, Flour & Oil', supplier: S('Gandumas'), cost: 2.75, band: 'staple', pop: 9, variants: [['1kg', 1], ['2kg', 1.98]] },
  { name: 'Tepung Gandum Serbaguna', category: 'Sugar, Flour & Oil', supplier: S('Gandumas'), cost: 2.3, band: 'staple', pop: 7, variants: [['1kg', 1], ['2kg', 1.95]] },
  { name: 'Tepung Beras', category: 'Sugar, Flour & Oil', supplier: S('Gandumas'), cost: 1.9, band: 'normal', pop: 4, variants: [['500g', 1], ['1kg', 1.9]] },
  { name: 'Tepung Jagung', category: 'Sugar, Flour & Oil', supplier: S('Gandumas'), cost: 2.1, band: 'normal', pop: 3, variants: [['400g', 1]] },
  { name: 'Gula Perang', category: 'Sugar, Flour & Oil', supplier: S('Gandumas'), cost: 3.4, band: 'normal', pop: 3, variants: [['1kg', 1]] },
  { name: 'Minyak Masak Sawit', category: 'Sugar, Flour & Oil', supplier: S('Sawitara'), cost: 6.9, band: 'staple', pop: 9, variants: [['1kg', 1], ['2kg', 1.95], ['5kg', 4.7]] },
  { name: 'Minyak Bijan', category: 'Sugar, Flour & Oil', supplier: S('Sawitara'), cost: 7.2, band: 'high', pop: 3, variants: [['320ml', 1]] },
  { name: 'Minyak Zaitun', category: 'Sugar, Flour & Oil', supplier: S('Sawitara'), cost: 18.5, band: 'normal', pop: 2, variants: [['500ml', 1], ['1L', 1.9]] },
  { name: 'Marjerin', category: 'Sugar, Flour & Oil', supplier: S('Sawitara'), cost: 4.1, band: 'normal', pop: 4, variants: [['240g', 1], ['480g', 1.9]] },
  // Spices
  { name: 'Serbuk Kari Daging', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 3.2, band: 'high', pop: 5, variants: [['250g', 1], ['1kg', 3.6]] },
  { name: 'Serbuk Kari Ikan', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 3.1, band: 'high', pop: 4, variants: [['250g', 1], ['1kg', 3.6]] },
  { name: 'Serbuk Cili', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 2.6, band: 'high', pop: 5, variants: [['250g', 1], ['500g', 1.9]] },
  { name: 'Serbuk Kunyit', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 1.8, band: 'high', pop: 4, variants: [['100g', 1], ['250g', 2.3]] },
  { name: 'Bunga Lawang', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 3.5, band: 'high', pop: 2, variants: [['100g', 1]] },
  { name: 'Kayu Manis', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 2.9, band: 'high', pop: 2, variants: [['100g', 1]] },
  { name: 'Lada Hitam Tumbuk', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 4.4, band: 'high', pop: 3, variants: [['100g', 1], ['250g', 2.3]] },
  { name: 'Pes Rendang', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 3.9, band: 'normal', pop: 3, variants: [['200g', 1]] },
  { name: 'Pes Tom Yam', category: 'Spices & Paste', supplier: S('Rempahku'), cost: 3.6, band: 'normal', pop: 4, variants: [['200g', 1]] },
  { name: 'Belacan Blok', category: 'Spices & Paste', supplier: S('Bilisora'), cost: 4.2, band: 'normal', pop: 3, variants: [['250g', 1]] },
  // Sauces
  { name: 'Kicap Manis', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 2.9, band: 'normal', pop: 7, variants: [['345ml', 1], ['640ml', 1.7]] },
  { name: 'Kicap Masin', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 2.7, band: 'normal', pop: 6, variants: [['345ml', 1], ['640ml', 1.7]] },
  { name: 'Sos Cili', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 2.6, band: 'normal', pop: 7, variants: [['340g', 1], ['1kg', 2.6]] },
  { name: 'Sos Tomato', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 2.5, band: 'normal', pop: 5, variants: [['340g', 1], ['1kg', 2.6]] },
  { name: 'Sos Tiram', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 3.9, band: 'normal', pop: 5, variants: [['510g', 1], ['770g', 1.4]] },
  { name: 'Cuka Putih', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 1.6, band: 'high', pop: 3, variants: [['375ml', 1]] },
  { name: 'Garam Halus', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 0.9, band: 'high', pop: 5, variants: [['500g', 1], ['1kg', 1.8]] },
  { name: 'Sambal Tumis Siap', category: 'Sauces & Condiments', supplier: S('Kicapina'), cost: 4.8, band: 'normal', pop: 3, variants: [['200g', 1]] },
  // Canned
  { name: 'Sardin dalam Sos Tomato', category: 'Canned Food', supplier: S('Tinmerah'), cost: 4.3, band: 'normal', pop: 7, variants: [['155g', 0.5], ['425g', 1]] },
  { name: 'Tuna dalam Air Garam', category: 'Canned Food', supplier: S('Tinmerah'), cost: 4.9, band: 'normal', pop: 5, variants: [['150g', 1], ['185g', 1.2]] },
  { name: 'Kacang Panggang', category: 'Canned Food', supplier: S('Tinmerah'), cost: 2.8, band: 'normal', pop: 3, variants: [['425g', 1]] },
  { name: 'Jagung Manis Tin', category: 'Canned Food', supplier: S('Tinmerah'), cost: 2.9, band: 'normal', pop: 3, variants: [['425g', 1]] },
  { name: 'Kari Ayam Tin', category: 'Canned Food', supplier: S('Tinmerah'), cost: 5.6, band: 'normal', pop: 3, variants: [['280g', 1]] },
  { name: 'Daging Luncheon Ayam', category: 'Canned Food', supplier: S('Tinmerah'), cost: 4.7, band: 'normal', pop: 4, variants: [['340g', 1]] },
  { name: 'Susu Pekat Manis', category: 'Canned Food', supplier: S('Susumurni'), cost: 3.1, band: 'staple', pop: 8, variants: [['500g', 1]] },
  { name: 'Susu Sejat', category: 'Canned Food', supplier: S('Susumurni'), cost: 2.9, band: 'staple', pop: 6, variants: [['390g', 1]] },
  // Noodles
  { name: 'Mi Segera Perisa Kari', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 3.9, band: 'normal', pop: 9, variants: [['5 pek', 1], ['10 pek', 1.95]] },
  { name: 'Mi Segera Perisa Ayam', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 3.8, band: 'normal', pop: 8, variants: [['5 pek', 1], ['10 pek', 1.95]] },
  { name: 'Mi Segera Tom Yam', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 3.9, band: 'normal', pop: 7, variants: [['5 pek', 1]] },
  { name: 'Bihun Jagung', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 2.4, band: 'normal', pop: 6, variants: [['400g', 1], ['1kg', 2.3]] },
  { name: 'Kuey Teow Kering', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 2.8, band: 'normal', pop: 4, variants: [['400g', 1]] },
  { name: 'Mi Kuning Kering', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 2.2, band: 'normal', pop: 5, variants: [['500g', 1]] },
  { name: 'Spageti', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 3.1, band: 'normal', pop: 3, variants: [['500g', 1]] },
  { name: 'Makaroni Siku', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 2.6, band: 'normal', pop: 3, variants: [['500g', 1]] },
  // Coffee & tea
  { name: 'Kopi O Kaw Serbuk', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 9.8, band: 'normal', pop: 6, variants: [['500g', 1], ['1kg', 1.9]] },
  { name: 'Kopi 3-dalam-1', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 8.2, band: 'normal', pop: 8, variants: [['15 uncang', 1], ['30 uncang', 1.9]] },
  { name: 'Teh Tarik 3-dalam-1', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 8.6, band: 'normal', pop: 7, variants: [['15 uncang', 1], ['30 uncang', 1.9]] },
  { name: 'Serbuk Teh Hitam', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 5.9, band: 'normal', pop: 5, variants: [['250g', 1], ['500g', 1.9]] },
  { name: 'Uncang Teh Hijau', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 4.6, band: 'high', pop: 3, variants: [['25 uncang', 1], ['50 uncang', 1.85]] },
  { name: 'Minuman Coklat Malt', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 12.9, band: 'staple', pop: 8, variants: [['1kg', 1], ['2kg', 1.95]] },
  { name: 'Kopi Putih Ipoh-style', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 10.4, band: 'normal', pop: 4, variants: [['15 uncang', 1]] },
  // Drinks
  { name: 'Air Mineral', category: 'Drinks', supplier: S('Airlembah'), cost: 0.75, band: 'high', pop: 9, variants: [['600ml', 1], ['1.5L', 1.6], ['6 x 1.5L', 9.2]] },
  { name: 'Air Kotak Laici', category: 'Drinks', supplier: S('Airlembah'), cost: 0.95, band: 'normal', pop: 6, variants: [['250ml', 1], ['6 x 250ml', 5.7]] },
  { name: 'Air Kotak Teh Bunga', category: 'Drinks', supplier: S('Airlembah'), cost: 0.95, band: 'normal', pop: 5, variants: [['250ml', 1], ['6 x 250ml', 5.7]] },
  { name: 'Minuman Isotonik', category: 'Drinks', supplier: S('Airlembah'), cost: 1.6, band: 'normal', pop: 6, variants: [['500ml', 1], ['1.5L', 2.2]] },
  { name: 'Air Soya Botol', category: 'Drinks', supplier: S('Kristalis'), cost: 1.3, band: 'normal', pop: 5, variants: [['300ml', 1], ['1L', 2.5]] },
  { name: 'Minuman Berkarbonat Oren', category: 'Drinks', supplier: S('Kristalis'), cost: 1.5, band: 'normal', pop: 6, variants: [['325ml', 1], ['1.5L', 2.3]] },
  { name: 'Minuman Berkarbonat Kola', category: 'Drinks', supplier: S('Kristalis'), cost: 1.6, band: 'normal', pop: 7, variants: [['325ml', 1], ['1.5L', 2.3]] },
  { name: 'Kopi Tin Sejuk', category: 'Drinks', supplier: S('Kristalis'), cost: 1.7, band: 'normal', pop: 5, variants: [['240ml', 1]] },
  { name: 'Ais Ketul', category: 'Drinks', supplier: S('Kristalis'), cost: 1.4, band: 'high', pop: 5, variants: [['2kg', 1]] },
  // Dairy & eggs
  { name: 'Susu Segar Penuh Krim', category: 'Dairy & Eggs', supplier: S('Susumurni'), cost: 5.4, band: 'normal', pop: 6, variants: [['1L', 1], ['2L', 1.9]] },
  { name: 'Susu Rendah Lemak', category: 'Dairy & Eggs', supplier: S('Susumurni'), cost: 5.6, band: 'normal', pop: 4, variants: [['1L', 1]] },
  { name: 'Yogurt Asli', category: 'Dairy & Eggs', supplier: S('Susumurni'), cost: 3.2, band: 'normal', pop: 3, variants: [['500g', 1]] },
  { name: 'Keju Kepingan', category: 'Dairy & Eggs', supplier: S('Susumurni'), cost: 6.1, band: 'normal', pop: 3, variants: [['12 keping', 1]] },
  { name: 'Mentega Tawar', category: 'Dairy & Eggs', supplier: S('Susumurni'), cost: 8.9, band: 'normal', pop: 3, variants: [['250g', 1]] },
  { name: 'Telur Ayam Gred A', category: 'Dairy & Eggs', supplier: S('Telurmas'), cost: 11.2, band: 'staple', pop: 9, variants: [['30 biji', 1], ['10 biji', 0.36]] },
  { name: 'Telur Ayam Kampung', category: 'Dairy & Eggs', supplier: S('Telurmas'), cost: 7.8, band: 'normal', pop: 3, variants: [['10 biji', 1]] },
  // Snacks & biscuits
  { name: 'Kerepek Pisang', category: 'Snacks & Biscuits', supplier: S('Snekria'), cost: 2.9, band: 'high', pop: 6, variants: [['200g', 1], ['500g', 2.3]] },
  { name: 'Kerepek Ubi Pedas', category: 'Snacks & Biscuits', supplier: S('Snekria'), cost: 2.7, band: 'high', pop: 5, variants: [['200g', 1], ['500g', 2.3]] },
  { name: 'Keropok Ikan', category: 'Snacks & Biscuits', supplier: S('Snekria'), cost: 3.4, band: 'high', pop: 5, variants: [['250g', 1]] },
  { name: 'Kacang Tanah Goreng', category: 'Snacks & Biscuits', supplier: S('Kacangora'), cost: 3.1, band: 'high', pop: 4, variants: [['250g', 1], ['500g', 1.9]] },
  { name: 'Kacang Gajus Panggang', category: 'Snacks & Biscuits', supplier: S('Kacangora'), cost: 9.8, band: 'normal', pop: 3, variants: [['200g', 1]] },
  { name: 'Kurma Kering', category: 'Snacks & Biscuits', supplier: S('Kacangora'), cost: 7.5, band: 'normal', pop: 3, variants: [['500g', 1], ['1kg', 1.9]] },
  { name: 'Biskut Kraker Krim', category: 'Snacks & Biscuits', supplier: S('Biskutera'), cost: 3.6, band: 'normal', pop: 7, variants: [['428g', 1], ['800g', 1.8]] },
  { name: 'Biskut Marie', category: 'Snacks & Biscuits', supplier: S('Biskutera'), cost: 3.1, band: 'normal', pop: 5, variants: [['300g', 1]] },
  { name: 'Biskut Coklat Cip', category: 'Snacks & Biscuits', supplier: S('Biskutera'), cost: 4.2, band: 'normal', pop: 5, variants: [['200g', 1], ['400g', 1.9]] },
  { name: 'Wafer Krim Kacang', category: 'Snacks & Biscuits', supplier: S('Biskutera'), cost: 2.8, band: 'normal', pop: 5, variants: [['150g', 1]] },
  { name: 'Biskut Lemak Kelapa', category: 'Snacks & Biscuits', supplier: S('Biskutera'), cost: 3.3, band: 'normal', pop: 4, variants: [['300g', 1]] },
  { name: 'Coklat Susu Bar', category: 'Snacks & Biscuits', supplier: S('Snekria'), cost: 2.4, band: 'high', pop: 6, variants: [['40g', 1], ['100g', 2.2]] },
  { name: 'Gula-gula Asam', category: 'Snacks & Biscuits', supplier: S('Snekria'), cost: 1.9, band: 'high', pop: 4, variants: [['150g', 1]] },
  // Frozen & bakery
  { name: 'Nugget Ayam', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 8.9, band: 'normal', pop: 6, variants: [['400g', 1], ['1kg', 2.3]] },
  { name: 'Sosej Ayam', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 6.8, band: 'normal', pop: 6, variants: [['340g', 1], ['1kg', 2.7]] },
  { name: 'Bebola Ikan', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 5.2, band: 'normal', pop: 5, variants: [['500g', 1]] },
  { name: 'Roti Canai Sejuk Beku', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 6.4, band: 'normal', pop: 5, variants: [['5 keping', 1], ['10 keping', 1.9]] },
  { name: 'Kentang Goreng Sejuk Beku', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 7.1, band: 'normal', pop: 4, variants: [['1kg', 1]] },
  { name: 'Ais Krim Vanila', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 9.5, band: 'normal', pop: 4, variants: [['1.5L', 1]] },
  { name: 'Karipap Sejuk Beku', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 7.4, band: 'normal', pop: 3, variants: [['10 biji', 1]] },
  { name: 'Roti Putih Sandwic', category: 'Bread', supplier: S('Rotimas'), cost: 3.1, band: 'normal', pop: 8, variants: [['400g', 1], ['600g', 1.35]] },
  { name: 'Roti Gandum Penuh', category: 'Bread', supplier: S('Rotimas'), cost: 3.6, band: 'normal', pop: 5, variants: [['400g', 1]] },
  { name: 'Roti Bun Kaya', category: 'Bread', supplier: S('Rotimas'), cost: 2.2, band: 'normal', pop: 5, variants: [['4 biji', 1]] },
  { name: 'Kaya Kelapa', category: 'Bread', supplier: S('Rotimas'), cost: 3.9, band: 'normal', pop: 4, variants: [['250g', 1]] },
  { name: 'Mentega Kacang', category: 'Bread', supplier: S('Rotimas'), cost: 5.8, band: 'normal', pop: 3, variants: [['340g', 1]] },
  // Dried seafood
  { name: 'Ikan Bilis Gred A', category: 'Dried Seafood', supplier: S('Bilisora'), cost: 14.5, band: 'normal', pop: 4, variants: [['250g', 0.52], ['500g', 1]] },
  { name: 'Udang Kering', category: 'Dried Seafood', supplier: S('Bilisora'), cost: 11.2, band: 'normal', pop: 3, variants: [['200g', 1]] },
  { name: 'Ikan Masin Kurau', category: 'Dried Seafood', supplier: S('Bilisora'), cost: 16.8, band: 'normal', pop: 2, variants: [['200g', 1]] },
  // Household
  { name: 'Sabun Basuh Pinggan Limau', category: 'Household', supplier: S('Bersihana'), cost: 3.2, band: 'high', pop: 7, variants: [['900ml', 1], ['3.6L', 3.3]] },
  { name: 'Serbuk Pencuci Pakaian', category: 'Household', supplier: S('Bersihana'), cost: 9.9, band: 'normal', pop: 6, variants: [['2kg', 1], ['4kg', 1.9]] },
  { name: 'Cecair Pencuci Pakaian', category: 'Household', supplier: S('Bersihana'), cost: 11.4, band: 'normal', pop: 5, variants: [['2L', 1], ['3.8L', 1.8]] },
  { name: 'Pelembut Pakaian', category: 'Household', supplier: S('Bersihana'), cost: 8.1, band: 'normal', pop: 4, variants: [['2L', 1]] },
  { name: 'Pencuci Lantai Pine', category: 'Household', supplier: S('Bersihana'), cost: 5.6, band: 'high', pop: 4, variants: [['2L', 1]] },
  { name: 'Peluntur Pakaian', category: 'Household', supplier: S('Bersihana'), cost: 3.3, band: 'high', pop: 3, variants: [['1L', 1]] },
  { name: 'Ubat Nyamuk Lingkar', category: 'Household', supplier: S('Bersihana'), cost: 3.9, band: 'high', pop: 4, variants: [['10 lingkar', 1]] },
  { name: 'Beg Sampah Hitam', category: 'Household', supplier: S('Kertasina'), cost: 3.5, band: 'high', pop: 5, variants: [['Sederhana 30 keping', 1], ['Besar 20 keping', 1.3]] },
  { name: 'Tisu Muka', category: 'Household', supplier: S('Kertasina'), cost: 6.9, band: 'normal', pop: 6, variants: [['4 kotak', 1]] },
  { name: 'Tisu Tandas', category: 'Household', supplier: S('Kertasina'), cost: 9.4, band: 'normal', pop: 7, variants: [['10 gulung', 1], ['20 gulung', 1.9]] },
  { name: 'Tuala Dapur', category: 'Household', supplier: S('Kertasina'), cost: 4.8, band: 'normal', pop: 3, variants: [['2 gulung', 1]] },
  { name: 'Kerajang Aluminium', category: 'Household', supplier: S('Alatria'), cost: 4.3, band: 'high', pop: 2, variants: [['7.6m', 1]] },
  { name: 'Bekas Makanan Plastik', category: 'Household', supplier: S('Alatria'), cost: 5.4, band: 'high', pop: 2, variants: [['Set 3', 1]] },
  { name: 'Span Pencuci', category: 'Household', supplier: S('Alatria'), cost: 2.1, band: 'high', pop: 3, variants: [['3 keping', 1]] },
  { name: 'Bateri AA', category: 'Household', supplier: S('Lampuria'), cost: 4.6, band: 'high', pop: 3, variants: [['4 biji', 1], ['8 biji', 1.85]] },
  { name: 'Mentol LED', category: 'Household', supplier: S('Lampuria'), cost: 5.9, band: 'high', pop: 2, variants: [['9W', 1], ['13W', 1.3]] },
  { name: 'Lilin Putih', category: 'Household', supplier: S('Lampuria'), cost: 2.2, band: 'high', pop: 2, variants: [['6 batang', 1]] },
  // Personal care
  { name: 'Syampu Herba', category: 'Personal Care', supplier: S('Wangisari'), cost: 9.5, band: 'normal', pop: 5, variants: [['400ml', 1], ['750ml', 1.7]] },
  { name: 'Sabun Mandi Cecair', category: 'Personal Care', supplier: S('Wangisari'), cost: 8.7, band: 'normal', pop: 5, variants: [['500ml', 1], ['1L', 1.8]] },
  { name: 'Ubat Gigi Herba', category: 'Personal Care', supplier: S('Wangisari'), cost: 4.2, band: 'normal', pop: 6, variants: [['150g', 1], ['2 x 150g', 1.9]] },
  { name: 'Berus Gigi Lembut', category: 'Personal Care', supplier: S('Wangisari'), cost: 2.9, band: 'high', pop: 4, variants: [['2 batang', 1]] },
  { name: 'Deodoran Roll-on', category: 'Personal Care', supplier: S('Wangisari'), cost: 6.8, band: 'normal', pop: 3, variants: [['50ml', 1]] },
  { name: 'Losyen Badan', category: 'Personal Care', supplier: S('Wangisari'), cost: 8.9, band: 'normal', pop: 2, variants: [['200ml', 1]] },
  { name: 'Tuala Wanita', category: 'Personal Care', supplier: S('Wangisari'), cost: 5.6, band: 'normal', pop: 5, variants: [['Siang 16 keping', 1], ['Malam 10 keping', 1.1]] },
  { name: 'Minyak Angin', category: 'Health', supplier: S('Sihatora'), cost: 4.9, band: 'high', pop: 4, variants: [['25ml', 1]] },
  { name: 'Plaster Luka', category: 'Health', supplier: S('Sihatora'), cost: 2.8, band: 'high', pop: 3, variants: [['20 keping', 1]] },
  { name: 'Topeng Muka 3-lapis', category: 'Health', supplier: S('Sihatora'), cost: 3.9, band: 'high', pop: 3, variants: [['50 keping', 1]] },
  { name: 'Pembersih Tangan', category: 'Health', supplier: S('Sihatora'), cost: 4.1, band: 'high', pop: 3, variants: [['500ml', 1]] },
  // Baby
  { name: 'Lampin Bayi Pakai Buang', category: 'Baby', supplier: S('Bayimesra'), cost: 32.5, band: 'staple', pop: 5, variants: [['Saiz M 60 keping', 1], ['Saiz L 52 keping', 1.02], ['Saiz XL 44 keping', 1.03]] },
  { name: 'Susu Tepung Kanak-kanak', category: 'Baby', supplier: S('Bayimesra'), cost: 38.9, band: 'staple', pop: 4, variants: [['1.2kg', 1], ['1.8kg', 1.45]] },
  { name: 'Tisu Basah Bayi', category: 'Baby', supplier: S('Bayimesra'), cost: 3.8, band: 'normal', pop: 5, variants: [['80 keping', 1], ['3 x 80 keping', 2.8]] },
  { name: 'Bubur Bijirin Bayi', category: 'Baby', supplier: S('Bayimesra'), cost: 7.9, band: 'normal', pop: 2, variants: [['250g', 1]] },
  // Pet
  { name: 'Makanan Kucing Kering', category: 'Pet', supplier: S('Haiwania'), cost: 11.5, band: 'normal', pop: 3, variants: [['1.2kg', 1], ['3kg', 2.3]] },
  { name: 'Makanan Kucing Tin', category: 'Pet', supplier: S('Haiwania'), cost: 2.6, band: 'normal', pop: 3, variants: [['400g', 1]] },
  { name: 'Pasir Kucing', category: 'Pet', supplier: S('Haiwania'), cost: 7.8, band: 'normal', pop: 2, variants: [['10L', 1]] },
  // Stationery
  { name: 'Buku Latihan Sekolah', category: 'Stationery', supplier: S('Tulisana'), cost: 1.4, band: 'high', pop: 3, variants: [['80 muka', 1], ['120 muka', 1.4]] },
  { name: 'Pen Biru', category: 'Stationery', supplier: S('Tulisana'), cost: 2.2, band: 'high', pop: 3, variants: [['3 batang', 1]] },
  { name: 'Pita Pelekat Lutsinar', category: 'Stationery', supplier: S('Tulisana'), cost: 1.8, band: 'high', pop: 2, variants: [['2 gulung', 1]] },
  { name: 'Sampul Duit Raya', category: 'Stationery', supplier: S('Tulisana'), cost: 2.1, band: 'high', pop: 2, variants: [['10 keping', 1]] },
  { name: 'Angpau Merah', category: 'Stationery', supplier: S('Tulisana'), cost: 2.3, band: 'high', pop: 2, variants: [['10 keping', 1]] },
  // More everyday lines
  { name: 'Kacang Hijau', category: 'Rice & Grains', supplier: S('Padiwangi'), cost: 3.6, band: 'normal', pop: 3, variants: [['500g', 1], ['1kg', 1.9]] },
  { name: 'Kacang Dal', category: 'Rice & Grains', supplier: S('Padiwangi'), cost: 3.9, band: 'normal', pop: 3, variants: [['500g', 1], ['1kg', 1.9]] },
  { name: 'Santan Kotak', category: 'Sugar, Flour & Oil', supplier: S('Sawitara'), cost: 2.1, band: 'normal', pop: 6, variants: [['200ml', 1], ['1L', 4.4]] },
  { name: 'Serbuk Penaik', category: 'Sugar, Flour & Oil', supplier: S('Gandumas'), cost: 1.9, band: 'high', pop: 2, variants: [['100g', 1]] },
  { name: 'Mi Segera Cup Pedas', category: 'Noodles & Pasta', supplier: S('Mikuning'), cost: 1.7, band: 'normal', pop: 6, variants: [['1 cawan', 1], ['6 cawan', 5.7]] },
  { name: 'Teh Halia Segera', category: 'Coffee & Tea', supplier: S('Kopisenja'), cost: 7.4, band: 'normal', pop: 3, variants: [['12 uncang', 1]] },
  { name: 'Jus Oren Kotak', category: 'Drinks', supplier: S('Airlembah'), cost: 4.6, band: 'normal', pop: 4, variants: [['1L', 1]] },
  { name: 'Kerepek Kentang Asli', category: 'Snacks & Biscuits', supplier: S('Snekria'), cost: 3.3, band: 'high', pop: 6, variants: [['60g', 0.5], ['160g', 1]] },
  { name: 'Popcorn Karamel', category: 'Snacks & Biscuits', supplier: S('Snekria'), cost: 2.5, band: 'high', pop: 3, variants: [['80g', 1]] },
  { name: 'Kismis', category: 'Snacks & Biscuits', supplier: S('Kacangora'), cost: 3.9, band: 'normal', pop: 2, variants: [['250g', 1]] },
  { name: 'Dumpling Sejuk Beku', category: 'Frozen & Chilled', supplier: S('Bekuria'), cost: 9.9, band: 'normal', pop: 3, variants: [['20 biji', 1]] },
  { name: 'Sabun Basuh Tangan', category: 'Personal Care', supplier: S('Wangisari'), cost: 4.4, band: 'normal', pop: 4, variants: [['250ml', 1]] },
  { name: 'Pisau Cukur Pakai Buang', category: 'Personal Care', supplier: S('Wangisari'), cost: 5.2, band: 'high', pop: 2, variants: [['5 batang', 1]] },
  { name: 'Paracetamol 500mg', category: 'Health', supplier: S('Sihatora'), cost: 3.6, band: 'normal', pop: 3, variants: [['12 biji', 1]] },
  // Festive: Chinese New Year 2026
  { name: 'Kuih Bangkit', category: 'Festive', supplier: S('Tahunbaru'), cost: 11.5, band: 'high', pop: 6, variants: [['Balang 400g', 1]], season: 'cny' },
  { name: 'Kuih Kapit', category: 'Festive', supplier: S('Tahunbaru'), cost: 12.8, band: 'high', pop: 6, variants: [['Balang 300g', 1]], season: 'cny' },
  { name: 'Tart Nanas', category: 'Festive', supplier: S('Tahunbaru'), cost: 14.2, band: 'high', pop: 7, variants: [['Balang 450g', 1]], season: 'cny' },
  { name: 'Limau Mandarin', category: 'Festive', supplier: S('Tahunbaru'), cost: 19.5, band: 'normal', pop: 8, variants: [['Kotak 24 biji', 1]], season: 'cny' },
  { name: 'Kacang Bercoklat', category: 'Festive', supplier: S('Tahunbaru'), cost: 10.9, band: 'high', pop: 4, variants: [['Balang 350g', 1]], season: 'cny' },
  { name: 'Hamper Tahun Baru Cina', category: 'Festive', supplier: S('Hamperia'), cost: 68, band: 'normal', pop: 3, variants: [['Sederhana', 1], ['Besar', 1.6]], season: 'cny' },
  // Festive: Hari Raya 2026
  { name: 'Biskut Suji', category: 'Festive', supplier: S('Kuihraya'), cost: 10.5, band: 'high', pop: 6, variants: [['Balang 400g', 1]], season: 'raya' },
  { name: 'Biskut Mazola', category: 'Festive', supplier: S('Kuihraya'), cost: 10.9, band: 'high', pop: 5, variants: [['Balang 400g', 1]], season: 'raya' },
  { name: 'Kek Lapis', category: 'Festive', supplier: S('Kuihraya'), cost: 22.5, band: 'normal', pop: 5, variants: [['1kg', 1]], season: 'raya' },
  { name: 'Dodol Durian', category: 'Festive', supplier: S('Kuihraya'), cost: 9.8, band: 'high', pop: 4, variants: [['500g', 1]], season: 'raya' },
  { name: 'Ketupat Segera', category: 'Festive', supplier: S('Kuihraya'), cost: 4.5, band: 'normal', pop: 6, variants: [['10 biji', 1]], season: 'raya' },
  { name: 'Rendang Daging Siap', category: 'Festive', supplier: S('Kuihraya'), cost: 13.9, band: 'normal', pop: 4, variants: [['500g', 1]], season: 'raya' },
  // Festive: year-end 2025 and 2026
  { name: 'Hamper Hujung Tahun', category: 'Festive', supplier: S('Hamperia'), cost: 55, band: 'normal', pop: 3, variants: [['Sederhana', 1], ['Besar', 1.7]], season: 'yearend2025' },
  { name: 'Kek Buah Krismas', category: 'Festive', supplier: S('Hamperia'), cost: 15.5, band: 'high', pop: 4, variants: [['500g', 1]], season: 'yearend2025' },
  { name: 'Coklat Kotak Hadiah', category: 'Festive', supplier: S('Hamperia'), cost: 18.9, band: 'high', pop: 4, variants: [['250g', 1]], season: 'yearend2025' },
  { name: 'Hamper Korporat 2026', category: 'Festive', supplier: S('Hamperia'), cost: 85, band: 'normal', pop: 3, variants: [['Standard', 1], ['Premium', 1.5]], season: 'yearend2026' },
  { name: 'Biskut Mentega Tin Hadiah', category: 'Festive', supplier: S('Snekria'), cost: 16.5, band: 'high', pop: 4, variants: [['Tin 700g', 1]], season: 'yearend2026' },
];
