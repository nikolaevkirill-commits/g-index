
(function(){
  function applyFp448Copy(){
    const forecast=document.getElementById('nrRoute-forecast');
    if(forecast){
      const eyebrow=forecast.querySelector('.nr-eyebrow');
      const heading=forecast.querySelector('.nr-route-head h1,.nr-route-head h2');
      const intro=forecast.querySelector('.nr-route-head p');
      const horizonCopy=forecast.querySelectorAll('.nr-horizon-head p');
      const legend=forecast.querySelectorAll('.nr-forecast-legend span');
      if(eyebrow)eyebrow.textContent='ПРОГНОЗ';
      if(heading)heading.textContent='Коли діяти: 3, 7 і 27 днів';
      if(intro)intro.textContent='Оберіть один горизонт. Кольорова точка показує лише пораду дня; джерела й розрахунки відкриваються окремо.';
      if(horizonCopy[0])horizonCopy[0].textContent='Три найближчі дні: одна чітка порада на кожну дату';
      if(horizonCopy[1])horizonCopy[1].textContent='Сім днів: щоденний стан і найближча зміна';
      if(horizonCopy[2])horizonCopy[2].textContent='Календар наявності даних; після сьомого дня порад на дію немає';
      if(legend[0])legend[0].lastChild.textContent=' зелений — діяти · жовтий — перевірити · червоний — відкласти';
      if(legend[1])legend[1].lastChild.textContent=' звірене довідкове джерело';
      if(legend[2])legend[2].lastChild.textContent=' поточний фон';
      if(legend[3])legend[3].lastChild.textContent=' резервний сценарій · не команда';
      const legendBox=forecast.querySelector('.nr-forecast-legend');
      if(legendBox&&!legendBox.querySelector('.nr-scale-note')){const note=document.createElement('span');note.className='nr-scale-note';note.innerHTML='<b>*</b> raw за межами шкали показано на −3 або +3';legendBox.appendChild(note)}
      const truthCopy=forecast.querySelector('#nrDataTruthBody p');
      if(truthCopy&&/provenance/i.test(truthCopy.textContent))truthCopy.textContent='Перевіряю походження, свіжість і статус системи…';
    }
    const orbit=document.getElementById('nrScoreOrbit');
    if(orbit){orbit.setAttribute('role','img');if(!orbit.hasAttribute('aria-label'))orbit.setAttribute('aria-label','Стан дня завантажується')}
    const scoreLabel=document.querySelector('#nrScoreOrbit .nr-score-label');
    if(scoreLabel)scoreLabel.textContent='СТАН ДНЯ';
    const decisionChip=document.getElementById('nrCoverDecisionScore')?.parentElement;
    if(decisionChip?.firstChild)decisionChip.firstChild.nodeValue='РІШЕННЯ ДНЯ ';
    const liveChip=document.getElementById('nrCoverLiveG')?.parentElement;
    const authority=document.getElementById('nrAuthorityBalance');
    if(liveChip&&authority&&liveChip.parentElement!==authority){liveChip.classList.add('nr-technical-context');authority.appendChild(liveChip)}
    const authoritySummary=document.querySelector('.nr-authority-details>summary');
    if(authoritySummary)authoritySummary.textContent='Чому саме така порада?';
  }
  function ready(){setTimeout(applyFp448Copy,0);setTimeout(applyFp448Copy,400)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
