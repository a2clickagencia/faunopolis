/* =========================================================
   FAUNÓPOLIS — sim.js
   Relógio do jogo e ciclo de simulação: quadro → hora → dia.
   ========================================================= */
'use strict';
(function(){
const Sim = FP.Sim = {};
const U = FP.U;

Sim.tick = function(dtReal){
  const G = FP.G;
  if (!G || G.paused || G.gameOver) return;
  const dt = Math.min(.1, dtReal) * G.speed;           // segundos de jogo
  const dH = dt / FP.HOUR_SEC;                          // horas de jogo
  const prevHour = Math.floor(G.hour);
  G.hour += dH;
  // chegada de visitantes durante o horário de funcionamento
  if (G.hour >= FP.OPEN_H && G.hour < FP.CLOSE_H - 1){
    const perHour = (G.stats.demandToday || 0) / (FP.CLOSE_H - FP.OPEN_H - 1);
    G.spawnAcc = (G.spawnAcc || 0) + perHour * dH;
    while (G.spawnAcc >= 1){
      G.spawnAcc -= 1;
      if (G.visitors.length < FP.Visitors.maxConcurrent()) FP.Visitors.spawn();
      else { G.stats.turnedAway = (G.stats.turnedAway || 0) + 1; }
    }
  }
  FP.Animals.updateMotion(dt);
  FP.Visitors.update(dt);
  const h = Math.floor(G.hour);
  if (h !== prevHour){
    if (G.hour >= 24){ G.hour -= 24; Sim.daily(); }
    Sim.hourly(Math.floor(G.hour));
  }
};

Sim.hourly = function(h){
  const G = FP.G;
  if (h === 7 || h === 13 || h === 19) FP.Staff.feedRound();
  if (h % 6 === 0) FP.Economy.autoBuyFood();
  FP.Staff.cleanHour();
  FP.Animals.hourly();
  FP.Health.hourly();
  FP.Visitors.hourly();
  FP.Economy.computeAttraction();
  if (h === FP.OPEN_H){ G.stats.demandToday = FP.Economy.dailyDemand(); }
  G.stats.satLive = FP.Visitors.satisfaction();
  if (G.event && h === 0){ /* tratado no diário */ }
  FP.UI.hourly();
};

Sim.daily = function(){
  const G = FP.G;
  G.day++;
  // fechamento financeiro do dia anterior
  FP.Economy.payDaily();
  const tot = FP.Economy.todayTotals();
  const sat = G.stats.satN ? G.stats.satSum / G.stats.satN : G.stats.satToday;
  G.stats.satToday = sat;
  G.finance.history.push({day: G.day - 1, inc: tot.inc, exp: tot.exp, net: tot.net, money: G.money, visitors: G.stats.visitorsToday, sat: Math.round(sat), rep: Math.round(G.rep), animals: G.animals.length, detail: JSON.parse(JSON.stringify(G.finance.today))});
  if (G.finance.history.length > 120) G.finance.history.shift();
  G.finance.today = {inc: {}, exp: {}};
  G.stats.visitorsToday = 0; G.stats.satSum = 0; G.stats.satN = 0; G.stats.carsToday = 0; G.stats.guidedToday = 0; G.stats.turnedAway = 0;
  // sistemas diários
  FP.Animals.daily();
  FP.Health.daily();
  FP.Economy.autoBuyFood();
  FP.Market.refresh(false);
  FP.Economy.computeAttraction();
  FP.Economy.updateReputation();
  FP.Economy.checkStage();
  if (G.event){ G.event.left--; if (G.event.left <= 0){ FP.UI.notify('info', 'Evento encerrado', `${FP.EVENTS[G.event.id].nome} terminou.`); G.event = null; } }
  // falência
  if (G.money < 0){
    G.debtDays = (G.debtDays || 0) + 1;
    const left = 20 - G.debtDays;
    if (left <= 0 && G.mode !== 'livre'){ G.gameOver = true; FP.UI.gameOver(); return; }
    FP.UI.notify('danger', 'Saldo negativo', `O caixa está negativo há ${G.debtDays} dia(s). ${G.mode !== 'livre' ? 'Faltam ' + left + ' dias para a falência.' : ''} Reduza custos, ajuste o ingresso ou pegue um empréstimo.`, {panel: 'finance'}, 'debt');
  } else G.debtDays = 0;
  const last = G.finance.history[G.finance.history.length - 1];
  if (last && last.net < 0 && G.money < 15000 && G.money >= 0) FP.UI.notify('warn', 'Despesas maiores que receitas', `Ontem o zoológico teve prejuízo de ${U.money(-last.net)}. Saldo atual: ${U.money(G.money)}.`, {panel: 'finance'}, 'loss');
  // relatório mensal
  if ((G.day - 1) % FP.DAYS_PER_MONTH === 0 && G.day > 1){
    const m = G.finance.history.slice(-30);
    const inc = m.reduce((s, d) => s + d.inc, 0), exp = m.reduce((s, d) => s + d.exp, 0), vis = m.reduce((s, d) => s + d.visitors, 0);
    FP.UI.notify('info', 'Relatório do mês', `Receitas ${U.money(inc)} · Despesas ${U.money(exp)} · Resultado ${U.money(inc - exp)} · ${vis} visitantes.`, {panel: 'finance'});
  }
  // salvamento automático a cada 3 dias
  if (G.day % 3 === 0) FP.Save.save('auto', true);
  FP.UI.daily();
};
})();
