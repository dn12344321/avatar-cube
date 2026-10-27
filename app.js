// Прототип аватара в инфокубе — логика навигации по сценарию

(function () {
  const speechText = document.getElementById('speechText');
  const speechButtons = document.getElementById('speechButtons');
  const speechQr = document.getElementById('speechQr');
  const speechPanel = document.getElementById('speechPanel');
  const poseIdle = document.getElementById('poseIdle');
  const poseWave = document.getElementById('poseWave');
  const poseTalk = document.getElementById('poseTalk');
  const poses = { idle: poseIdle, wave: poseWave, talk: poseTalk };
  const sideLeft = document.getElementById('sideLeft');
  const sideRight = document.getElementById('sideRight');
  const endDialogBtn = document.getElementById('endDialogBtn');
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');

  let currentId = 'main';
  let history = [];
  let inDialog = false; // true когда пользователь внутри раздела (не в главном меню)

  // ---------- Часы ----------
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    clockTime.textContent = `${hh}:${mm}`;
    const days = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
    const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    clockDate.textContent = `${now.getDate()} ${months[now.getMonth()]}, ${days[now.getDay()]}`;
  }
  updateClock();
  setInterval(updateClock, 30000);

  // ---------- Получение узла ----------
  function getNode(id) {
    if (id === 'main') return MAIN_MENU;
    return SCENARIO[id];
  }

  // ---------- Рендер боковых служебных кнопок ----------
  function renderSideButtons() {
    sideLeft.innerHTML = '';
    sideRight.innerHTML = '';

    // Левая колонка: главное меню, собеседование, селфи
    const leftItems = [
      { icon: '🏠', label: 'Главное\nменю', action: () => goTo('main') },
      { icon: '👤', label: 'Собеседование\nс Александрой', action: () => goTo('4') },
      { icon: '📷', label: 'Сделать\nселфи', action: () => goTo('6') },
    ];
    leftItems.forEach(item => sideLeft.appendChild(makeIconButton(item)));

    // Правая колонка: разделы сценария
    const rightItems = [
      { icon: '💬', label: 'ИТ-кластер\nтранспорта', action: () => goTo('1') },
      { icon: '🧳', label: 'Вакансии\nИТ-кластера', action: () => goTo('2') },
      { icon: '⭐', label: 'Почему\nмы', action: () => goTo('3') },
      { icon: '🏛', label: 'О выставке', action: () => goTo('5') },
    ];
    rightItems.forEach(item => sideRight.appendChild(makeIconButton(item)));
  }

  function makeIconButton({ icon, label, action, disabled }) {
    const btn = document.createElement('button');
    btn.className = 'icon-btn' + (disabled ? ' disabled' : '');
    btn.innerHTML = `<div class="icon-circle">${icon}</div><div>${label.replace(/\n/g, '<br>')}</div>`;
    if (!disabled) btn.addEventListener('click', action);
    return btn;
  }

  // ---------- Навигация ----------
  function goTo(id, pushHistory = true) {
    if (pushHistory && currentId !== id) {
      history.push(currentId);
    }

    // Спец-логика узла "4": случайное приветствие
    if (id === '4') {
      const randomGreeting = GREETING_IDS[Math.floor(Math.random() * GREETING_IDS.length)];
      currentId = randomGreeting;
      render(SCENARIO[randomGreeting], { isGreeting: true });
      return;
    }

    currentId = id;
    const node = getNode(id);
    if (!node) {
      console.warn('Узел не найден:', id);
      return;
    }
    render(node, { isGreeting: false });
  }

  // ---------- Рендер диалога ----------
  function render(node, opts) {
    opts = opts || {};
    // Анимация смены реплики
    speechPanel.style.animation = 'none';
    requestAnimationFrame(() => { speechPanel.style.animation = ''; });

    speechText.textContent = node.text || '';

    // Кнопки сценария
    speechButtons.innerHTML = '';
    (node.buttons || []).forEach((btn, idx) => {
      const b = document.createElement('button');
      b.className = 'scenario-btn' + (idx === 0 && node.buttons.length <= 2 ? ' primary' : '');
      b.textContent = btn.label;
      b.addEventListener('click', () => {
        playAnswerAnimation();
        goTo(btn.to);
      });
      speechButtons.appendChild(b);
    });

    // Кнопка "Назад" по истории, если у узла нет своей кнопки "Назад"/"Главное меню"
    const hasBack = (node.buttons || []).some(b => /назад|главное меню/i.test(b.label));
    if (!hasBack && history.length > 0) {
      const backBtn = document.createElement('button');
      backBtn.className = 'scenario-btn';
      backBtn.textContent = '← Назад';
      backBtn.addEventListener('click', () => {
        const prev = history.pop();
        goTo(prev, false);
      });
      speechButtons.appendChild(backBtn);
    }

    // QR-коды
    speechQr.innerHTML = '';
    const qrList = (typeof QR_DATA !== 'undefined') ? QR_DATA[node.id] : null;
    if (qrList) {
      qrList.forEach(qr => {
        const chip = document.createElement('div');
        chip.className = 'qr-chip';
        chip.innerHTML = `<div class="qr-box"></div><div>${qr.label}</div>`;
        chip.title = qr.url;
        speechQr.appendChild(chip);
      });
    }

    // Анимация ответа аватара
    playAnswerAnimation(opts.isGreeting);
  }

  // ---------- Переключение поз ----------
  function setActivePose(name) {
    Object.keys(poses).forEach(key => {
      poses[key].classList.toggle('active', key === name);
    });
  }

  function playAnswerAnimation(isGreeting) {
    // сброс анимационных классов на всех позах
    Object.values(poses).forEach(el => el.classList.remove('nod', 'talking'));

    if (isGreeting) {
      // Взмах рукой при приветствии: idle -> wave -> idle
      setActivePose('wave');
      setTimeout(() => setActivePose('idle'), 1400);
    } else {
      // Жест руками при ответе: idle -> talk -> idle, + лёгкий кивок
      setActivePose('talk');
      const activeEl = poses.talk;
      void activeEl.offsetWidth; // reflow для перезапуска анимации
      activeEl.classList.add('nod', 'talking');
      setTimeout(() => {
        setActivePose('idle');
      }, 1600);
    }
  }

  // ---------- Завершить диалог ----------
  endDialogBtn.addEventListener('click', () => {
    history = [];
    goTo('main', false);
  });

  // ---------- Старт ----------
  renderSideButtons();
  goTo('main', false);
})();
