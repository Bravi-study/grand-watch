// Watch Supreme: отдаёт сайту каталог из листа «Товары».
// Наружу уходят только колонки из PUBLIC и только строки с «На сайте» = да.
// Закупочные цены, ссылки на GooFish и всё остальное остаются в таблице.

const SHEET = "Товары";
const CACHE_KEY = "watches";
const CACHE_SECONDS = 60;

// Заголовок колонки в таблице → поле на сайте.
const PUBLIC = {
  "Артикул": "id",
  "Статус": "status",
  "Бренд": "brand",
  "Коллекция": "collection",
  "Модель": "model",
  "Референс": "reference",
  "Год": "year",
  "Диаметр, мм": "diameter",
  "Корпус": "material",
  "Механизм": "movement",
  "Циферблат": "dial",
  "Состояние": "condition",
  "Коробка": "box",
  "Документы": "papers",
  "Цена на сайте, ₽": "price",
  "Описание": "description",
  "Фото": "photos",
  "На главную": "featured",
};

const STATUS = {
  "в наличии": "available",
  "забронировано": "reserved",
  "продано": "sold",
};

function doGet() {
  const cache = CacheService.getScriptCache();
  let body = cache.get(CACHE_KEY);
  if (!body) {
    body = JSON.stringify(readWatches());
    cache.put(CACHE_KEY, body, CACHE_SECONDS);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// Любая правка в таблице сбрасывает кэш, и сайт сразу видит изменения.
function onEdit() {
  CacheService.getScriptCache().remove(CACHE_KEY);
}

function readWatches() {
  const rows = SpreadsheetApp.getActive().getSheetByName(SHEET).getDataRange().getDisplayValues();
  const head = rows.shift().map((h) => String(h).trim());
  const col = (name) => head.indexOf(name);
  const clean = (v) => String(v || "").trim().toLowerCase();

  return rows
    .filter((r) => r[col("Артикул")] && clean(r[col("На сайте")]) === "да" && STATUS[clean(r[col("Статус")])])
    .map((r) => {
      const watch = {};
      for (const [title, key] of Object.entries(PUBLIC)) {
        const i = col(title);
        if (i >= 0) watch[key] = String(r[i]).trim();
      }
      watch.status = STATUS[clean(watch.status)];
      return watch;
    });
}

// Запустите вручную в редакторе, чтобы увидеть, что уйдёт на сайт.
function preview() {
  Logger.log(JSON.stringify(readWatches(), null, 2));
}
