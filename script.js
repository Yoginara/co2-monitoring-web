// === KREDENSIAL SUPABASE CLOUD ===
const SUPABASE_URL = "https://fjxqacuifwiyowblnzkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeHFhY3VpZndpeW93YmxuemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTYyNzksImV4cCI6MjA5NDk5MjI3OX0.cF7AG0WrGQ7ZS638YkOVpR-KnultzgL3ieKEEZFnrCw";

// Inisialisasi Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let data = []; // Menyimpan data real-time dashboard
let dataHistorisFiltered = []; // Menyimpan data hasil filter halaman historis

// === Inisialisasi Chart ===
const ctx = document.getElementById("co2Chart").getContext("2d");
const co2Chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Kadar CO₂ (ppm)",
      data: [],
      borderColor: "rgb(54, 162, 235)",
      backgroundColor: "rgba(54, 162, 235, 0.1)",
      fill: true,
      tension: 0.3,
      pointRadius: 5,
      pointBackgroundColor: [],
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "ppm" } },
      x: { title: { display: true, text: "Waktu Pengamatan" } }
    }
  }
});

function colorPoint(value) {
  if (value >= 2000) return "#ef4444";
  if (value >= 1000) return "#f97316";
  if (value >= 700) return "#f59e0b";
  return "#10b981";
}

// === Render Data ke Tabel Historis ===
function renderTable(dataset) {
  const tableBody = document.getElementById("dataTable");
  if (!tableBody) return;

  if (dataset.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="2" class="px-6 py-4 text-center text-gray-400">Tidak ada data. Pilih rentang tanggal terlebih dahulu.</td></tr>`;
    return;
  }

  tableBody.innerHTML = dataset.map(item => {
    const dateFormatted = new Date(item.waktu).toLocaleString("id-ID");
    return `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-6 py-4 text-center border-b border-gray-200">${dateFormatted}</td>
        <td class="px-6 py-4 text-center font-semibold border-b border-gray-200 text-slate-700">${item.co2} ppm</td>
      </tr>
    `;
  }).join("");
}

// === Update Status Indikator Card ===
function updateStatus() {
  if (data.length === 0) return;

  const latest = data[data.length - 1].co2;
  const statusLabel = document.getElementById("statusLabel");
  const latestValue = document.getElementById("latestValue");

  if (!statusLabel || !latestValue) return;

  latestValue.textContent = `${latest} ppm`;

  // Klasifikasi 4 Status Udara
  if (latest >= 2000) {
    statusLabel.textContent = "Berbahaya / Kritis";
    statusLabel.className = "inline-block text-xs md:text-sm font-bold px-4 py-1.5 rounded-full bg-red-100 text-red-700 shadow-sm";
  } else if (latest >= 1000) {
    statusLabel.textContent = "Buruk / Udara Sumpek";
    statusLabel.className = "inline-block text-xs md:text-sm font-bold px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 shadow-sm";
  } else if (latest >= 700) {
    statusLabel.textContent = "Waspada / Kurang Ventilasi";
    statusLabel.className = "inline-block text-xs md:text-sm font-bold px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 shadow-sm";
  } else {
    statusLabel.textContent = "Aman / Normal Sehat";
    statusLabel.className = "inline-block text-xs md:text-sm font-bold px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 shadow-sm";
  }
}

function updateChart(dataset) {
  co2Chart.data.labels = dataset.map(item => new Date(item.waktu).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }));
  co2Chart.data.datasets[0].data = dataset.map(item => item.co2);
  co2Chart.data.datasets[0].pointBackgroundColor = dataset.map(item => colorPoint(item.co2));
  co2Chart.update();
}

// === Filter Grafik Dashboard ===
function applyTimeFilter() {
  const startInput = document.getElementById("startTime").value;
  const endInput = document.getElementById("endTime").value;
  if (!startInput || !endInput) return alert("Isi kedua rentang waktu terlebih dahulu.");

  const start = new Date(startInput);
  const end = new Date(endInput);
  const filtered = data.filter(item => {
    const waktu = new Date(item.waktu);
    return waktu >= start && waktu <= end;
  });
  updateChart(filtered);
}

function resetGraph() {
  updateChart(data);
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
}

// === Ambil Data Dashboard (50 Data Terbaru) ===
async function fetchInitialData() {
  const { data: supabaseData, error } = await supabase
    .from('co2_data')
    .select('created_at, co2')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error("Gagal memuat data dashboard:", error);
    document.getElementById("connectionStatus").textContent = "❌ Status Koneksi: Gagal Terhubung!";
    document.getElementById("connectionStatus").className = "text-sm text-red-600 mt-1 font-medium";
  } else if (supabaseData) {
    document.getElementById("connectionStatus").textContent = "🟢 Status Koneksi: Terhubung ke Supabase Cloud (Live)";
    document.getElementById("connectionStatus").className = "text-sm text-emerald-600 mt-1 font-medium";

    data = supabaseData.map(row => ({ waktu: row.created_at, co2: row.co2 }));
    updateChart(data);
    updateStatus();
  }
}

// === LOGIKA HALAMAN HISTORIS (FILTER DATABASE SUPABASE) ===
document.getElementById("filterForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  // Mengatur batas akhir hari sampai jam 23:59:59
  const startISO = new Date(startDate).toISOString();
  const endISO = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();

  // Memanggil data langsung dari database Supabase berdasarkan rentang waktu pilihan
  const { data: historisData, error } = await supabase
    .from('co2_data')
    .select('created_at, co2')
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: true });

  if (error) {
    alert("Gagal memuat data historis!");
    console.error(error);
  } else {
    dataHistorisFiltered = historisData.map(row => ({ waktu: row.created_at, co2: row.co2 }));
    renderTable(dataHistorisFiltered);
  }
});

// === LOGIKA EXPORT KE EXCEL / DOWNLOAD CSV ===
function downloadCSV() {
  if (dataHistorisFiltered.length === 0) return alert("Tampilkan data historis terlebih dahulu sebelum mengunduh!");

  // Membuat susunan header kolom file CSV
  let csvContent = "data:text/csv;charset=utf-8,Waktu,Kadar CO2 (ppm)\n";

  // Memasukkan isi tabel baris demi baris ke format CSV
  dataHistorisFiltered.forEach(item => {
    const dateFormatted = new Date(item.waktu).toLocaleString("id-ID").replace(",", "");
    csvContent += `${dateFormatted},${item.co2}\n`;
  });

  // Membuat tautan unduh otomatis di browser internet
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `log_co2_basement_${new Date().toLocaleDateString("id-ID")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// === Real-Time Listener untuk Dashboard ===
supabase
  .channel('perubahan-co2-realtime')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'co2_data' }, payload => {
    const newData = { waktu: payload.new.created_at, co2: payload.new.co2 };
    data.push(newData);
    // Hanya update dashboard chart jika data masuk saat membuka halaman dashboard
    if (document.getElementById('dashboard').classList.contains('active')) {
      updateChart(data);
      updateStatus();
    }
  })
  .subscribe();

// === Navigasi Struktur Halaman Konten ===
function showSection(sectionId) {
  document.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");

  // Jika pindah ke halaman historis, kosongkan atau render data terakhir yang difilter
  if (sectionId === 'historis') {
    renderTable(dataHistorisFiltered);
  }
}

// Jalankan pencarian data awal
fetchInitialData();