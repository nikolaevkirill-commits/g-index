/* Доповнення перекладів (en/es/fr) для рядків, які в es/fr лишались кирилицею (прогін 14.10.2026).
   Лише текст інтерфейсу; значення, бал, теги рушія не змінюються. Кожен рядок реєструється окремо:
   якщо рядок уже є в основному словнику, дублікат пропускається без помилки. */
(()=>{'use strict';if(!window.NRLocale?.register)return;
const rows=[
['активний — не починати нових справ','is active — do not start new activities','está activo — no iniciar nuevas actividades','est actif — ne pas commencer de nouvelles activités'],
['активні — не починати нових справ','are active — do not start new activities','están activos — no iniciar nuevas actividades','sont actifs — ne pas commencer de nouvelles activités'],["високий", "high", "alto", "élevé"], ["помірний", "moderate", "moderado", "modéré"], ["низький", "low", "bajo", "faible"], ["прямий рух", "direct motion", "movimiento directo", "mouvement direct"], ["лише один компонент", "only one component", "solo un componente", "un seul composant"], ["Нейтральний Pᵢ не скасовує eᵢ, бурю або часову заборону.", "A neutral Pᵢ does not cancel eᵢ, a storm or a time restriction.", "Un Pᵢ neutro no anula eᵢ, una tormenta ni una restricción horaria.", "Un Pᵢ neutre n’annule ni eᵢ, ni une tempête, ni une restriction horaire."], ["Сумарний astro-контекст несприятливий", "The overall astro context is unfavorable", "El contexto astro general es desfavorable", "Le contexte astro global est défavorable"], ["Не називати день нейтральним лише через Pᵢ.", "Do not call the day neutral based on Pᵢ alone.", "No considerar el día neutro solo por Pᵢ.", "Ne pas qualifier la journée de neutre sur la seule base de Pᵢ."], ["Сумарний astro-контекст близький до нейтрального", "The overall astro context is near neutral", "El contexto astro general es casi neutro", "Le contexte astro global est proche de la neutralité"], ["часові вікна перевіряються окремо", "time windows are checked separately", "las franjas horarias se comprueban por separado", "les créneaux horaires sont vérifiés séparément"], ["Сумарний astro-контекст підтримує", "The overall astro context is supportive", "El contexto astro general es favorable", "Le contexte astro global est favorable"], ["але це не дозвіл і не заміна оперативного стану", "but this is not permission and does not replace the operational state", "pero esto no es una autorización ni sustituye al estado operativo", "mais cela ne constitue pas une autorisation et ne remplace pas l’état opérationnel"], ["сповільнитись, не входити у суперечливі задачі", "slow down and avoid conflicting tasks", "reducir el ritmo y evitar tareas contradictorias", "ralentir et éviter les tâches contradictoires"], ["тримати стандартний режим без різких маневрів", "keep a regular routine without abrupt changes", "mantener la rutina habitual sin cambios bruscos", "garder un rythme habituel sans changements brusques"], ["лише планові дії після перевірки оперативного стану й часових вікон", "only planned actions after checking the operational state and time windows", "solo acciones previstas tras comprobar el estado operativo y las franjas horarias", "uniquement les actions prévues après vérification de l’état opérationnel et des créneaux horaires"],
 ['Половина Тітхі, тому протягом дня змінюється частіше.','Half a tithi, so it changes more often during the day.','Media tithi, por eso cambia con más frecuencia durante el día.','Une demi-tithi : elle change donc plus souvent dans la journée.'],
 ['Чатурдаші (передповня)','Chaturdashi (before full moon)','Chaturdashi (antes de la luna llena)','Chaturdashi (avant la pleine lune)'],
 ['Чатурдаші (передновоління)','Chaturdashi (before new moon)','Chaturdashi (antes de la luna nueva)','Chaturdashi (avant la nouvelle lune)'],
 ['Пурніма (Повня)','Purnima (full moon)','Purnima (luna llena)','Purnima (pleine lune)'],
 ['Зростаючий опуклий','Waxing gibbous','Gibosa creciente','Gibbeuse croissante'],
 ['Зростаючий серп','Waxing crescent','Luna creciente','Premier croissant'],
 ['Спадний опуклий','Waning gibbous','Gibosa menguante','Gibbeuse décroissante'],
 ['Серп, що спадає','Waning crescent','Luna menguante','Dernier croissant'],
 ['Перша чверть','First quarter','Cuarto creciente','Premier quartier'],
 ['Остання чверть','Last quarter','Cuarto menguante','Dernier quartier'],
 ['Амавасья','Amavasya','Amavasya','Amavasya'],
 ['Молодик','New moon','Luna nueva','Nouvelle lune'],
 ['Краща дія','Best action','Mejor acción','Meilleure action'],
 ['тільки рутина','routine only','solo rutina','routine uniquement'],
 ['лише рутина','routine only','solo rutina','routine uniquement'],
 ['Оперативно','Operational','Operativo','Opérationnel'],
 ['БЛОК','BLOCK','BLOQUEO','BLOCAGE']
];
/* v5 NR-01 */
rows.push(["Геомагнітна буря", "Geomagnetic storm", "Tormenta geomagnética", "Tempête géomagnétique"],["(шкала NOAA)", "(NOAA scale)", "(escala NOAA)", "(échelle NOAA)"],["Активне попередження NOAA", "Active NOAA alert", "Alerta activa de NOAA", "Alerte NOAA active"],["Прогноз NOAA: можлива буря", "NOAA forecast: possible storm", "Pronóstico NOAA: posible tormenta", "Prévision NOAA : tempête possible"],["дуже сильна", "severe", "severa", "sévère"],["екстремальна", "extreme", "extrema", "extrême"],["помірна", "moderate", "moderada", "modérée"],["сильна", "strong", "fuerte", "forte"],["слабка", "minor", "menor", "mineure"],["Модель дня · не прогноз бурі", "Daily model · not a storm forecast", "Modelo del día · no es un pronóstico de tormenta", "Modèle du jour · pas une prévision de tempête"]);
/* v7.2 */
rows.push(["Повторити", "Retry", "Reintentar", "Réessayer"],["Бал розраховано ", "Score calculated ", "Puntuación calculada ", "Score calculé "],[" з Kp макс. ", " from max Kp ", " con Kp máx. ", " avec Kp max "],["; поточне спостереження NOAA G", "; current NOAA observation G", "; observación actual de NOAA G", "; observation NOAA actuelle G"],[" показано окремо; бал використовує прогнозний Kp.", " is shown separately; the score uses forecast Kp.", " se muestra por separado; la puntuación usa el Kp previsto.", " est affichée séparément ; le score utilise le Kp prévu."]);
let added=0;for(const r of rows){try{NRLocale.register([r]);added++}catch{}}
window.__nrLocaleExtra={added,total:rows.length};
})();
