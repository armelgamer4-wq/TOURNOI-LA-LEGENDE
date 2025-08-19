import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * SONDAGE TOURNOI "LA LÉGENDE" – 3e ÉDITION
 * -------------------------------------------------------------
 * - Couleurs : Violet & Blanc (via Tailwind).
 * - Paiement : Wave (affiche n° 0709467472 + champs de confirmation).
 * - Ajout photos joueurs par l'organisateur (stockage localStorage).
 * - Export des votes au format CSV.
 * - Anti doublon par référence Wave.
 * - CLASSEMENT visible publiquement (votes en direct).
 * - Visualisation : tableau + barres de progression.
 */

// ====== PARAMÈTRES À AJUSTER ======
const TOURNAMENT_TITLE = "Tournoi La Légende – 3e Édition";
const THEME_VIOLET = "violet";
const WAVE_NUMBER = "0709467472";
const DEFAULT_AMOUNT = "200";
const ORGANIZER_PIN = "1234";

// ====== TYPES ======
/** @typedef {{ id:string, name:string, photoDataUrl:string }} Player */
/** @typedef {{ id:string, playerId:string, playerName:string, paidPhone:string, ref:string, name?:string, timestamp:number, amount?:string }} Vote */

// ====== UTILS ======
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const load = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const downloadCSV = (rows, filename) => {
  const csv = [Object.keys(rows[0] || { Exemple: "Aucun vote" }).join(","), ...rows.map(r => Object.values(r).map(v => typeof v === "string" && v.includes(",") ? `"${v.replaceAll('"', '""')}"` : `${v}`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

// ====== APP ======
export default function App() {
  const [players, setPlayers] = useState(/** @type {Player[]} */ (load("legend_players", [])));
  const [votes, setVotes] = useState(/** @type {Vote[]} */ (load("legend_votes", [])));
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(/** @type {Player|null} */(null));

  useEffect(() => save("legend_players", players), [players]);
  useEffect(() => save("legend_votes", votes), [votes]);

  const openVote = (p) => { setSelectedPlayer(p); setShowVoteModal(true); };
  const closeVote = () => { setShowVoteModal(false); setSelectedPlayer(null); };

  const totalVotesByPlayer = useMemo(() => {
    const map = new Map();
    votes.forEach(v => map.set(v.playerId, (map.get(v.playerId) || 0) + 1));
    return map;
  }, [votes]);

  const ranking = useMemo(() => {
    return [...players].map(p => ({ ...p, votes: totalVotesByPlayer.get(p.id) || 0 }))
      .sort((a, b) => b.votes - a.votes);
  }, [players, totalVotesByPlayer]);

  return (
    <div className={`min-h-screen bg-white text-gray-900`}>
      <header className={`sticky top-0 z-30 backdrop-blur bg-white/80 border-b`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center bg-${THEME_VIOLET}-600 text-white font-bold`}>L</div>
          <div className="flex-1">
            <h1 className={`text-xl sm:text-2xl font-bold text-${THEME_VIOLET}-700`}>{TOURNAMENT_TITLE}</h1>
            <p className="text-sm text-gray-600">Vote du public • Couleurs violet & blanc • Paiement Wave</p>
          </div>
          <OrganizerToggle isOrganizer={isOrganizer} setIsOrganizer={setIsOrganizer} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {isOrganizer ? (
          <OrganizerPanel players={players} setPlayers={setPlayers} votes={votes} setVotes={setVotes} />
        ) : (
          <>
            <VoterGrid players={players} totalVotesByPlayer={totalVotesByPlayer} onVote={openVote} />
            <RankingBoard ranking={ranking} />
          </>
        )}
      </main>

      {showVoteModal && selectedPlayer && (
        <VoteModal player={selectedPlayer} onClose={closeVote} onConfirm={(vote) => setVotes((v) => [vote, ...v])} />
      )}

      <footer className="py-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} La Légende • Sondage sans serveur (enregistre localement).
      </footer>
    </div>
  );
}

// === CLASSEMENT PUBLIC ===
function RankingBoard({ ranking }) {
  if (!ranking.length) return null;
  const maxVotes = Math.max(...ranking.map(r => r.votes), 1);
  return (
    <div>
      <h2 className={`text-xl font-semibold text-${THEME_VIOLET}-700 mb-4`}>Classement en direct</h2>
      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className={`bg-${THEME_VIOLET}-600 text-white`}>
            <tr>
              <th className="p-3 text-left">Rang</th>
              <th className="p-3 text-left">Joueur</th>
              <th className="p-3 text-left">Votes</th>
              <th className="p-3 text-left">Progression</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((p, i) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-bold">#{i+1}</td>
                <td className="p-3 flex items-center gap-3"><img src={p.photoDataUrl} className="h-8 w-8 rounded-full object-cover border" /> {p.name}</td>
                <td className={`p-3 font-semibold text-${THEME_VIOLET}-700`}>{p.votes}</td>
                <td className="p-3 w-1/2">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 bg-${THEME_VIOLET}-600`} style={{width: `${(p.votes/maxVotes)*100}%`}}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// === autres composants (OrganizerToggle, OrganizerPanel, AddPlayerForm, PlayerTable, VoterGrid, VoteModal) inchangés ===
