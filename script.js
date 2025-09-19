// ========= Data Game =========
// Bagian 1: Perubahan Wujud
const WUJUD_PAIRS = [
  { key: "Padat>Cair", label: "Padat → Cair", answer: "Mencair" },
  { key: "Cair>Padat", label: "Cair → Padat", answer: "Membeku" },
  { key: "Cair>Gas",   label: "Cair → Gas",   answer: "Menguap" },
  { key: "Gas>Cair",   label: "Gas → Cair",   answer: "Mengembun" },
  { key: "Padat>Gas",  label: "Padat → Gas",  answer: "Menyublim" },
  { key: "Gas>Padat",  label: "Gas → Padat",  answer: "Deposisi (Mengkristal)" },
];

// Bagian 2: Perubahan Energi (berdasarkan contoh dari kamu)
const ENERGI_PAIRS = [
  { key: "Lampu",    label: "Lampu Menyala",        answer: "Listrik → Cahaya" },
  { key: "Kipas",    label: "Kipas Angin",          answer: "Listrik → Gerak" },
  { key: "Bensin",   label: "Pembakaran Bensin",    answer: "Kimia → Panas + Gerak" },
  { key: "Kompor",   label: "Kompor Gas",           answer: "Kimia → Panas" },
  { key: "Surya",    label: "Panel Surya",          answer: "Cahaya → Listrik" },
  { key: "Musik",    label: "Alat Musik",           answer: "Gerak → Bunyi" },
  { key: "Ponsel",   label: "Ponsel",               answer: "Kimia → Listrik → Bunyi + Cahaya" },
  { key: "Komputer", label: "Komputer / Laptop",    answer: "Listrik → Cahaya + Bunyi" },
];

// ========= Utilitas Umum =========
function shuffleInPlace(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const sec = (s%60).toString().padStart(2,'0');
  return `${m}:${sec}`;
}

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

// ========= Kelas Game DragDrop =========
class DragDropGame {
  constructor({ pairs, ids, bestKey }){
    this.pairs = pairs;
    this.ids = ids;
    this.bestKey = bestKey;

    // State
    this.correctCount = 0;
    this.started = false;
    this.timer = null;
    this.seconds = 0;

    // Elemen
    this.labelListEl = $(ids.labelList);
    this.dropzonesContainer = $(ids.dropzones);
    this.progressEl = $(ids.progress);
    this.timerEl = $(ids.timer);
    this.bestEl = $(ids.best);
    this.btnShuffle = $(ids.btnShuffle);
    this.btnReset = $(ids.btnReset);
    this.btnHelp = $(ids.btnHelp);
    this.helpModal = $(ids.helpModal);
    this.btnHelpClose = $(ids.btnHelpClose);

    this.toast = $('#win-toast');

    this.init();
  }

  init(){
    this.buildLabels();
    this.attachDropEvents();
    this.updateBestLabel();

    // Tombol kontrol
    this.btnShuffle?.addEventListener('click', () => this.shuffleLabels());
    this.btnReset?.addEventListener('click', () => this.resetGame());

    // Modal
    this.btnHelp?.addEventListener('click', () => this.helpModal?.classList.remove('hidden'));
    this.btnHelpClose?.addEventListener('click', () => this.helpModal?.classList.add('hidden'));
    this.helpModal?.addEventListener('click', (e) => {
      if (e.target === this.helpModal) this.helpModal.classList.add('hidden');
    });
  }

  get labelPool(){
    return this.pairs.map(p => p.answer);
  }

  buildLabels(){
    if (!this.labelListEl) return;
    this.labelListEl.innerHTML = '';
    const labels = shuffleInPlace([...this.labelPool]);
    labels.forEach(text => {
      const chip = document.createElement('div');
      chip.className = 'label-chip';
      chip.draggable = true;
      chip.textContent = text;
      chip.setAttribute('role','button');
      chip.setAttribute('aria-grabbed','false');

      chip.addEventListener('dragstart', e => {
        this.startTimerIfNeeded();
        e.dataTransfer.setData('text/plain', text);
        e.dataTransfer.effectAllowed = 'move';
        chip.style.opacity = '0.6';
        chip.setAttribute('aria-grabbed','true');
      });
      chip.addEventListener('dragend', () => {
        chip.style.opacity = '1';
        chip.setAttribute('aria-grabbed','false');
      });

      this.labelListEl.appendChild(chip);
    });
  }

  attachDropEvents(){
    const rows = $all('.drop-row', this.dropzonesContainer);
    rows.forEach(row => {
      const dz = $('.dropzone', row);
      dz.addEventListener('dragover', e => {
        e.preventDefault();
        dz.classList.add('hover');
        e.dataTransfer.dropEffect = 'move';
      });
      dz.addEventListener('dragleave', () => dz.classList.remove('hover'));
      dz.addEventListener('drop', e => {
        e.preventDefault();
        dz.classList.remove('hover');

        if (dz.classList.contains('correct')) return;

        const droppedText = e.dataTransfer.getData('text/plain');
        const key = row.dataset.key;
        const pair = this.pairs.find(p => p.key === key);

        if (pair && pair.answer === droppedText){
          dz.classList.remove('wrong');
          dz.classList.add('correct');
          dz.textContent = '';
          const pill = document.createElement('div');
          pill.className = 'label-chip';
          pill.textContent = droppedText;
          pill.draggable = false;
          dz.appendChild(pill);

          // Remove from label bank
          const chip = Array.from(this.labelListEl.querySelectorAll('.label-chip'))
                            .find(c => c.textContent === droppedText);
          if (chip) chip.remove();

          this.correctCount++;
          this.progressEl.textContent = `${this.correctCount}`;

          if (this.correctCount === this.pairs.length){
            this.stopTimer();
            const best = this.getBest();
            if (!best || Number(best) > this.seconds){
              this.setBest(String(this.seconds));
              this.updateBestLabel();
              this.showToast(`Rekor baru! Selesai dalam ${formatTime(this.seconds)} 🎉`, 3200);
            } else {
              this.showToast(`Hebat! Semua benar dalam ${formatTime(this.seconds)} 🎉`, 2800);
            }
          }
        } else {
          dz.classList.add('wrong');
          setTimeout(()=> dz.classList.remove('wrong'), 400);
          if (navigator.vibrate) navigator.vibrate(80);
        }
      });
    });
  }

  // Timer
  startTimerIfNeeded(){
    if (!this.started){
      this.started = true;
      this.timer = setInterval(() => {
        this.seconds++;
        this.timerEl.textContent = formatTime(this.seconds);
      }, 1000);
    }
  }
  stopTimer(){
    if (this.timer){
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Rekor
  getBest(){
    // Migrasi dari versi lama (jika ada)
    if (this.bestKey === 'best_time_wujud'){
      const old = localStorage.getItem('best_time_phase');
      if (old && !localStorage.getItem(this.bestKey)){
        localStorage.setItem(this.bestKey, old);
      }
    }
    return localStorage.getItem(this.bestKey) || null;
  }
  setBest(s){ localStorage.setItem(this.bestKey, s); }
  updateBestLabel(){
    const best = this.getBest();
    this.bestEl.textContent = best ? formatTime(Number(best)) : '—';
  }

  // Kontrol
  resetGame(){
    this.stopTimer();
    this.started = false;
    this.seconds = 0;
    this.timerEl.textContent = '00:00';
    this.correctCount = 0;
    this.progressEl.textContent = '0';

    // Bersihkan dropzone
    $all('.dropzone', this.dropzonesContainer).forEach(dz => {
      dz.classList.remove('correct','wrong','hover');
      dz.textContent = 'Taruh label di sini';
      // Kembalikan placeholder WUJUD yang beda teks?
      if (this.bestKey === 'best_time_wujud'){
        dz.textContent = 'Taruh label proses di sini';
      }
    });

    // Bangun ulang label
    this.buildLabels();
  }

  shuffleLabels(){ this.buildLabels(); }

  showToast(msg, duration=2000){
    this.toast.textContent = msg;
    this.toast.classList.remove('hidden');
    setTimeout(()=> this.toast.classList.add('hidden'), duration);
  }
}

// ========= Tabs =========
function initTabs(games){
  const tabButtons = $all('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetSel = btn.dataset.target;
      $all('.section').forEach(sec => sec.classList.add('hidden'));
      $(targetSel).classList.remove('hidden');

      // Hentikan timer saat berpindah tab (biar tidak terus jalan)
      games.forEach(g => g.stopTimer());
    });
  });
}

// ========= Inisialisasi Halaman =========
(function init(){
  const wujudGame = new DragDropGame({
    pairs: WUJUD_PAIRS,
    ids: {
      labelList: '#label-list-w',
      dropzones: '#dropzones-w',
      progress: '#progress-w',
      timer: '#timer-w',
      best: '#best-w',
      btnShuffle: '#btn-shuffle-w',
      btnReset: '#btn-reset-w',
      btnHelp: '#btn-bantuan-w',
      helpModal: '#help-modal-w',
      btnHelpClose: '#btn-close-help-w',
    },
    bestKey: 'best_time_wujud'
  });

  const energiGame = new DragDropGame({
    pairs: ENERGI_PAIRS,
    ids: {
      labelList: '#label-list-e',
      dropzones: '#dropzones-e',
      progress: '#progress-e',
      timer: '#timer-e',
      best: '#best-e',
      btnShuffle: '#btn-shuffle-e',
      btnReset: '#btn-reset-e',
      btnHelp: '#btn-bantuan-e',
      helpModal: '#help-modal-e',
      btnHelpClose: '#btn-close-help-e',
    },
    bestKey: 'best_time_energi'
  });

  initTabs([wujudGame, energiGame]);
})();
