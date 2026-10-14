// Настройки сайта. Меняйте здесь, код трогать не нужно.
window.GW_CONFIG = {
  // Откуда брать каталог. Пока это файл в репозитории.
  // Позже сюда встанет адрес Google Apps Script (см. README).
  dataUrl: "data/watches.json",

  // Контакты в Telegram: username без @. nameGenitive — для кнопки «Забронировать у Вити».
  contacts: [
    { name: "Витя", nameGenitive: "Вити", username: "victor_brazhnikov" },
    { name: "Петя", nameGenitive: "Пети", username: "Espeshally" },
  ],

  // Сколько часов держится бронь (используется в текстах сайта).
  reserveHours: 48,

  // Предоплата за бронь, ₽.
  reserveDeposit: 10000,

  city: "Москва",
};
