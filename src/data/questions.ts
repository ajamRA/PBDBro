export type SkillId =
  | "kemahiran-saintifik"
  | "sains-hayat"
  | "sains-fizikal"
  | "bumi-angkasa"
  | "aplikasi-sains";

export type OptionKey = "A" | "B" | "C" | "D";

export type Question = {
  id: string;
  subjectId: "sains-t3";
  skillId: SkillId;
  stem: string;
  options: {
    key: OptionKey;
    text: string;
  }[];
  correctAnswer: OptionKey;
  difficulty?: "mudah" | "sederhana" | "tinggi";
  imageUrl?: string;
  imageAlt?: string;
  topic?: string;
  generatedByAi?: boolean;
};

export const SKILLS: Array<{ id: SkillId; name: string }> = [
  { id: "kemahiran-saintifik", name: "Kemahiran Saintifik" },
  { id: "sains-hayat", name: "Sains Hayat" },
  { id: "sains-fizikal", name: "Sains Fizikal" },
  { id: "bumi-angkasa", name: "Bumi & Angkasa" },
  { id: "aplikasi-sains", name: "Aplikasi Sains" },
];

export const QUESTIONS: Question[] = [
  {
    id: "ks-001",
    subjectId: "sains-t3",
    skillId: "kemahiran-saintifik",
    stem: "Apakah deria yang digunakan untuk menghidu bau bunga?",
    options: [
      { key: "A", text: "Kulit" },
      { key: "B", text: "Lidah" },
      { key: "C", text: "Hidung" },
      { key: "D", text: "Telinga" },
    ],
    correctAnswer: "C",
    difficulty: "mudah",
  },
  {
    id: "ks-002",
    subjectId: "sains-t3",
    skillId: "kemahiran-saintifik",
    stem: "Antara berikut, manakah alat paling sesuai untuk mengukur panjang pensel?",
    options: [
      { key: "A", text: "Jam randik" },
      { key: "B", text: "Pembaris" },
      { key: "C", text: "Termometer" },
      { key: "D", text: "Neraca" },
    ],
    correctAnswer: "B",
    difficulty: "mudah",
  },
  {
    id: "ks-003",
    subjectId: "sains-t3",
    skillId: "kemahiran-saintifik",
    stem: "Apakah langkah pertama dalam penyiasatan saintifik?",
    options: [
      { key: "A", text: "Membuat kesimpulan" },
      { key: "B", text: "Membina jadual" },
      { key: "C", text: "Membuat pemerhatian" },
      { key: "D", text: "Melukis graf" },
    ],
    correctAnswer: "C",
    difficulty: "sederhana",
  },
  {
    id: "ks-004",
    subjectId: "sains-t3",
    skillId: "kemahiran-saintifik",
    stem: "Maklumat cuaca dicatat setiap hari selama seminggu. Aktiviti ini dipanggil apa?",
    options: [
      { key: "A", text: "Meneka" },
      { key: "B", text: "Merekod data" },
      { key: "C", text: "Menghias buku" },
      { key: "D", text: "Bermain peranan" },
    ],
    correctAnswer: "B",
    difficulty: "sederhana",
  },
  {
    id: "ks-005",
    subjectId: "sains-t3",
    skillId: "kemahiran-saintifik",
    stem: "Mengapa kita membuat ramalan sebelum menjalankan eksperimen?",
    options: [
      { key: "A", text: "Supaya eksperimen kelihatan cantik" },
      { key: "B", text: "Supaya tahu perkara yang dijangka berlaku" },
      { key: "C", text: "Supaya tidak perlu merekod data" },
      { key: "D", text: "Supaya boleh terus membuat kesimpulan" },
    ],
    correctAnswer: "B",
    difficulty: "tinggi",
  },
  {
    id: "sh-001",
    subjectId: "sains-t3",
    skillId: "sains-hayat",
    stem: "Apakah keperluan asas tumbuhan?",
    options: [
      { key: "A", text: "Bateri, wayar dan suis" },
      { key: "B", text: "Air, cahaya matahari dan udara" },
      { key: "C", text: "Plastik, kertas dan batu" },
      { key: "D", text: "Gula-gula, garam dan minyak" },
    ],
    correctAnswer: "B",
    difficulty: "mudah",
  },
  {
    id: "sh-002",
    subjectId: "sains-t3",
    skillId: "sains-hayat",
    stem: "Haiwan manakah yang bernafas menggunakan insang?",
    options: [
      { key: "A", text: "Ayam" },
      { key: "B", text: "Kucing" },
      { key: "C", text: "Ikan" },
      { key: "D", text: "Arnab" },
    ],
    correctAnswer: "C",
    difficulty: "mudah",
  },
  {
    id: "sh-003",
    subjectId: "sains-t3",
    skillId: "sains-hayat",
    stem: "Apakah fungsi akar pada tumbuhan?",
    options: [
      { key: "A", text: "Menghasilkan bunga" },
      { key: "B", text: "Menyerap air dan memegang tumbuhan" },
      { key: "C", text: "Menarik serangga" },
      { key: "D", text: "Mengubah warna daun" },
    ],
    correctAnswer: "B",
    difficulty: "sederhana",
  },
  {
    id: "sh-004",
    subjectId: "sains-t3",
    skillId: "sains-hayat",
    stem: "Antara berikut, yang manakah haiwan omnivor?",
    options: [
      { key: "A", text: "Kambing" },
      { key: "B", text: "Harimau" },
      { key: "C", text: "Ayam" },
      { key: "D", text: "Lembu" },
    ],
    correctAnswer: "C",
    difficulty: "sederhana",
  },
  {
    id: "sh-005",
    subjectId: "sains-t3",
    skillId: "sains-hayat",
    stem: "Mengapa manusia perlu makan makanan seimbang?",
    options: [
      { key: "A", text: "Untuk menjadi lebih rendah" },
      { key: "B", text: "Untuk kekal sihat dan membesar" },
      { key: "C", text: "Untuk tidur sepanjang hari" },
      { key: "D", text: "Untuk tidak perlu minum air" },
    ],
    correctAnswer: "B",
    difficulty: "tinggi",
  },
  {
    id: "sf-001",
    subjectId: "sains-t3",
    skillId: "sains-fizikal",
    stem: "Objek manakah boleh terapung di atas air?",
    options: [
      { key: "A", text: "Batu besar" },
      { key: "B", text: "Klip besi" },
      { key: "C", text: "Bola plastik" },
      { key: "D", text: "Syiling" },
    ],
    correctAnswer: "C",
    difficulty: "mudah",
  },
  {
    id: "sf-002",
    subjectId: "sains-t3",
    skillId: "sains-fizikal",
    stem: "Ais yang dibiarkan di bawah matahari akan mengalami proses apa?",
    options: [
      { key: "A", text: "Membeku" },
      { key: "B", text: "Mencair" },
      { key: "C", text: "Menjadi garam" },
      { key: "D", text: "Hilang warna" },
    ],
    correctAnswer: "B",
    difficulty: "mudah",
  },
  {
    id: "sf-003",
    subjectId: "sains-t3",
    skillId: "sains-fizikal",
    stem: "Lampu suluh tidak menyala. Apakah punca paling mungkin?",
    options: [
      { key: "A", text: "Bateri habis" },
      { key: "B", text: "Lampu terlalu terang" },
      { key: "C", text: "Suis terlalu besar" },
      { key: "D", text: "Warna lampu gelap" },
    ],
    correctAnswer: "A",
    difficulty: "sederhana",
  },
  {
    id: "sf-004",
    subjectId: "sains-t3",
    skillId: "sains-fizikal",
    stem: "Bunyi dihasilkan apabila sesuatu objek melakukan apa?",
    options: [
      { key: "A", text: "Bergetar" },
      { key: "B", text: "Bergerak perlahan sahaja" },
      { key: "C", text: "Menjadi sejuk" },
      { key: "D", text: "Menjadi basah" },
    ],
    correctAnswer: "A",
    difficulty: "sederhana",
  },
  {
    id: "sf-005",
    subjectId: "sains-t3",
    skillId: "sains-fizikal",
    stem: "Manakah bahan yang merupakan konduktor elektrik yang baik?",
    options: [
      { key: "A", text: "Plastik" },
      { key: "B", text: "Kayu" },
      { key: "C", text: "Getah" },
      { key: "D", text: "Sudu logam" },
    ],
    correctAnswer: "D",
    difficulty: "tinggi",
  },
  {
    id: "ba-001",
    subjectId: "sains-t3",
    skillId: "bumi-angkasa",
    stem: "Bumi berputar pada paksinya menyebabkan kejadian apa?",
    options: [
      { key: "A", text: "Musim hujan" },
      { key: "B", text: "Siang dan malam" },
      { key: "C", text: "Gempa bumi" },
      { key: "D", text: "Pelangi" },
    ],
    correctAnswer: "B",
    difficulty: "mudah",
  },
  {
    id: "ba-002",
    subjectId: "sains-t3",
    skillId: "bumi-angkasa",
    stem: "Bintang yang paling hampir dengan Bumi ialah apa?",
    options: [
      { key: "A", text: "Bulan" },
      { key: "B", text: "Matahari" },
      { key: "C", text: "Marikh" },
      { key: "D", text: "Zuhrah" },
    ],
    correctAnswer: "B",
    difficulty: "mudah",
  },
  {
    id: "ba-003",
    subjectId: "sains-t3",
    skillId: "bumi-angkasa",
    stem: "Mengapa Bulan kelihatan bercahaya pada waktu malam?",
    options: [
      { key: "A", text: "Bulan menghasilkan cahaya sendiri" },
      { key: "B", text: "Bulan memantulkan cahaya Matahari" },
      { key: "C", text: "Bulan mempunyai lampu" },
      { key: "D", text: "Bulan diperbuat daripada api" },
    ],
    correctAnswer: "B",
    difficulty: "sederhana",
  },
  {
    id: "ba-004",
    subjectId: "sains-t3",
    skillId: "bumi-angkasa",
    stem: "Cuaca mendung dan gelap biasanya menandakan keadaan apa?",
    options: [
      { key: "A", text: "Hari panas terik" },
      { key: "B", text: "Kemungkinan hujan" },
      { key: "C", text: "Kemungkinan salji di Malaysia" },
      { key: "D", text: "Kemungkinan ribut pasir" },
    ],
    correctAnswer: "B",
    difficulty: "sederhana",
  },
  {
    id: "ba-005",
    subjectId: "sains-t3",
    skillId: "bumi-angkasa",
    stem: "Arah Matahari terbit ialah arah mana?",
    options: [
      { key: "A", text: "Barat" },
      { key: "B", text: "Timur" },
      { key: "C", text: "Utara" },
      { key: "D", text: "Selatan" },
    ],
    correctAnswer: "B",
    difficulty: "tinggi",
  },
  {
    id: "as-001",
    subjectId: "sains-t3",
    skillId: "aplikasi-sains",
    stem: "Mengapa kita perlu menutup suis lampu selepas digunakan?",
    options: [
      { key: "A", text: "Supaya mentol cepat rosak" },
      { key: "B", text: "Untuk menjimatkan tenaga elektrik" },
      { key: "C", text: "Supaya bil elektrik meningkat" },
      { key: "D", text: "Supaya rumah menjadi lebih panas" },
    ],
    correctAnswer: "B",
    difficulty: "mudah",
  },
  {
    id: "as-002",
    subjectId: "sains-t3",
    skillId: "aplikasi-sains",
    stem: "Apakah tindakan paling selamat semasa menggunakan gunting?",
    options: [
      { key: "A", text: "Berlari sambil memegang gunting" },
      { key: "B", text: "Menghalakan hujung gunting kepada rakan" },
      { key: "C", text: "Menggunakannya dengan berhati-hati di tempat duduk" },
      { key: "D", text: "Melempar gunting kepada rakan" },
    ],
    correctAnswer: "C",
    difficulty: "mudah",
  },
  {
    id: "as-003",
    subjectId: "sains-t3",
    skillId: "aplikasi-sains",
    stem: "Mengapa sampah kertas, plastik dan kaca perlu diasingkan?",
    options: [
      { key: "A", text: "Untuk dibuang lebih jauh" },
      { key: "B", text: "Untuk kitar semula" },
      { key: "C", text: "Untuk menjadikannya lebih berat" },
      { key: "D", text: "Untuk dibakar bersama-sama" },
    ],
    correctAnswer: "B",
    difficulty: "sederhana",
  },
  {
    id: "as-004",
    subjectId: "sains-t3",
    skillId: "aplikasi-sains",
    stem: "Semasa cuaca panas, mengapa pakaian berwarna cerah lebih sesuai dipakai?",
    options: [
      { key: "A", text: "Menyerap lebih banyak haba" },
      { key: "B", text: "Memantulkan lebih banyak haba" },
      { key: "C", text: "Lebih berat" },
      { key: "D", text: "Tidak boleh basah" },
    ],
    correctAnswer: "B",
    difficulty: "sederhana",
  },
  {
    id: "as-005",
    subjectId: "sains-t3",
    skillId: "aplikasi-sains",
    stem: "Apakah kegunaan termometer di rumah?",
    options: [
      { key: "A", text: "Mengukur panjang meja" },
      { key: "B", text: "Mengukur suhu badan" },
      { key: "C", text: "Mengira masa" },
      { key: "D", text: "Menimbang berat badan" },
    ],
    correctAnswer: "B",
    difficulty: "tinggi",
  },
];
