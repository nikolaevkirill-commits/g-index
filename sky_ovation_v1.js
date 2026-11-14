const SOURCE = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
const MINUTE = 60000;
const REFRESH = 5 * MINUTE;
const GRID_SIZE = 360 * 181;
const index = (x, y) => (y + 90) * 360 + (x + 360) % 360;

function utc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)) return NaN;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString().replace('.000Z', 'Z') === value ? epoch : NaN;
}

export function parseFrame(doc) {
  const observed = utc(doc?.['Observation Time']), valid = utc(doc?.['Forecast Time']);
  if (!Number.isFinite(observed) || !Number.isFinite(valid) || valid < observed || valid - observed > 90 * MINUTE) return null;
  if (doc.type !== 'MultiPoint' || doc['Data Format'] !== '[Longitude, Latitude, Aurora]' || !Array.isArray(doc.coordinates) || doc.coordinates.length !== GRID_SIZE) return null;
  const grid = new Uint8Array(GRID_SIZE).fill(255);
  for (const row of doc.coordinates) {
    if (!Array.isArray(row) || row.length !== 3 || !row.every(Number.isInteger)) return null;
    const [x, y, value] = row;
    if (x < 0 || x >= 360 || y < -90 || y > 90 || value < 0 || value > 100) return null;
    const cell = index(x, y);
    if (grid[cell] !== 255) return null;
    grid[cell] = value;
  }
  return {observed, valid, grid};
}

export function frameStatus(frame, now) {
  if (frame.observed > now) return 'unavailable';
  // Conservative display cutoffs, checked against archived NOAA frames. A zero-lead frame is current context.
  if (frame.observed === frame.valid) return now - frame.observed <= 15 * MINUTE ? 'no_lead' : 'stale';
  return now <= frame.valid && now - frame.observed <= 30 * MINUTE ? 'forecast' : 'stale';
}

// Sky brightness at the model valid time from the Sun's altitude alone: above the horizon (with standard
// refraction and the upper limb, -50'), civil or nautical twilight down to -12°, otherwise dark.
// It says nothing about clouds, the Moon or light pollution.
export function skyLight(altitude) {
  if (!Number.isFinite(altitude)) return 'unknown';
  return altitude >= -50 / 60 ? 'day' : altitude >= -12 ? 'twilight' : 'dark';
}

function atPlace(frame, place) {
  const x = (Math.round(place.lon) + 360) % 360, y = Math.round(place.lat);
  const time = new Date(frame.valid);
  const observer = new Astronomy.Observer(place.lat, place.lon, place.elevation ?? 0);
  const sun = Astronomy.Equator('Sun', time, observer, true, true);
  const altitude = Astronomy.Horizon(time, observer, sun.ra, sun.dec).altitude;
  return {value:frame.grid[index(x, y)], altitude};
}

const copy = {
  title:['Авроральний овал NOAA OVATION','NOAA OVATION auroral oval','Óvalo auroral NOAA OVATION','Ovale auroral NOAA OVATION'],
  loading:['Завантажуємо модель…','Loading the model…','Cargando el modelo…','Chargement du modèle…'],
  offline:['Офлайн. Модель недоступна.','Offline. Model unavailable.','Sin conexión. Modelo no disponible.','Hors ligne. Modèle indisponible.'],
  reduced:['Економія даних. Завантаження моделі призупинено.','Data saver. Model download paused.','Ahorro de datos. Descarga del modelo en pausa.','Économie de données. Téléchargement du modèle suspendu.'],
  unavailable:['Актуальні дані моделі недоступні.','Current model data unavailable.','Datos actuales del modelo no disponibles.','Données actuelles du modèle indisponibles.'],
  stale:['Дані моделі застаріли.','The model data are stale.','Los datos del modelo han caducado.','Les données du modèle sont périmées.'],
  forecast:['Значення для найближчого вузла моделі','Value at the nearest model grid point','Valor del punto de la cuadrícula más cercano','Valeur au point de grille le plus proche'],
  no_lead:['Модельний стан без випередження','Model conditions with no lead time','Estado del modelo sin antelación','État du modèle sans délai de prévision'],
  observed:['Спостереження','Observation','Observación','Observation'],
  valid:['Час дії моделі','Model valid time','Hora de validez del modelo','Heure de validité du modèle'],
  twilight:['На час дії моделі тривають сутінки: Сонце менш ніж на 12° під горизонтом, небо ще світле.','At the model valid time it is twilight: the Sun is less than 12° below the horizon and the sky is still bright.','A la hora de validez es crepúsculo: el Sol está a menos de 12° bajo el horizonte y el cielo aún está claro.','À l’heure de validité, c’est le crépuscule : le Soleil est à moins de 12° sous l’horizon et le ciel est encore clair.'],
  daylight:['На час дії моделі Сонце над горизонтом.','The Sun is above the horizon at the model valid time.','El Sol está sobre el horizonte a la hora de validez.','Le Soleil est au-dessus de l’horizon à l’heure de validité.'],
  note:['Значення сітки від 0 до 100 описує модель. Видимість із землі залежить також від темряви, хмар і засвітки.','The 0–100 value describes the model grid. Ground visibility also depends on darkness, clouds and light pollution.','El valor de 0 a 100 describe la cuadrícula del modelo. La visibilidad desde tierra también depende de la oscuridad, las nubes y la contaminación lumínica.','La valeur de 0 à 100 décrit la grille du modèle. La visibilité au sol dépend aussi de l’obscurité, des nuages et de la pollution lumineuse.']
};

let frame = null;
let pending = null;
let requestedAt = -Infinity;

async function refresh() {
  requestedAt = Date.now();
  try {
    const response = await fetch(SOURCE, {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(8000)});
    const next = response.ok ? parseFrame(await response.json()) : null;
    if (next && next.observed <= Date.now() && (!frame || next.observed >= frame.observed)) frame = next;
  } catch {
    // The last validated frame stays in memory until its display cutoff.
  }
}

export function updatePanel(panel, place, zone, lang, reduced, redraw) {
  const now = Date.now();
  const blocked = !navigator.onLine ? 'offline' : reduced ? 'reduced' : '';
  if (!blocked && !pending && now - requestedAt >= REFRESH) {
    pending = refresh().finally(() => { pending = null; });
    pending.then(redraw);
  }
  const status = blocked || (frame ? frameStatus(frame, now) : pending ? 'loading' : 'unavailable');
  const langIndex = Math.max(0, ['uk','en','es','fr'].indexOf(lang));
  const label = key => copy[key][langIndex];
  const available = status === 'forecast' || status === 'no_lead';
  const result = available ? atPlace(frame, place) : null;
  const date = new Intl.DateTimeFormat(window.NRLocale?.locale || 'uk-UA', {
    timeZone:zone, day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  });
  const lines = [label(status)];
  if (result) {
    if (status === 'no_lead') lines.push(label('forecast'));
    lines[lines.length - 1] += ' · ' + result.value + ' / 100';
    lines.push(label('observed') + ' · ' + date.format(frame.observed), label('valid') + ' · ' + date.format(frame.valid));
    const light = skyLight(result.altitude);
    if (light === 'day') lines.push(label('daylight'));
    else if (light === 'twilight') lines.push(label('twilight'));
    lines.push(label('note'));
  }
  const coordinate = new Intl.NumberFormat(window.NRLocale?.locale || 'uk-UA', {maximumFractionDigits:2});
  const placeName = window.SRSkyTime?.cityLabel(place.example ? {cityId:"kyiv"} : place) || [place.lat, place.lon].map(n => coordinate.format(n)).join(' / ');
  const titleText = label('title') + ' · ' + placeName;
  const text = [titleText, ...lines].join('\n');
  if (panel.dataset.status === status && panel.dataset.text === text) return;
  panel.dataset.status = status;
  panel.dataset.text = text;
  const title = document.createElement('h3');
  title.textContent = titleText;
  panel.replaceChildren(title, ...lines.map(line => {
    const p = document.createElement('p');
    p.textContent = line;
    return p;
  }));
}
