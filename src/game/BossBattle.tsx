import { useRef, useState } from "react";
import type { SoundKind } from "./GameCanvas";
import type { BossId } from "./types";

type Choice = "rock" | "paper" | "scissors";
type RoundWinner = "noa" | "boss" | "tie";
type BattleStatus = "choosing" | "revealed" | "won" | "lost";

type BattleState = {
  noaScore: number;
  bossScore: number;
  noaChoice?: Choice;
  bossChoice?: Choice;
  roundWinner?: RoundWinner;
  status: BattleStatus;
};

type BossBattleProps = {
  bossId: BossId;
  onWin: () => void;
  playSound: (kind: SoundKind) => void;
};

const choices: Array<{ id: Choice; icon: string; label: string }> = [
  { id: "rock", icon: "🪨", label: "Piedra" },
  { id: "paper", icon: "✋", label: "Papel" },
  { id: "scissors", icon: "✌️", label: "Tijera" },
];

const bosses: Record<BossId, { name: string; assetPrefix: string; intro: string }> = {
  "bramble-king": {
    name: "Rey Zarzal",
    assetPrefix: "./assets/sprites/boss-rey-zarzal",
    intro: "El guardián de las raíces te reta a un duelo.",
  },
  "mist-countess": {
    name: "Condesa Niebla",
    assetPrefix: "./assets/sprites/boss-condesa-niebla",
    intro: "La guardiana de la luna quiere probar tu ingenio.",
  },
  "great-wolf": {
    name: "Gran Lobo",
    assetPrefix: "./assets/sprites/boss-gran-lobo",
    intro: "El rey de las huellas te espera para el último duelo.",
  },
};

const choiceById = Object.fromEntries(choices.map((choice) => [choice.id, choice])) as Record<Choice, (typeof choices)[number]>;

function getWinner(noa: Choice, boss: Choice): RoundWinner {
  if (noa === boss) return "tie";
  if (
    (noa === "rock" && boss === "scissors") ||
    (noa === "paper" && boss === "rock") ||
    (noa === "scissors" && boss === "paper")
  ) return "noa";
  return "boss";
}

function getRuleText(noa: Choice, boss: Choice) {
  if (noa === boss) return `Los dos han elegido ${choiceById[noa].label.toLowerCase()}.`;
  const pair = new Set([noa, boss]);
  if (pair.has("rock") && pair.has("scissors")) return "La piedra rompe las tijeras.";
  if (pair.has("paper") && pair.has("rock")) return "El papel envuelve la piedra.";
  return "Las tijeras cortan el papel.";
}

function BossSprite({ assetPrefix, frame, name }: { assetPrefix: string; frame: number; name: string }) {
  return (
    <div className="boss-sprite-window" role="img" aria-label={`${name} hace el gesto de ${frame === 1 ? "piedra" : frame === 2 ? "papel" : frame === 3 ? "tijera" : frame === 4 ? "derrota" : "reto"}`}>
      <img className="boss-sprite-frame" src={`${assetPrefix}-${frame}.png`} alt="" />
    </div>
  );
}

export function BossBattle({ bossId, onWin, playSound }: BossBattleProps) {
  const boss = bosses[bossId];
  const roundRef = useRef(0);
  const [battle, setBattle] = useState<BattleState>({ noaScore: 0, bossScore: 0, status: "choosing" });

  const choose = (noaChoice: Choice) => {
    if (battle.status !== "choosing") return;
    const bossOffset = bossId === "bramble-king" ? 0 : bossId === "mist-countess" ? 1 : 2;
    const bossChoice = choices[(roundRef.current + bossOffset) % choices.length].id;
    roundRef.current += 1;
    const roundWinner = getWinner(noaChoice, bossChoice);
    const noaScore = battle.noaScore + (roundWinner === "noa" ? 1 : 0);
    const bossScore = battle.bossScore + (roundWinner === "boss" ? 1 : 0);
    const status: BattleStatus = noaScore >= 2 ? "won" : bossScore >= 2 ? "lost" : "revealed";
    setBattle({ noaScore, bossScore, noaChoice, bossChoice, roundWinner, status });
    playSound(roundWinner === "noa" ? "checkpoint" : roundWinner === "boss" ? "hurt" : "block");
  };

  const nextRound = () => setBattle((current) => ({ noaScore: current.noaScore, bossScore: current.bossScore, status: "choosing" }));
  const retry = () => {
    roundRef.current = 0;
    setBattle({ noaScore: 0, bossScore: 0, status: "choosing" });
  };
  const bossFrame = battle.status === "won" ? 4 : battle.bossChoice ? choices.findIndex((choice) => choice.id === battle.bossChoice) + 1 : 0;
  const roundText = battle.noaChoice && battle.bossChoice ? getRuleText(battle.noaChoice, battle.bossChoice) : "Elige un gesto. El primero que gane dos rondas vence.";

  return (
    <div className="modal-backdrop boss-backdrop">
      <section className="boss-battle" aria-labelledby="boss-title">
        <header className="boss-header">
          <div>
            <p className="eyebrow">Monstruo final</p>
            <h2 id="boss-title">Duelo contra {boss.name}</h2>
            <p>{boss.intro}</p>
          </div>
          <div className="duel-score" aria-label={`Marcador: Noa ${battle.noaScore}, ${boss.name} ${battle.bossScore}`}>
            <span>NOA <strong>{battle.noaScore}</strong></span>
            <b>—</b>
            <span><strong>{battle.bossScore}</strong> JEFE</span>
          </div>
        </header>

        <div className="duel-arena">
          <div className={`duel-fighter noa-fighter ${battle.roundWinner === "noa" ? "round-winner" : ""}`}>
            <div className="duel-noa-sprite" style={{ backgroundImage: 'url("./assets/sprites/noa-sprite-sheet.png")' }} aria-label="Noa" />
            <strong>NOA</strong>
            <div className="gesture-card">
              <span>{battle.noaChoice ? choiceById[battle.noaChoice].icon : "❔"}</span>
              <b>{battle.noaChoice ? choiceById[battle.noaChoice].label : "Preparada"}</b>
            </div>
          </div>
          <div className="duel-versus" aria-hidden="true">VS</div>
          <div className={`duel-fighter ${battle.roundWinner === "boss" ? "round-winner" : ""}`}>
            <BossSprite assetPrefix={boss.assetPrefix} frame={bossFrame} name={boss.name} />
            <strong>{boss.name}</strong>
            <div className="gesture-card">
              <span>{battle.bossChoice ? choiceById[battle.bossChoice].icon : "❔"}</span>
              <b>{battle.bossChoice ? choiceById[battle.bossChoice].label : "Esperando"}</b>
            </div>
          </div>
        </div>

        <div className={`round-message result-${battle.roundWinner ?? "none"}`} aria-live="polite">
          <strong>
            {battle.status === "won" ? "¡Noa gana el duelo!" : battle.status === "lost" ? `Esta vez gana ${boss.name}` : battle.roundWinner === "noa" ? "¡Ronda para Noa!" : battle.roundWinner === "boss" ? `Ronda para ${boss.name}` : battle.roundWinner === "tie" ? "¡Empate!" : "Piedra, papel o tijera"}
          </strong>
          <span>{battle.status === "won" ? `${boss.name} sonríe y deja libre el camino.` : battle.status === "lost" ? "Puedes repetir el duelo sin perder ninguna vida." : roundText}</span>
        </div>

        {battle.status === "choosing" && (
          <div className="duel-choices" aria-label="Elige piedra, papel o tijera">
            {choices.map((choice) => (
              <button type="button" onClick={() => choose(choice.id)} key={choice.id}>
                <span>{choice.icon}</span><strong>{choice.label}</strong>
              </button>
            ))}
          </div>
        )}
        {battle.status === "revealed" && <button className="pixel-button primary duel-next" type="button" onClick={nextRound}>Siguiente ronda ▶</button>}
        {battle.status === "lost" && <button className="pixel-button primary duel-next" type="button" onClick={retry}>Repetir el duelo</button>}
        {battle.status === "won" && <button className="pixel-button primary duel-next" type="button" onClick={() => { playSound("goal"); onWin(); }}>Continuar la aventura ▶</button>}

        <p className="duel-rules"><span>🪨 gana a ✌️</span><span>✌️ gana a ✋</span><span>✋ gana a 🪨</span></p>
      </section>
    </div>
  );
}
