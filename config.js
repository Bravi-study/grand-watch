// Настройки сайта. Меняйте здесь, код трогать не нужно.
window.GW_CONFIG = {
  // Откуда брать каталог. Пока это файл в репозитории.
  // Позже сюда встанет адрес Google Apps Script (см. README).
  dataUrl: "data/watches.json",

  // Контакты в Telegram: username без @.
  contacts: [
    { name: "Имя 1", username: "username1", role: "Подбор и консультации" },
    { name: "Имя 2", username: "username2", role: "Встречи и доставка" },
  ],

  // Сколько часов держится бронь (используется в текстах сайта).
  reserveHours: 48,

  city: "Москва",
};
