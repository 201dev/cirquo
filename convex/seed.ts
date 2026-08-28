import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { recordLedgerEvent } from "./lib/ledger";

/**
 * Demonstration data for local/dev only. Never run against production.
 *
 * Every row is marked `metadata: { seedData: true }` on its ledger event so
 * impact figures computed from the Material Flow Ledger can be filtered back
 * to real activity. Numbers here are illustrative, not measured.
 *
 * Re-running is safe: the accounts listed in SEED_EMAILS are torn down first.
 */

type MaterialType = Doc<"surplusItems">["materialType"];
type BusinessType = NonNullable<Doc<"merchants">["businessType"]>;

const MINUTE = 60_000;

/** Hash of the password "budi.bakery" — shared by every demo merchant login. */
const MERCHANT_PASSWORD_HASH =
  "scrypt$16384$8$1$Q77lBMDJnw1opX5Cr0QQzg==$cvUbulbCsgt3dga6JdrcsTDD/caqP3xH0ZJqQqV3GlU=";
/** Hash of the password "andi123". */
const CONSUMER_PASSWORD_HASH =
  "scrypt$16384$8$1$SOolvCCJ9vkLHrNP4vefyA==$Uxr+KU1kYqmW7kg/Zio3NWswjuMWyaaZR45It7sYQWw=";

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=800`;

/** Each id was fetched and inspected so the photo matches the material type. */
const IMG = {
  breadLoaf: photo("photo-1509440159596-0249088772ff"),
  dough: photo("photo-1517686469429-8bdb88b9f907"),
  pancake: photo("photo-1567620905732-2d1ec7ab7445"),
  cakeSlice: photo("photo-1565958011703-44f9829ba187"),
  cookies: photo("photo-1558961363-fa8fdf82db35"),
  ricePlatter: photo("photo-1504674900247-0877df9cc836"),
  friedChicken: photo("photo-1626082927389-6cd097cdc6ec"),
  grilledChicken: photo("photo-1476224203421-9ac39bcb3327"),
  skewers: photo("photo-1555939594-58d7cb561ad1"),
  meatballs: photo("photo-1529042410759-befb1204b468"),
  soto: photo("photo-1455619452474-d2be8b1e70cd"),
  noodles: photo("photo-1563379926898-05f4575a45d8"),
  curry: photo("photo-1517244683847-7456b63c5969"),
  riceBowl: photo("photo-1546069901-ba9599a7e63c"),
  breakfast: photo("photo-1490645935967-10de6ba17061"),
  pastaSalad: photo("photo-1473093295043-cdd812d0e601"),
  burger: photo("photo-1550547660-d9450f859349"),
  tropicalFruit: photo("photo-1610832958506-aa56368176cf"),
  greenSalad: photo("photo-1540189549336-e6e99c3679fe"),
  veggieBowl: photo("photo-1512621776951-a57141f2eefd"),
  cheese: photo("photo-1486297678162-eb2a19b0a32d"),
  rice: photo("photo-1586201375761-83865001e31c"),
  spices: photo("photo-1509358271058-acd22cc93898"),
  driedGoods: photo("photo-1596040033229-a9821ebd058d"),
  mixedBowls: photo("photo-1590301157890-4810ed352733"),
} as const;

const VEGAN = ["Vegan", "Vegetarian", "Tanpa babi"];
const VEGGIE = ["Vegetarian", "Tanpa babi"];
const NO_PORK = ["Tanpa babi"];
const HALAL = ["Halal", "Tanpa babi"];

type SeedItem = {
  name: string;
  type: MaterialType;
  original: number;
  price: number;
  qty: number;
  grams: number;
  /** Minutes from seed time until the pickup window opens. */
  from: number;
  /** How long the pickup window stays open, in minutes. */
  mins: number;
  img: string;
  tags: string[];
  desc: string;
  /** Already claimed. Keeps sold-out rows in the data instead of only in theory. */
  soldOut?: boolean;
};

type SeedMerchant = {
  name: string;
  email: string;
  businessType: BusinessType;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  items: SeedItem[];
};

/**
 * Coordinates are real Semarang locations, all inside the 30 km discovery
 * radius around Tembalang (-7.052, 110.44). A merchant placed outside it is
 * invisible to the Consumer discovery query.
 */
const MERCHANTS: SeedMerchant[] = [
  {
    name: "Budi Bakery & Cafe",
    email: "budi.bakery@example.com",
    businessType: "bakery",
    address: "Jl. Pemuda No. 118, Sekayu, Semarang Tengah",
    latitude: -6.9825,
    longitude: 110.414,
    phone: "081234567890",
    items: [
      {
        name: "Paket Roti Manis Akhir Hari", type: "bakery",
        original: 47_500, price: 17_500, qty: 6, grams: 480, from: 0, mins: 150,
        img: IMG.breadLoaf, tags: VEGGIE,
        desc: "Tiga roti manis, dua croissant, dan satu roti sobek dari display hari ini.",
      },
      {
        name: "Croissant & Danish Sisa Display", type: "bakery",
        original: 62_000, price: 23_500, qty: 4, grams: 320, from: 90, mins: 180,
        img: IMG.dough, tags: VEGGIE,
        desc: "Dipanggang pagi ini, tekstur masih renyah. Harus habis sebelum toko tutup.",
      },
      {
        name: "Slice Cake Pesanan Batal Diambil", type: "bakery",
        original: 85_000, price: 31_000, qty: 3, grams: 210, from: 30, mins: 240,
        img: IMG.cakeSlice, tags: VEGGIE,
        desc: "Enam potong dari kue ulang tahun yang tidak diambil pemesan.",
      },
      {
        name: "Cookies Toples Retak", type: "bakery",
        original: 38_000, price: 13_500, qty: 8, grams: 250, from: 0, mins: 300,
        img: IMG.cookies, tags: VEGGIE,
        desc: "Retak saat pengemasan, rasa dan kerenyahannya tidak berubah.",
      },
      {
        name: "Pisang Cokelat Panggang", type: "bakery",
        original: 25_000, price: 9_500, qty: 5, grams: 180, from: 0, mins: 120,
        img: IMG.pancake, tags: VEGGIE,
        desc: "Sudah habis diselamatkan pagi ini.", soldOut: true,
      },
    ],
  },
  {
    name: "Warung Bu Tini Tembalang",
    email: "warung.tini@example.com",
    businessType: "warung",
    address: "Jl. Banjarsari Raya No. 27, Tembalang, Semarang",
    latitude: -7.0498,
    longitude: 110.4382,
    phone: "081234560002",
    items: [
      {
        name: "Nasi Rames Porsi Mahasiswa", type: "prepared_food",
        original: 18_000, price: 7_500, qty: 12, grams: 420, from: 0, mins: 90,
        img: IMG.ricePlatter, tags: HALAL,
        desc: "Nasi, tumis buncis, tempe bacem, dan sambal. Masak siang tadi.",
      },
      {
        name: "Ayam Goreng Kremes Sisa Etalase", type: "protein",
        original: 22_000, price: 9_000, qty: 7, grams: 260, from: 0, mins: 75,
        img: IMG.friedChicken, tags: HALAL,
        desc: "Digoreng jam 11, masih hangat dari penghangat etalase.",
      },
      {
        name: "Paket Sayur Matang Campur", type: "prepared_food",
        original: 15_000, price: 6_000, qty: 9, grams: 350, from: 45, mins: 120,
        img: IMG.greenSalad, tags: VEGGIE,
        desc: "Oseng kangkung, sayur lodeh, dan urap dalam satu wadah.",
      },
    ],
  },
  {
    name: "Bakso & Soto Pak Gendut",
    email: "bakso.gendut@example.com",
    businessType: "warung",
    address: "Jl. Tlogosari Raya I No. 44, Pedurungan, Semarang",
    latitude: -6.9906,
    longitude: 110.4658,
    phone: "081234560003",
    items: [
      {
        name: "Bakso Urat 10 Butir", type: "protein",
        original: 35_000, price: 14_500, qty: 6, grams: 380, from: 0, mins: 110,
        img: IMG.meatballs, tags: HALAL,
        desc: "Bakso urat tanpa kuah, siap dipanaskan ulang di rumah.",
      },
      {
        name: "Soto Ayam Semarang (Tanpa Nasi)", type: "prepared_food",
        original: 24_000, price: 10_500, qty: 8, grams: 450, from: 30, mins: 100,
        img: IMG.soto, tags: HALAL,
        desc: "Kuah dan isian dipisah, kunci rasa soto Semarang tetap terjaga.",
      },
      {
        name: "Mie Ayam Porsi Sore", type: "prepared_food",
        original: 20_000, price: 8_500, qty: 5, grams: 400, from: 120, mins: 90,
        img: IMG.noodles, tags: NO_PORK,
        desc: "Mie, ayam kecap, dan pangsit rebus. Diambil sebelum warung tutup.",
      },
    ],
  },
  {
    name: "Kedai Nasi Gandul Pak Sabar",
    email: "nasi.gandul@example.com",
    businessType: "restaurant",
    address: "Jl. MT Haryono No. 512, Peterongan, Semarang Selatan",
    latitude: -7.006,
    longitude: 110.4231,
    phone: "081234560004",
    items: [
      {
        name: "Nasi Gandul Daging Sapi", type: "prepared_food",
        original: 32_000, price: 13_500, qty: 6, grams: 470, from: 0, mins: 120,
        img: IMG.curry, tags: HALAL,
        desc: "Kuah santan rempah dengan potongan daging sandung lamur.",
      },
      {
        name: "Sate Kerbau Bumbu Kacang", type: "protein",
        original: 45_000, price: 18_000, qty: 4, grams: 300, from: 60, mins: 150,
        img: IMG.skewers, tags: HALAL,
        desc: "Sepuluh tusuk sate dengan bumbu kacang terpisah.",
      },
      {
        name: "Rice Bowl Ayam Sambal Matah", type: "prepared_food",
        original: 28_500, price: 11_500, qty: 10, grams: 410, from: 0, mins: 180,
        img: IMG.riceBowl, tags: HALAL,
        desc: "Sisa produksi katering siang, kemasan bowl belum dibuka.",
      },
      {
        name: "Empal Gentong Kuah Kental", type: "prepared_food",
        original: 30_000, price: 12_500, qty: 3, grams: 460, from: 150, mins: 120,
        img: IMG.soto, tags: HALAL,
        desc: "Batch terakhir hari ini, tinggal tiga porsi.",
      },
    ],
  },
  {
    name: "Ayam Geprek Sultan Sekaran",
    email: "geprek.sultan@example.com",
    businessType: "restaurant",
    address: "Jl. Taman Siswa No. 9, Sekaran, Gunungpati, Semarang",
    latitude: -7.0512,
    longitude: 110.3893,
    phone: "081234560005",
    items: [
      {
        name: "Geprek Sambal Bawang + Nasi", type: "prepared_food",
        original: 21_000, price: 8_500, qty: 14, grams: 430, from: 0, mins: 100,
        img: IMG.friedChicken, tags: HALAL,
        desc: "Ayam digeprek saat diambil, sambal bawang dibungkus terpisah.",
      },
      {
        name: "Ayam Bakar Madu Setengah Ekor", type: "protein",
        original: 38_000, price: 15_500, qty: 5, grams: 520, from: 45, mins: 140,
        img: IMG.grilledChicken, tags: HALAL,
        desc: "Dibakar untuk pesanan grup yang dibatalkan sore ini.",
      },
      {
        name: "Burger Ayam Krispi", type: "prepared_food",
        original: 26_000, price: 10_500, qty: 6, grams: 240, from: 30, mins: 90,
        img: IMG.burger, tags: HALAL,
        desc: "Roti dan patty dipisah agar tidak lembek saat dibawa pulang.",
      },
    ],
  },
  {
    name: "Kopi Kenangan Senja",
    email: "kopi.senja@example.com",
    businessType: "cafe",
    address: "Jl. Pandanaran No. 76, Mugassari, Semarang Selatan",
    latitude: -6.9887,
    longitude: 110.416,
    phone: "081234560006",
    items: [
      {
        name: "Pastry Box Isi 4", type: "bakery",
        original: 68_000, price: 24_500, qty: 5, grams: 340, from: 0, mins: 200,
        img: IMG.dough, tags: VEGGIE,
        desc: "Pain au chocolat dan cinnamon roll dari batch pagi.",
      },
      {
        name: "Sandwich Tuna Gandum", type: "prepared_food",
        original: 32_000, price: 12_500, qty: 7, grams: 220, from: 0, mins: 130,
        img: IMG.breakfast, tags: NO_PORK,
        desc: "Dirakit pagi ini dan disimpan di chiller sepanjang hari.",
      },
      {
        name: "Pasta Salad Dingin", type: "prepared_food",
        original: 34_000, price: 13_000, qty: 4, grams: 290, from: 60, mins: 160,
        img: IMG.pastaSalad, tags: VEGGIE,
        desc: "Fusilli, tomat, dan basil dengan dressing terpisah.",
      },
      {
        name: "Susu Segar Botol 500 ml", type: "dairy",
        original: 18_000, price: 7_000, qty: 11, grams: 520, from: 0, mins: 240,
        img: IMG.cheese, tags: VEGGIE,
        desc: "Stok berlebih untuk latte hari ini, kedaluwarsa dua hari lagi.",
      },
    ],
  },
  {
    name: "Sayur Segar Pasar Jatingaleh",
    email: "sayur.jatingaleh@example.com",
    businessType: "grocery",
    address: "Jl. Teuku Umar No. 18, Jatingaleh, Candisari, Semarang",
    latitude: -7.0175,
    longitude: 110.4218,
    phone: "081234560007",
    items: [
      {
        name: "Sayur & Buah Sisa Sortir", type: "produce",
        original: 40_000, price: 12_000, qty: 10, grams: 1_500, from: 0, mins: 180,
        img: IMG.tropicalFruit, tags: VEGAN,
        desc: "Sayuran hidroponik dan pisang yang sedikit bernoda tapi layak konsumsi.",
      },
      {
        name: "Paket Sayur Sop 1 Kg", type: "produce",
        original: 24_000, price: 8_500, qty: 15, grams: 1_000, from: 0, mins: 220,
        img: IMG.greenSalad, tags: VEGAN,
        desc: "Wortel, kol, buncis, dan seledri untuk sop keluarga.",
      },
      {
        name: "Buah Potong Siap Makan", type: "produce",
        original: 30_000, price: 11_000, qty: 6, grams: 700, from: 30, mins: 120,
        img: IMG.veggieBowl, tags: VEGAN,
        desc: "Pepaya, semangka, dan melon yang dipotong pagi ini.",
      },
      {
        name: "Pisang Cavendish Matang", type: "produce",
        original: 22_000, price: 7_500, qty: 8, grams: 1_200, from: 0, mins: 60,
        img: IMG.tropicalFruit, tags: VEGAN,
        desc: "Terlalu matang untuk rak display, sempurna untuk smoothie.",
      },
    ],
  },
  {
    name: "Dapur Catering Bu Sri",
    email: "catering.busri@example.com",
    businessType: "catering",
    address: "Jl. Setiabudi No. 203, Srondol Wetan, Banyumanik, Semarang",
    latitude: -7.0662,
    longitude: 110.4159,
    phone: "081234560008",
    items: [
      {
        name: "Nasi Box Rapat 20 Porsi", type: "prepared_food",
        original: 480_000, price: 165_000, qty: 2, grams: 9_000, from: 0, mins: 150,
        img: IMG.ricePlatter, tags: HALAL,
        desc: "Pesanan rapat kantor yang dibatalkan mendadak. Dijual satu lot.",
      },
      {
        name: "Tumpeng Mini Batal Kirim", type: "prepared_food",
        original: 175_000, price: 62_000, qty: 1, grams: 2_400, from: 60, mins: 180,
        img: IMG.mixedBowls, tags: HALAL,
        desc: "Lengkap dengan tujuh lauk pendamping, belum tersentuh.",
      },
      {
        name: "Snack Box Isi 5", type: "bakery",
        original: 25_000, price: 9_000, qty: 18, grams: 300, from: 0, mins: 260,
        img: IMG.cookies, tags: VEGGIE,
        desc: "Risoles, lemper, dan bolu kukus dari produksi pagi.",
      },
      {
        name: "Rendang Daging 1 Kg", type: "protein",
        original: 210_000, price: 78_000, qty: 2, grams: 1_000, from: 90, mins: 240,
        img: IMG.curry, tags: HALAL,
        desc: "Dimasak semalam, bisa tahan tiga hari di kulkas.",
      },
      {
        name: "Puding Cokelat Loyang", type: "dairy",
        original: 45_000, price: 16_500, qty: 4, grams: 800, from: 0, mins: 200,
        img: IMG.cheese, tags: VEGGIE,
        desc: "Sisa dessert acara ulang tahun tadi siang.",
      },
    ],
  },
  {
    name: "Rumah Makan Padang Sederhana Jaya",
    email: "padang.jaya@example.com",
    businessType: "restaurant",
    address: "Jl. Majapahit No. 288, Pedurungan, Semarang",
    latitude: -6.9974,
    longitude: 110.4611,
    phone: "081234560009",
    items: [
      {
        name: "Paket Nasi Padang Ayam Pop", type: "prepared_food",
        original: 27_000, price: 11_000, qty: 9, grams: 480, from: 0, mins: 95,
        img: IMG.ricePlatter, tags: HALAL,
        desc: "Nasi, ayam pop, gulai nangka, dan sambal ijo.",
      },
      {
        name: "Gulai Tunjang Porsi Besar", type: "prepared_food",
        original: 42_000, price: 16_500, qty: 4, grams: 520, from: 30, mins: 130,
        img: IMG.curry, tags: HALAL,
        desc: "Kikil sapi empuk dengan kuah gulai kental.",
      },
      {
        name: "Dendeng Batokok", type: "protein",
        original: 55_000, price: 21_000, qty: 3, grams: 280, from: 0, mins: 160,
        img: IMG.skewers, tags: HALAL,
        desc: "Dendeng sisa etalase siang, masih renyah di bagian tepi.",
      },
    ],
  },
  {
    name: "Toko Roti Dhika",
    email: "roti.dhika@example.com",
    businessType: "bakery",
    address: "Jl. Ngesrep Timur V No. 61, Sumurboto, Banyumanik, Semarang",
    latitude: -7.0446,
    longitude: 110.4292,
    phone: "081234560010",
    items: [
      {
        name: "Roti Tawar Gandum Utuh", type: "bakery",
        original: 21_000, price: 8_000, qty: 13, grams: 400, from: 0, mins: 280,
        img: IMG.breadLoaf, tags: VEGGIE,
        desc: "Diproduksi kemarin sore, terbaik dikonsumsi hari ini.",
      },
      {
        name: "Donat Gula Isi 6", type: "bakery",
        original: 30_000, price: 11_500, qty: 7, grams: 360, from: 0, mins: 150,
        img: IMG.pancake, tags: VEGGIE,
        desc: "Bentuknya kurang rapi sehingga tidak masuk rak utama.",
      },
      {
        name: "Bolu Pandan Loyang Potong", type: "bakery",
        original: 42_000, price: 15_500, qty: 4, grams: 620, from: 45, mins: 190,
        img: IMG.cakeSlice, tags: VEGGIE,
        desc: "Satu loyang dipotong delapan, sisa pesanan katering.",
      },
      {
        name: "Roti Sobek Cokelat", type: "bakery",
        original: 26_000, price: 9_500, qty: 6, grams: 380, from: 0, mins: 60,
        img: IMG.cookies, tags: VEGGIE,
        desc: "Habis dalam satu jam pertama.", soldOut: true,
      },
    ],
  },
  {
    name: "Susu & Yogurt Mbak Nia",
    email: "susu.nia@example.com",
    businessType: "grocery",
    address: "Jl. Durian Raya No. 12, Srondol Wetan, Banyumanik, Semarang",
    latitude: -7.0585,
    longitude: 110.4211,
    phone: "081234560011",
    items: [
      {
        name: "Susu Pasteurisasi 1 Liter", type: "dairy",
        original: 28_000, price: 10_500, qty: 9, grams: 1_030, from: 0, mins: 210,
        img: IMG.cheese, tags: VEGGIE,
        desc: "Kedaluwarsa tiga hari lagi, rantai dingin tidak pernah terputus.",
      },
      {
        name: "Yogurt Plain Cup Isi 4", type: "dairy",
        original: 36_000, price: 13_500, qty: 6, grams: 480, from: 30, mins: 170,
        img: IMG.breakfast, tags: VEGGIE,
        desc: "Label kemasan penyok saat pengiriman, isi utuh.",
      },
      {
        name: "Keju Mozarella Blok 250 g", type: "dairy",
        original: 52_000, price: 19_500, qty: 5, grams: 250, from: 0, mins: 240,
        img: IMG.cheese, tags: VEGGIE,
        desc: "Stok berlebih dari pesanan pizzeria yang dikurangi.",
      },
    ],
  },
  {
    name: "Toko Sembako Amanah",
    email: "sembako.amanah@example.com",
    businessType: "grocery",
    address: "Jl. Prof. Hamka No. 55, Ngaliyan, Semarang",
    latitude: -6.9963,
    longitude: 110.3428,
    phone: "081234560012",
    items: [
      {
        name: "Beras Pecah Kulit 5 Kg", type: "dry_goods",
        original: 75_000, price: 34_000, qty: 8, grams: 5_000, from: 0, mins: 300,
        img: IMG.rice, tags: VEGAN,
        desc: "Butir sebagian pecah saat penggilingan, kualitas rasa tetap.",
      },
      {
        name: "Bumbu Dapur Kering Campur", type: "dry_goods",
        original: 34_000, price: 12_500, qty: 12, grams: 600, from: 0, mins: 320,
        img: IMG.spices, tags: VEGAN,
        desc: "Kemiri, ketumbar, dan lengkuas kering dalam kemasan ulang.",
      },
      {
        name: "Kacang & Biji-bijian Sisa Kemas", type: "dry_goods",
        original: 45_000, price: 16_000, qty: 7, grams: 900, from: 60, mins: 260,
        img: IMG.driedGoods, tags: VEGAN,
        desc: "Kacang tanah, kedelai, dan biji bunga matahari.",
      },
      {
        name: "Paket Sembako Campur Keluarga", type: "mixed",
        original: 120_000, price: 47_500, qty: 5, grams: 4_200, from: 0, mins: 280,
        img: IMG.mixedBowls, tags: VEGAN,
        desc: "Beras, minyak, gula, dan mi instan mendekati tanggal terbaik.",
      },
    ],
  },
];

const CONSUMER_EMAIL = "andi@example.com";
const SEED_EMAILS = [...MERCHANTS.map((m) => m.email), CONSUMER_EMAIL];

/** Floor price the merchant would still accept — always at or below the ask. */
const floorPriceFor = (item: SeedItem) =>
  Math.min(item.price, Math.round(item.original * 0.28));

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    // Tear down the previous run so seeding twice does not duplicate anything.
    for (const email of SEED_EMAILS) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect();

      for (const user of users) {
        const merchant = await ctx.db
          .query("merchants")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .unique();

        if (merchant) {
          const items = await ctx.db
            .query("surplusItems")
            .withIndex("by_merchant", (q) => q.eq("merchantId", merchant._id))
            .collect();

          for (const item of items) {
            // Ledger rows reference the item, so they go first.
            const events = await ctx.db
              .query("materialFlowLedger")
              .withIndex("by_rescue_item", (q) => q.eq("surplusItemId", item._id))
              .collect();
            for (const event of events) await ctx.db.delete(event._id);
            await ctx.db.delete(item._id);
          }
          await ctx.db.delete(merchant._id);
        }
        await ctx.db.delete(user._id);
      }
    }

    const now = Date.now();
    let itemCount = 0;

    for (const seed of MERCHANTS) {
      const ownerId = await ctx.db.insert("users", {
        name: seed.name,
        email: seed.email,
        passwordHash: MERCHANT_PASSWORD_HASH,
        role: "merchant",
        phone: seed.phone,
        status: "active",
        createdAt: now,
      });

      const merchantId = await ctx.db.insert("merchants", {
        ownerId,
        name: seed.name,
        businessType: seed.businessType,
        address: seed.address,
        city: "Semarang",
        latitude: seed.latitude,
        longitude: seed.longitude,
        phone: seed.phone,
        verificationStatus: "verified",
        createdAt: now,
      });

      for (const item of seed.items) {
        const surplusItemId = await ctx.db.insert("surplusItems", {
          merchantId,
          name: item.name,
          description: item.desc,
          imageUrl: item.img,
          originalPrice: item.original,
          floorPrice: floorPriceFor(item),
          currentPrice: item.price,
          initialQuantity: item.qty,
          remainingQuantity: item.soldOut ? 0 : item.qty,
          weightPerItemGrams: item.grams,
          pickupStartAt: now + item.from * MINUTE,
          pickupEndAt: now + (item.from + item.mins) * MINUTE,
          materialType: item.type,
          dietaryTags: item.tags,
          processingOnly: false,
          status: item.soldOut ? "sold_out" : "active",
          publishedAt: now,
          createdAt: now,
        });

        await recordLedgerEvent(ctx, {
          surplusItemId,
          eventType: "LISTED",
          weightDeltaGrams: item.qty * item.grams,
          actorId: ownerId,
          actorRole: "merchant",
          metadata: { seedData: true },
        });
        itemCount += 1;
      }
    }

    await ctx.db.insert("users", {
      name: "Andi Consumer",
      email: CONSUMER_EMAIL,
      passwordHash: CONSUMER_PASSWORD_HASH,
      role: "consumer",
      phone: "081234567891",
      status: "active",
      createdAt: now,
    });

    return `Demonstration data seeded: ${MERCHANTS.length} merchants, ${itemCount} Rescue Items, 1 consumer.`;
  },
});
