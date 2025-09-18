// ====== Data dasar game ======
const PAIRS = [
  { from: "Padat", to: "Cair", answer: "Mencair" },                 // melting
  { from: "Cair",  to: "Padat", answer: "Membeku" },                // freezing
  { from: "Cair",  to: "Gas",   answer: "Menguap" },                // evaporation
  { from: "Gas",   to: "Cair",  answer: "Mengembun" },              // condensation
  { from: "Padat", to: "Gas",   answer: "Menyublim" },              // sublimation
  { from: "Gas",   to: "Padat", answer: "Deposisi (Mengkristal)" }, // deposition
];

const LABELS = PAIRS.map(p => p.answer); // 6 label unik

// ====== Elemen UI ======
const labelListEl = document.getElementById('label-list');
const dropzonesContainer = document.getElementById('dropzones');
const progressEl = document.getElementById('progress').querySelector('b');
const timerEl = document.getElementById('timer').querySelector('b');
const bestEl = document.getElementById('best').querySelector('b');
const btnShuffle = document.getElementById('btn-shuffle');
const btnReset = document.getElementById('btn-reset');
const btnHelp = document.getElementById('btn-bantuan');
const btnHelpClose = document.getElementById('btn-close-help');
const helpModal = document.getElementById('help-modal');
const winToast = document.getElementById('win-toast');

let correctCount = 0;
let started = false;
let timer = null;
let seconds = 0;

// ====== Utilitas ======
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

function startTimerIfNeeded(){
  if (!started){
    started = true;
    timer = setInterval(() => {
      seconds++;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }
}

function stopTimer(){
  if (timer){
    clearInterval(timer);
    timer = null;
  }
}

function getBest(){
  return localStorage.getItem('best_time_phase') || null;
}
function setBest(s){
  localStorage.setItem('best_time_phase', s);
}
function updateBestLabel(){
  const best = getBest();
  bestEl.textContent = best ? formatTime(Number(best)) : '—';
}

function showToast(msg, duration=2000){
  winToast.textContent = msg;
  winToast.classList.remove('hidden');
  setTimeout(()=> winToast.classList.add('hidden'), duration);
}

// ====== Label & Dropzone ======
function buildLabels(){
  labelListEl.innerHTML = '';
  const labels = shuffleInPlace([...LABELS]);
  labels.forEach(text => {
    const chip = document.createElement('div');
    chip.className = 'label-chip';
    chip.draggable = true;
    chip.textContent = text;
    chip.setAttribute('role','button');
    chip.setAttribute('aria-grabbed','false');

    // Events drag
    chip.addEventListener('dragstart', e => {
      startTimerIfNeeded();
      e.dataTransfer.setData('text/plain', text);
      e.dataTransfer.effectAllowed = 'move';
      chip.style.opacity = '0.6';
      chip.setAttribute('aria-grabbed','true');
    });
    chip.addEventListener('dragend', () => {
      chip.style.opacity = '1';
      chip.setAttribute('aria-grabbed','false');
    });

    labelListEl.appendChild(chip);
  });
}

function attachDropEvents(){
  const rows = dropzonesContainer.querySelectorAll('.drop-row');
  rows.forEach(row => {
    const dz = row.querySelector('.dropzone');
    dz.addEventListener('dragover', e => {
      e.preventDefault();
      dz.classList.add('hover');
      e.dataTransfer.dropEffect = 'move';
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('hover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('hover');

      // Sudah benar & terkunci?
      if (dz.classList.contains('correct')) return;

      const droppedText = e.dataTransfer.getData('text/plain');
      const from = row.dataset.from;
      const to = row.dataset.to;
      const pair = PAIRS.find(p => p.from === from && p.to === to);

      if (pair && pair.answer === droppedText){
        // Tandai benar
        dz.classList.remove('wrong');
        dz.classList.add('correct');
        dz.textContent = '';
        const pill = document.createElement('div');
        pill.className = 'label-chip';
        pill.textContent = droppedText;
        pill.draggable = false;
        dz.appendChild(pill);

        // Hapus label dari baki
        const chips = [...labelListEl.querySelectorAll('.label-chip')];
        const chip = chips.find(c => c.textContent === droppedText);
        if (chip) chip.remove();

        correctCount++;
        progressEl.textContent = `${correctCount}`;

        // Selesai?
        if (correctCount === PAIRS.length){
          stopTimer();
          // Rekor terbaik
          const best = getBest();
          if (!best || Number(best) > seconds){
            setBest(String(seconds));
            updateBestLabel();
            showToast(`Rekor baru! Selesai dalam ${formatTime(seconds)} 🎉`, 3200);
          } else {
            showToast(`Hebat! Semua benar dalam ${formatTime(seconds)} 🎉`, 2800);
          }
        }
      } else {
        // Salah → animasi goyang dan vibrate bila ada
        dz.classList.add('wrong');
        setTimeout(()=> dz.classList.remove('wrong'), 400);
        if (navigator.vibrate) navigator.vibrate(80);
      }
    });
  });
}

// ====== Kontrol ======
function resetGame(){
  stopTimer();
  started = false;
  seconds = 0;
  timerEl.textContent = '00:00';
  correctCount = 0;
  progressEl.textContent = '0';

  // Bersihkan dropzone
  const dzs = dropzonesContainer.querySelectorAll('.dropzone');
  dzs.forEach(dz => {
    dz.classList.remove('correct','wrong','hover');
    dz.textContent = 'Taruh label proses di sini';
  });

  // Bangun ulang label
  buildLabels();
}

function shuffleLabels(){
  buildLabels();
}

// ====== Modal bantuan ======
btnHelp.addEventListener('click', () => helpModal.classList.remove('hidden'));
btnHelpClose.addEventListener('click', () => helpModal.classList.add('hidden'));
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) helpModal.classList.add('hidden');
});

// ====== Init ======
(function init(){
  buildLabels();
  attachDropEvents();
  updateBestLabel();

  // Tombol
  btnShuffle.addEventListener('click', shuffleLabels);
  btnReset.addEventListener('click', resetGame);
})();
