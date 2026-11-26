(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};

  function buildWhatsAppUrl(messageText) {
    var num = String(cfg.whatsappNumber || '79142727260').replace(/\D/g, '');
    var text = messageText || cfg.whatsappDefaultText || 'Здравствуйте!';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  function applyConfigToDom() {
    document.querySelectorAll('[data-config-text]').forEach(function (el) {
      var key = el.getAttribute('data-config-text');
      var parts = key.split('.');
      var val = cfg;
      for (var i = 0; i < parts.length; i += 1) {
        val = val && val[parts[i]];
      }
      if (typeof val === 'string' && val.length > 0) {
        el.textContent = val;
      }
    });

    document.querySelectorAll('[data-phone-link]').forEach(function (el) {
      el.setAttribute('href', 'tel:' + (cfg.phoneRaw || '+79142727260'));
      if (el.hasAttribute('data-phone-display')) {
        el.textContent = cfg.phoneDisplay || '+7 (914) 272-72-60';
      }
    });

    document.querySelectorAll('[data-wa-link]').forEach(function (el) {
      var customText = el.getAttribute('data-wa-text');
      el.setAttribute('href', buildWhatsAppUrl(customText));
    });

    document.querySelectorAll('[data-2gis-link]').forEach(function (el) {
      el.setAttribute('href', cfg.twoGisUrl || 'https://2gis.ru/yakutsk/geo/70000001030713332');
    });

    var seasonalEnabled = !(cfg.seasonal && cfg.seasonal.enabled === false);
    if (!seasonalEnabled) {
      document.querySelectorAll('[data-seasonal-el]').forEach(function (el) {
        el.style.display = 'none';
      });
      var catalogGrid = document.getElementById('catalogGrid');
      if (catalogGrid) {
        catalogGrid.classList.add('no-seasonal');
      }
    }
  }

  /* ========================================================================
     1. Живой статус работы по времени Якутска (Asia/Yakutsk, UTC+9)
     ======================================================================== */
  function getYakutskTimeParts() {
    var tz = (cfg.schedule && cfg.schedule.timezone) || 'Asia/Yakutsk';
    var formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    var parts = formatter.formatToParts(new Date());
    var hour = 0;
    var minute = 0;
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i].type === 'hour') hour = parseInt(parts[i].value, 10);
      if (parts[i].type === 'minute') minute = parseInt(parts[i].value, 10);
    }
    if (hour === 24) hour = 0;
    var hh = String(hour).padStart(2, '0');
    var mm = String(minute).padStart(2, '0');
    return {
      hour: hour,
      minute: minute,
      totalMinutes: hour * 60 + minute,
      formatted: hh + ':' + mm
    };
  }

  function updateYakutskStatus() {
    var sched = cfg.schedule || {};
    var openMin = (sched.openHour != null ? sched.openHour : 9) * 60 + (sched.openMinute || 0);
    var closeMin = (sched.closeHour != null ? sched.closeHour : 19) * 60 + (sched.closeMinute || 0);
    var now = getYakutskTimeParts();
    var isOpen = now.totalMinutes >= openMin && now.totalMinutes < closeMin;
    var closingSoon = isOpen && (closeMin - now.totalMinutes) <= 30;

    var compactLabel = isOpen
      ? (closingSoon ? 'Открыто · до 19:00' : 'Открыто · до 19:00')
      : 'Откроемся в 09:00';

    var fullLabel = isOpen
      ? 'Сейчас в Якутске ' + now.formatted + ' · Открыто до 19:00'
      : 'Сейчас в Якутске ' + now.formatted + ' · ' + (now.totalMinutes < openMin ? 'Откроемся сегодня в 09:00' : 'Откроемся завтра в 09:00');

    document.querySelectorAll('[data-live-status="compact"]').forEach(function (pill) {
      pill.classList.toggle('is-open', isOpen);
      pill.classList.toggle('is-closed', !isOpen);
      pill.setAttribute('title', 'Время в Якутске (UTC+9): ' + now.formatted);
      var textEl = pill.querySelector('.status-pill__text');
      if (textEl) textEl.textContent = compactLabel;
    });

    document.querySelectorAll('[data-live-status="full"]').forEach(function (el) {
      el.classList.toggle('is-open', isOpen);
      el.classList.toggle('is-closed', !isOpen);
      el.textContent = fullLabel;
    });
  }

  /* ========================================================================
     2. Фильтрация категорий ассортимента
     ======================================================================== */
  function initAssortmentFilters() {
    var grid = document.getElementById('catalogGrid');
    var tabs = document.querySelectorAll('.filter-tab');
    if (!grid || !tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var filter = tab.getAttribute('data-filter');
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        grid.classList.toggle('is-filtered', filter !== 'all');

        grid.querySelectorAll('.catalog-card').forEach(function (card) {
          var group = card.getAttribute('data-group');
          var visible = filter === 'all' || group === filter;
          card.classList.toggle('is-hidden', !visible);
        });
      });
    });
  }

  /* ========================================================================
     3. Интерактивный «Гид по вкусам за 2 клика» (4 x 4 = 16 сценариев)
     ======================================================================== */
  var TASTE_GUIDE_DATA = {
    assorti: {
      chocolate: {
        title: 'Шоколадное ассорти по 1 конфетке',
        text: 'Начните с маленького кулёчка на пробу: возьмите по одной конфете с тёмным пралине, цельным орехом, сливочной помадкой и классическим трюфелем. Так легко найти именно «свою» конфету и не брать лишнего.',
        picks: ['Шоколадные конфеты с пралине', 'Конфеты с цельным орехом', 'Классический трюфель'],
        note: 'В лавке можно набрать ассорти буквально по 1 штучке любого вида.',
        wa: 'Здравствуйте! Хочу собрать ассорти шоколадных конфет по 1 штучке на пробу. Подскажите, что свежего есть сегодня на витрине?'
      },
      fruit: {
        title: 'Ягодный и карамельный микс по штучке',
        text: 'Отличный лёгкий набор, если хочется кислинки и свежести: положите в пакет пару долек классического мармелада, горсть жевательного мармелада, карамель-подушечки и разноцветные монпансье.',
        picks: ['Классический и жевательный мармелад', 'Карамель-подушечки', 'Монпансье'],
        note: 'Подскажем на витрине, какие мармеладки мягче, а какие карамельки с ягодной начинкой.',
        wa: 'Здравствуйте! Подскажите по ягодным и мармеладным конфетам на развес — хочу прийти и собрать ассорти на пробу.'
      },
      nut: {
        title: 'Ореховое ассорти и мягкие начинки',
        text: 'Соберём сытный и ароматный микс: шоколадные конфеты с ореховой начинкой, драже с арахисом в шоколаде и глазури, плюс кусочек нежной халвы к чаю.',
        picks: ['Конфеты с ореховой начинкой', 'Драже с арахисом', 'Свежая халва'],
        note: 'Продавец знает каждую начинку и сразу покажет самые свежие ореховые позиции.',
        wa: 'Здравствуйте! Люблю ореховые конфеты, драже с арахисом и халву. Что посоветуете на пробу?'
      },
      surprise: {
        title: 'Дегустационный набор от продавца',
        text: 'Просто скажите нам у прилавка: «Соберите по одной вкусной конфетке на ваш выбор!» Мы соединим хрустящую карамель, нежный шоколад, «морские камешки» и мармелад — получится уютная коробка-открытие.',
        picks: ['Шоколадные хиты лавки', '«Морские камешки»', 'Карамель и мармелад'],
        note: 'Подберём варианты в любом бюджете — от простых любимых сладостей на каждый день до редких дорогих конфет.',
        wa: 'Здравствуйте! Хочу собрать ассорти-сюрприз по 1 конфетке разных видов. Подскажете у витрины самые интересные?'
      }
    },
    pp: {
      chocolate: {
        title: 'Шоколадные конфеты без сахара',
        text: 'Когда хочется насыщенного шоколадного вкуса без лишнего сахара: посмотрите конфеты без сахара на тёмном какао и протеиновые конфеты с шоколадной глазурью — они отлично заменяют обычный десерт к утреннему кофе.',
        picks: ['Конфеты без сахара (шоколадные)', 'Протеиновые конфеты', 'Зерновой кофе'],
        note: 'Покажем состав на витрине и поможем выбрать комфортную сладость без сахара.',
        wa: 'Здравствуйте! Какие шоколадные конфеты без сахара и протеиновые конфеты сейчас есть в наличии?'
      },
      fruit: {
        title: 'Фруктовая лёгкость без перегрузки',
        text: 'Для лёгкого перекуса к чаю сочетайте фруктово-ягодные конфеты без сахара с натуральной пастилой и зелёным или фруктовым листовым чаем.',
        picks: ['Конфеты без сахара', 'Натуральная пастила', 'Фруктовый листовой чай'],
        note: 'Можно взять немного на пробу, чтобы оценить вкус перед покупкой домой.',
        wa: 'Здравствуйте! Интересуют конфеты без сахара, пастила и фруктовый чай — подскажите по наличию.'
      },
      nut: {
        title: 'Протеиновые и ореховые ПП-сладости',
        text: 'Сытный вариант в дорогу или после тренировки: протеиновые конфеты с ореховым вкусом и конфеты без сахара с добавлением орешков надолго дают чувство сытости.',
        picks: ['Протеиновые конфеты', 'Конфеты без сахара с орехом', 'Чёрный листовой чай'],
        note: 'Уточним свежие поступления и поможем подобрать мягкие или более плотные варианты.',
        wa: 'Здравствуйте! Подскажите, какие протеиновые и ореховые конфеты без сахара есть сегодня в лавке?'
      },
      surprise: {
        title: 'Знакомство с ПП-полкой лавки',
        text: 'На прилавке легко потеряться, поэтому лучше спросить нас прямо в магазине или в WhatsApp: соберём небольшую пробу из конфет без сахара и протеиновых конфет, чтобы вы сравнили вкусы.',
        picks: ['Ассорти конфет без сахара', 'Протеиновые конфеты', 'Купажированный чай'],
        note: 'Живая консультация помогает выбрать ПП-сладости, которые действительно нравятся по вкусу.',
        wa: 'Здравствуйте! Хочу познакомиться с вашим ПП-разделом (конфеты без сахара и протеиновые). Что посоветуете попробовать?'
      }
    },
    tea_coffee: {
      chocolate: {
        title: 'Дуэт к крепкому кофе и чёрному чаю',
        text: 'К чашке ароматного зернового или сублимированного кофе идеально подойдут плиточный шоколад, тёмные шоколадные конфеты и хрустящие вафли — классика тёплого домашнего вечера.',
        picks: ['Шоколад и шоколадные конфеты', 'Хрустящие вафли', 'Зерновой или сублимированный кофе'],
        note: 'В наличии более 200 позиций — от привычных сладостей к ежедневному чаю до редких дорогих конфет.',
        wa: 'Здравствуйте! Собираюсь зайти к вам за кофе и шоколадными сладостями к нему. Подскажите, что есть свежего?'
      },
      fruit: {
        title: 'Уютное чаепитие с зефиром и мармеладом',
        text: 'Заварите купажированный или фруктовый листовой чай и дополните его воздушным зефиром, пастилой и сочным мармеладом — идеальное сочетание для неспешного разговора на кухне.',
        picks: ['Зефир и пастила', 'Классический мармелад', 'Купажированный листовой чай'],
        note: 'Всегда свежий привоз мягкого зефира и мармелада.',
        wa: 'Здравствуйте! Хочу взять у вас листовой чай, свежий зефир, мармелад и пастилу. Есть сегодня в наличии?'
      },
      nut: {
        title: 'Тёплое чаепитие с халвой и выпечкой',
        text: 'Для семейного стола в якутский мороз: крупнолистовой чёрный чай, рассыпчатая халва, хрустящее печенье, сушки и сухарики. То, что согревает и объединяет всю семью.',
        picks: ['Халва и печенье', 'Вафли, сушки и сухарики', 'Чёрный листовой чай'],
        note: 'Можно сразу взять и сладости, и хороший листовой чай или порционный кофе в одном месте.',
        wa: 'Здравствуйте! Подскажите по наличию чёрного листового чая, халвы и выпечки к чаю (печенье, сушки, вафли).'
      },
      surprise: {
        title: 'Готовый сценарий уютного вечера',
        text: 'Расскажите продавцу, что вы любите пить — терпкий чёрный чай, нежный зелёный или крепкий кофе — и мы сразу подберём к нему идеальную пару из конфет, печенья и вафель.',
        picks: ['Листовой чай или кофе', 'Печенье и вафли', 'Конфеты на развес'],
        note: 'Поможем собрать домашний чайный набор под ваш вкус и бюджет.',
        wa: 'Здравствуйте! Хочу собрать вкусный набор к чаю или кофе, полагаюсь на ваш совет. Когда лучше зайти?'
      }
    },
    gift: {
      chocolate: {
        title: 'Готовый новогодний подарок с шоколадным акцентом',
        text: 'На нашей витрине уже стоят готовые новогодние подарки, которые мы собрали сами вручную — внутри много вкусных шоколадных конфет. Заходите выбрать подходящий набор прямо в магазине!',
        picks: ['Готовые новогодние подарки на витрине', 'Шоколадные наборы в разном бюджете'],
        note: 'Честно предупреждаем: индивидуальные наборы под заказ в этом году не собираем — выбираем из готовых подарков в лавке.',
        wa: 'Здравствуйте! Подскажите, какие готовые новогодние подарки сейчас есть на витрине в лавке?'
      },
      fruit: {
        title: 'Яркий готовый подарок с мармеладом и карамелью',
        text: 'Дети особенно любят наборы, где шоколадные конфеты сочетаются с мармеладом, жевательными сладостями и карамелью. Попросите продавца показать такие готовые подарки на витрине.',
        picks: ['Готовые новогодние подарки в наличии', 'Детские сладкие сочетания'],
        note: 'Индивидуальную сборку под заказ не делаем — все праздничные наборы уже собраны и ждут на витрине.',
        wa: 'Здравствуйте! Присматриваем готовый новогодний подарок, где побольше мармелада и карамели. Что есть на витрине?'
      },
      nut: {
        title: 'Солидный готовый подарок для близких и коллег',
        text: 'На витрине есть готовые новогодние подарки для взрослых и коллег — с насыщенными шоколадными и ореховыми конфетами. Поможем выбрать красивый вариант прямо в лавке.',
        picks: ['Готовые новогодние подарки на витрине', 'Листовой чай или кофе в дополнение'],
        note: 'Самовывоз из ТЦ «Якутяночка» (индивидуально под заказ в этом году не собираем). При желании можно отправить своего курьера.',
        wa: 'Здравствуйте! Подскажите по готовым новогодним подаркам на витрине для близких или коллег.'
      },
      surprise: {
        title: 'Прийти и выбрать готовый подарок на месте',
        text: 'Мы собираем новогодние подарки сами и выставляем их на витрину — можно рассмотреть вживую, спросить про состав и сразу забрать понравившийся набор с собой.',
        picks: ['Готовые подарки в магазине', 'Живой рассказ о составе набора'],
        note: 'Важно: в этом году под заказ не собираем — приходите выбирать готовые подарки в ТЦ «Якутяночка».',
        wa: 'Здравствуйте! Хотим заехать к вам выбрать готовые новогодние подарки с витрины. Как сейчас с наличием?'
      }
    }
  };

  function initTasteGuide() {
    var moodGroup = document.getElementById('moodChoices');
    var flavorGroup = document.getElementById('flavorChoices');
    var resultBox = document.getElementById('tasteResult');
    if (!moodGroup || !flavorGroup || !resultBox) return;

    var state = { mood: 'assorti', flavor: 'chocolate' };

    var titleEl = document.getElementById('guideResultTitle');
    var textEl = document.getElementById('guideResultText');
    var tagsEl = document.getElementById('guideResultTags');
    var noteEl = document.getElementById('guideResultNote');
    var waBtn = document.getElementById('guideWaBtn');

    function renderResult(animate) {
      var moodObj = TASTE_GUIDE_DATA[state.mood] || TASTE_GUIDE_DATA.assorti;
      var rec = moodObj[state.flavor] || moodObj.chocolate;

      if (animate) {
        resultBox.classList.add('is-updating');
      }

      window.setTimeout(function () {
        titleEl.textContent = rec.title;
        textEl.textContent = rec.text;
        noteEl.textContent = rec.note;

        tagsEl.innerHTML = '';
        rec.picks.forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          tagsEl.appendChild(li);
        });

        waBtn.setAttribute('href', buildWhatsAppUrl(rec.wa));
        resultBox.classList.remove('is-updating');
      }, animate ? 90 : 0);
    }

    function bindRadioGroup(container, key) {
      var buttons = container.querySelectorAll('.guide-choice');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var value = btn.getAttribute('data-value');
          if (state[key] === value) return;
          state[key] = value;

          buttons.forEach(function (b) {
            var selected = b === btn;
            b.classList.toggle('is-selected', selected);
            b.setAttribute('aria-checked', selected ? 'true' : 'false');
          });

          renderResult(true);
        });
      });
    }

    bindRadioGroup(moodGroup, 'mood');
    bindRadioGroup(flavorGroup, 'flavor');
    renderResult(false);
  }

  /* ========================================================================
     4. Переключатель карты района и схемы 1 этажа + копирование адреса
     ======================================================================== */
  function initLocationWidget() {
    var switchButtons = document.querySelectorAll('.map-switch-btn');
    var panes = document.querySelectorAll('.map-pane');

    switchButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-map-tab');
        switchButtons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panes.forEach(function (pane) {
          var show = pane.getAttribute('data-map-pane') === target;
          pane.hidden = !show;
        });
      });
    });

    var copyBtn = document.getElementById('copyAddressBtn');
    if (copyBtn) {
      var defaultLabel = copyBtn.querySelector('.copy-btn__label');
      copyBtn.addEventListener('click', function () {
        var address = (cfg.addressShort || 'г. Якутск, ул. Рыдзинского, 24') +
          ', ' + (cfg.mallInfo || 'ТЦ «Якутяночка», 1 этаж, правое крыло');

        function markCopied() {
          copyBtn.classList.add('is-copied');
          if (defaultLabel) defaultLabel.textContent = 'Адрес скопирован';
          window.setTimeout(function () {
            copyBtn.classList.remove('is-copied');
            if (defaultLabel) defaultLabel.textContent = 'Скопировать адрес';
          }, 2200);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(address).then(markCopied).catch(function () {
            fallbackCopy(address, markCopied);
          });
        } else {
          fallbackCopy(address, markCopied);
        }
      });
    }
  }

  function fallbackCopy(text, onDone) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      onDone();
    } catch (e) {
      // ignore
    }
    document.body.removeChild(ta);
  }

  /* ========================================================================
     5. Мобильное меню
     ======================================================================== */
  function initMobileMenu() {
    var toggle = document.getElementById('menuToggle');
    var drawer = document.getElementById('mobileDrawer');
    if (!toggle || !drawer) return;

    function closeDrawer() {
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var open = !drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyConfigToDom();
    updateYakutskStatus();
    window.setInterval(updateYakutskStatus, 30000);
    initAssortmentFilters();
    initTasteGuide();
    initLocationWidget();
    initMobileMenu();
  });
})();
