// SOHVIA game modules currently present in this source package.
// Keep game logic pure and testable; online authoritative logic belongs on server.
export const gameModules = {
  pisti: { engine: './games/pistiEngine', status: 'local-engine-v1; not server-connected' },
  chess: { screen: './ChessGameScreen', rules: 'chess.js', status: 'local-play; not online-connected' },
  okey101: { serverMigration: './supabase/migrations/202611081830_sohvia_okey101_deal_engine_v1.sql', status: 'room/deal foundation only' },
  vampireVillage: { serverMigration: './supabase/migrations/202611082000_sohvia_vampir_koylu_engine_v1.sql', status: 'server foundation; timers/chat/rewards pending' },
};
