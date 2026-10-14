// Настройки сайта. Меняйте здесь, код трогать не нужно.
window.GW_CONFIG = {
  // Каталог: адрес веб-приложения Apps Script из таблицы «Grand Watch — учёт»
  // (вида https://script.google.com/macros/s/…/exec). Пока пусто, берётся data/watches.json.
  sheetUrl: "",

  // Запасная копия каталога, если таблица недоступна.
  dataUrl: "data/watches.json",

  // Контакты в Telegram: username без @. nameGenitive — для кнопки «Забронировать у Виктора».
  contacts: [
    { name: "Виктор", nameGenitive: "Виктора", username: "victor_brazhnikov" },
    { name: "Пётр", nameGenitive: "Петра", username: "Espeshally" },
  ],

  // Сколько часов держится бронь (используется в текстах сайта).
  reserveHours: 48,

  // Предоплата за бронь, ₽.
  reserveDeposit: 10000,

  city: "Москва",
};
