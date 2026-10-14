// Настройки сайта. Меняйте здесь, код трогать не нужно.
window.GW_CONFIG = {
  // Каталог. На хостинге его каждые 15 минут обновляет GitHub из Google Таблицы.
  dataUrl: "data/watches.json",

  // Контакты в Telegram: username без @. nameGenitive — для кнопки «Бронь у Виктора».
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
