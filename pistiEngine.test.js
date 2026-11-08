import { createPistiGame, playPistiCard, createDeck } from "./pistiEngine.js";
const g = createPistiGame(["a","b"], () => 0.5);
if (createDeck().length !== 52) throw new Error("Deck should contain 52 cards");
if (g.hands.a.length !== 4 || g.hands.b.length !== 4 || g.table.length !== 3) throw new Error("Initial deal invalid");
const g2 = playPistiCard(g, "a", g.hands.a[0].id);
if (g2.hands.a.length !== 3 || g2.turn !== "b") throw new Error("Turn/action invalid");
let rejected = false;
try { playPistiCard(g2, "a", g2.hands.a[0].id); } catch { rejected = true; }
if (!rejected) throw new Error("Out-of-turn play should be rejected");
console.log("Pişti engine smoke tests passed");
