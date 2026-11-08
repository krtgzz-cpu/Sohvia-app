// SOHVIA Pişti rules engine v1 — pure rules, no UI/network side effects.
export const SUITS = ["kupa", "karo", "sinek", "maça"];
export const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const rankValue = r => r === "A" ? 1 : r === "J" ? 11 : r === "Q" ? 12 : r === "K" ? 13 : Number(r);
export function createDeck() {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ id: `${suit}-${rank}`, suit, rank })));
}
export function shuffle(cards, random = Math.random) {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function createPistiGame(playerIds, random = Math.random) {
  if (!Array.isArray(playerIds) || playerIds.length !== 2 || playerIds[0] === playerIds[1]) {
    throw new Error("Pişti şu sürümde tam 2 oyuncuyla oynanır.");
  }
  const deck = shuffle(createDeck(), random);
  const starter = deck.splice(0, 4);
  const table = starter.slice(0, 3);
  const hands = { [playerIds[0]]: starter.slice(3).concat(deck.splice(0, 3)), [playerIds[1]]: deck.splice(0, 4) };
  // İlk dağıtımda oyuncu başına dört kart: başlangıçta 3 masa kartı + kapalı desteden 1.
  // Deste kalan 44 karttır; her iki oyuncuya da 4'er kart verilir.
  return {
    version: 1, status: "playing", players: [...playerIds], hands,
    stock: deck, table, captured: { [playerIds[0]]: [], [playerIds[1]]: [] },
    scores: { [playerIds[0]]: 0, [playerIds[1]]: 0 },
    piştiCount: { [playerIds[0]]: 0, [playerIds[1]]: 0 },
    turn: playerIds[0], lastCaptureBy: null, lastMove: null, round: 1,
    dealtAt: new Date().toISOString()
  };
}
function assertTurn(game, playerId) {
  if (game.status !== "playing") throw new Error("Oyun devam etmiyor.");
  if (!game.players.includes(playerId)) throw new Error("Bu odada oyuncu değilsin.");
  if (game.turn !== playerId) throw new Error("Sıra sende değil.");
}
export function playPistiCard(game, playerId, cardId) {
  assertTurn(game, playerId);
  const hand = game.hands[playerId] || [];
  const index = hand.findIndex(c => c.id === cardId);
  if (index < 0) throw new Error("Bu kart elinde yok.");
  const card = hand[index];
  const next = structuredClone(game);
  next.hands[playerId].splice(index, 1);
  const top = next.table[next.table.length - 1];
  const captures = top && (top.rank === card.rank || card.rank === "J");
  let pişti = false;
  if (captures) {
    pişti = next.table.length === 1 && top.rank === card.rank && card.rank !== "J";
    next.captured[playerId].push(...next.table, card);
    next.table = [];
    next.lastCaptureBy = playerId;
    if (pişti) {
      next.pištiCount[playerId] += 1;
      next.scores[playerId] += 10;
    }
  } else {
    next.table.push(card);
  }
  next.lastMove = { playerId, card, captures: !!captures, pisti: pişti };
  next.turn = next.players[(next.players.indexOf(playerId) + 1) % 2];
  if (next.hands[next.players[0]].length === 0 && next.hands[next.players[1]].length === 0 && next.stock.length) {
    for (const id of next.players) next.hands[id] = next.stock.splice(0, Math.min(4, next.stock.length));
  }
  if (!next.stock.length && next.hands[next.players[0]].length === 0 && next.hands[next.players[1]].length === 0) next.status = "ready_to_score";
  return next;
}
export function drawNextHand(game) {
  if (game.status !== "playing") throw new Error("Oyun devam etmiyor.");
  if (game.stock.length === 0) return game;
  const next = structuredClone(game);
  for (const id of next.players) {
    if (next.hands[id].length === 0 && next.stock.length) {
      next.hands[id] = next.stock.splice(0, Math.min(4, next.stock.length));
    }
  }
  return next;
}
export function finishPistiGame(game) {
  if (game.hands[game.players[0]].length || game.hands[game.players[1]].length || game.stock.length) {
    throw new Error("Henüz dağıtılmamış kart veya oynanacak el var.");
  }
  const next = structuredClone(game);
  const p = next.lastCaptureBy;
  if (p) next.captured[p].push(...next.table);
  next.table = [];
  for (const id of next.players) {
    const cards = next.captured[id];
    next.scores[id] += cards.filter(c => c.rank === "A" || c.rank === "J").length;
    next.scores[id] += cards.filter(c => c.rank === "2" && c.suit === "sinek").length * 2;
    next.scores[id] += cards.filter(c => c.rank === "10" && c.suit === "karo").length * 3;
    if (cards.length > next.captured[next.players[1 - next.players.indexOf(id)]].length) next.scores[id] += 3;
  }
  next.status = "finished";
  next.winner = next.scores[next.players[0]] === next.scores[next.players[1]] ? null :
    next.scores[next.players[0]] > next.scores[next.players[1]] ? next.players[0] : next.players[1];
  return next;
}
export function getCardLabel(card) {
  const suit = { kupa:"♥", karo:"♦", sinek:"♣", maça:"♠" }[card.suit];
  return `${card.rank}${suit}`;
}
