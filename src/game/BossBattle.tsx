import { useEffect, useState, type CSSProperties } from "react";
import type { SoundKind } from "./GameCanvas";
import { GameAssetIcon } from "./GameAssetIcon";
import type { BossId } from "./types";

type Choice = "rock" | "paper" | "scissors";
type RoundWinner = "noa" | "boss" | "tie";
type BattleStatus = "choosing" | "countdown" | "revealed" | "won" | "lost";

type BattleState = {
  noaScore: number;
  bossScore: number;
  noaChoice?: Choice;
  bossChoice?: Choice;
  roundWinner?: RoundWinner;
  status: BattleStatus;
};

type RoundRecord = { noaChoice: Choice; bossChoice: Choice; winner: RoundWinner };

type BossBattleProps = {
  bossId: BossId;
  apples: number;
  onSpendApple: () => void;
  onRestartLevel: () => void;
  onAbandon: () => void;
  onWin: () => void;
  playSound: (kind: SoundKind) => void;
};

const choices: Array<{ id: Choice; label: string }> = [
  { id: "rock", label: "Piedra" },
  { id: "paper", label: "Papel" },
  { id: "scissors", label: "Tijera" },
];

const bosses: Record<BossId, { name: string; assetPrefix: string; intro: string; sheet?: boolean }> = {
  "bramble-king": { name: "Rey Zarzal", assetPrefix: "./assets/sprites/boss-rey-zarzal", intro: "El guardián de las raíces te reta a un duelo." },
  "mist-countess": { name: "Condesa Niebla", assetPrefix: "./assets/sprites/boss-condesa-niebla", intro: "La guardiana de las grutas quiere probar tu ingenio." },
  "great-wolf": { name: "Gran Lobo", assetPrefix: "./assets/sprites/boss-gran-lobo", intro: "El rey de las huellas te espera para el último duelo." },
  "great-boar": { name: "Gran Jabalí", assetPrefix: "./assets/sprites/boss-gran-jabali", intro: "El guardián de las bellotas protege las copas del bosque." },
  "sky-captain": { name: "Capitán Celeste", assetPrefix: "./assets/sprites/boss-capitan-celeste", intro: "El capitán de la flota te reta por el tesoro de las nubes." },
  "rainbow-queen": { name: "Reina Arcoíris", assetPrefix: "./assets/sprites/boss-reina-arcoiris-sheet-v1.png", intro: "La guardiana del cielo quiere comprobar tu magia.", sheet: true },
};

const choiceById = Object.fromEntries(choices.map((choice) => [choice.id, choice])) as Record<Choice, (typeof choices)[number]>;

function RpsIcon({ choice, small = false }: { choice: Choice; small?: boolean }) {
  return <span className={`rps-icon rps-${choice} ${small ? "is-small" : ""}`} aria-hidden="true" />;
}

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

function BossSprite({ assetPrefix, frame, name, sheet = false }: { assetPrefix: string; frame: number; name: string; sheet?: boolean }) {
  const gesture = frame === 1 ? "piedra" : frame === 2 ? "papel" : frame === 3 ? "tijera" : frame === 4 ? "derrota" : "reto";
  return (
    <div className={`boss-sprite-window ${sheet || assetPrefix.includes("gran-jabali") || assetPrefix.includes("capitan-celeste") ? "clean-frame" : ""}`} role="img" aria-label={`${name} hace el gesto de ${gesture}`}>
      <img className={sheet ? "boss-sprite-sheet" : "boss-sprite-frame"} src={sheet ? assetPrefix : `${assetPrefix}-${frame}.png`} style={sheet ? { "--boss-frame": frame } as CSSProperties : undefined} alt="" />
    </div>
  );
}

function NoaDuelSprite({ frame }: { frame: number | null }) {
  const gesture = frame === 0 ? "piedra" : frame === 1 ? "papel" : frame === 2 ? "tijera" : frame === 3 ? "victoria" : "preparada";
  return (
    <div className="duel-noa-sprite" role="img" aria-label={`Noa hace el gesto de ${gesture}`}>
      {frame === null
        ? <div className="duel-noa-idle" style={{ backgroundImage: 'url("./assets/sprites/noa-sprite-sheet.png")' }} />
        : <img src={`./assets/sprites/noa-rps-${frame}.png`} alt="" />}
    </div>
  );
}

export function BossBattle({ bossId, apples, onSpendApple, onRestartLevel, onAbandon, onWin, playSound }: BossBattleProps) {
  const boss = bosses[bossId];
  const [battle, setBattle] = useState<BattleState>({ noaScore: 0, bossScore: 0, status: "choosing" });
  const [countdown, setCountdown] = useState(3);
  const [history, setHistory] = useState<RoundRecord[]>([]);

  useEffect(() => {
    if (battle.status !== "countdown") return;
    if (countdown > 0) playSound("countdown");
    const timeout = window.setTimeout(() => {
      if (countdown > 0) {
        setCountdown((current) => current - 1);
        return;
      }
      if (!battle.noaChoice || !battle.bossChoice || !battle.roundWinner) return;
      const noaScore = battle.noaScore + (battle.roundWinner === "noa" ? 1 : 0);
      const bossScore = battle.bossScore + (battle.roundWinner === "boss" ? 1 : 0);
      const status: BattleStatus = noaScore >= 2 ? "won" : bossScore >= 2 ? "lost" : "revealed";
      setHistory((current) => [...current, { noaChoice: battle.noaChoice!, bossChoice: battle.bossChoice!, winner: battle.roundWinner! }]);
      setBattle((current) => ({ ...current, noaScore, bossScore, status }));
      playSound(battle.roundWinner === "noa" ? "checkpoint" : battle.roundWinner === "boss" ? "hurt" : "block");
    }, countdown > 0 ? 360 : 220);
    return () => window.clearTimeout(timeout);
  }, [battle, countdown, playSound]);

  const choose = (noaChoice: Choice) => {
    if (battle.status !== "choosing") return;
    const randomValue = new Uint32Array(1);
    window.crypto.getRandomValues(randomValue);
    const bossChoice = choices[randomValue[0] % choices.length].id;
    setCountdown(3);
    setBattle((current) => ({ ...current, noaChoice, bossChoice, roundWinner: getWinner(noaChoice, bossChoice), status: "countdown" }));
  };

  const nextRound = () => setBattle((current) => ({ noaScore: current.noaScore, bossScore: current.bossScore, status: "choosing" }));
  const retryWithApple = () => {
    if (apples <= 0) return;
    onSpendApple();
    setHistory([]);
    setBattle({ noaScore: 0, bossScore: 0, status: "choosing" });
  };
  const abandonBattle = () => {
    if (window.confirm("¿Quieres rendirte y volver al mapa? Podrás intentar este duelo otra vez cuando quieras.")) onAbandon();
  };
  const choicesRevealed = battle.status !== "choosing" && battle.status !== "countdown";
  const visibleWinner = choicesRevealed ? battle.roundWinner : undefined;
  const bossFrame = battle.status === "won" ? 4 : choicesRevealed && battle.bossChoice ? choices.findIndex((choice) => choice.id === battle.bossChoice) + 1 : 0;
  const noaFrame = battle.status === "won" ? 3 : choicesRevealed && battle.noaChoice ? choices.findIndex((choice) => choice.id === battle.noaChoice) : null;
  const roundText = battle.noaChoice && battle.bossChoice ? getRuleText(battle.noaChoice, battle.bossChoice) : "Elige un gesto. El primero que gane dos rondas vence.";
  const roundNumber = battle.status === "choosing" || battle.status === "countdown" ? history.length + 1 : Math.max(1, history.length);

  return (
    <div className="modal-backdrop boss-backdrop">
      <section className={`boss-battle boss-theme-${bossId} battle-${battle.status} result-flash-${visibleWinner ?? "none"}`} aria-labelledby="boss-title">
        {(visibleWinner === "noa" || battle.status === "won") && (
          <div className="duel-confetti" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <i style={{ "--piece-x": `${index * 7}%`, "--piece-delay": `${index * 25}ms`, "--piece-drift": `${(index - 7) * 5}px`, "--piece-hue": index * 47 } as CSSProperties} key={index} />
            ))}
          </div>
        )}
        <header className="boss-header">
          <div>
            <p className="eyebrow">Monstruo final · Ronda {roundNumber}</p>
            <h2 id="boss-title">Duelo contra {boss.name}</h2>
            <p>{boss.intro}</p>
          </div>
          <div className="duel-status-panel">
            <div className="duel-score" aria-label={`Marcador: Noa ${battle.noaScore}, ${boss.name} ${battle.bossScore}`}>
              <span>NOA <strong>{battle.noaScore}</strong></span><b>—</b><span><strong>{battle.bossScore}</strong> JEFE</span>
            </div>
            <div className="duel-attempts" aria-label={`${apples} reintentos disponibles`}>
              <span><GameAssetIcon kind="apple" /> × {apples}</span><small>{apples === 1 ? "reintento" : "reintentos"}</small>
            </div>
          </div>
        </header>

        {history.length > 0 && (
          <ol className="round-history" aria-label="Historial de rondas">
            {history.map((round, index) => (
              <li className={`history-${round.winner}`} key={`${round.noaChoice}-${round.bossChoice}-${index}`}>
                <small>R{index + 1}</small><RpsIcon choice={round.noaChoice} small /><b>{round.winner === "noa" ? "★" : round.winner === "boss" ? "×" : "="}</b><RpsIcon choice={round.bossChoice} small />
              </li>
            ))}
          </ol>
        )}

        <div className={`duel-arena ${battle.status === "countdown" ? "is-countdown" : ""} ${choicesRevealed ? "is-revealed" : ""}`}>
          {battle.status === "countdown" && <div className="duel-countdown" aria-live="assertive">{countdown === 0 ? "¡YA!" : countdown}</div>}
          <div className={`duel-fighter noa-fighter ${visibleWinner === "noa" ? "round-winner" : visibleWinner === "boss" ? "round-loser" : ""}`}>
            <NoaDuelSprite frame={noaFrame} />
            <strong>NOA</strong>
            <div className={`gesture-card ${battle.status === "countdown" ? "is-hidden" : ""}`}>
              <span>{choicesRevealed && battle.noaChoice ? <RpsIcon choice={battle.noaChoice} /> : "?"}</span>
              <b>{choicesRevealed && battle.noaChoice ? choiceById[battle.noaChoice].label : battle.status === "countdown" ? "Pensando…" : "Preparada"}</b>
            </div>
          </div>
          <div className="duel-versus" aria-hidden="true">VS</div>
          <div className={`duel-fighter ${visibleWinner === "boss" ? "round-winner" : visibleWinner === "noa" ? "round-loser" : ""}`}>
            <BossSprite assetPrefix={boss.assetPrefix} frame={bossFrame} name={boss.name} sheet={boss.sheet} />
            <strong>{boss.name}</strong>
            <div className={`gesture-card ${battle.status === "countdown" ? "is-hidden" : ""}`}>
              <span>{choicesRevealed && battle.bossChoice ? <RpsIcon choice={battle.bossChoice} /> : "?"}</span>
              <b>{choicesRevealed && battle.bossChoice ? choiceById[battle.bossChoice].label : battle.status === "countdown" ? "Pensando…" : "Esperando"}</b>
            </div>
          </div>
        </div>

        <div className={`round-message result-${visibleWinner ?? "none"}`} aria-live="polite">
          <strong>{battle.status === "countdown" ? "Piedra, papel…" : battle.status === "won" ? "¡Noa gana el duelo!" : battle.status === "lost" ? `Esta vez gana ${boss.name}` : visibleWinner === "noa" ? "¡Ronda para Noa!" : visibleWinner === "boss" ? `Ronda para ${boss.name}` : visibleWinner === "tie" ? "¡Empate!" : "Piedra, papel o tijera"}</strong>
          <span>{battle.status === "countdown" ? "Los dos gestos aparecerán a la vez." : battle.status === "won" ? `${boss.name} sonríe y deja libre el camino.` : battle.status === "lost" ? apples > 0 ? "Puedes gastar una manzana para repetir el duelo." : "No quedan manzanas: toca recorrer de nuevo la pantalla." : roundText}</span>
        </div>

        {battle.status === "choosing" && (
          <div className="duel-choices" aria-label="Elige piedra, papel o tijera">
            {choices.map((choice, index) => (
              <button type="button" onClick={() => choose(choice.id)} style={{ "--choice-delay": `${index * 75}ms` } as CSSProperties} key={choice.id}>
                <span><RpsIcon choice={choice.id} /></span><strong>{choice.label}</strong>
              </button>
            ))}
          </div>
        )}
        {battle.status === "revealed" && <button className="pixel-button primary duel-next" type="button" onClick={nextRound}>Siguiente ronda ▶</button>}
        {battle.status === "lost" && apples > 0 && <button className="pixel-button primary duel-next apple-retry" type="button" onClick={retryWithApple}><GameAssetIcon kind="apple" /> Usar una manzana y repetir</button>}
        {battle.status === "lost" && apples === 0 && <button className="pixel-button primary duel-next restart-level" type="button" onClick={onRestartLevel}>↺ Volver a empezar la pantalla</button>}
        {battle.status === "won" && <button className="pixel-button primary duel-next" type="button" onClick={() => { playSound("goal"); onWin(); }}>Continuar la aventura ▶</button>}
        {battle.status !== "won" && <button className="text-button duel-abandon" type="button" onClick={abandonBattle}>🏳 Rendirse y volver al mapa</button>}

        <p className="duel-rules"><span><RpsIcon choice="rock" small /> gana a <RpsIcon choice="scissors" small /></span><span><RpsIcon choice="scissors" small /> gana a <RpsIcon choice="paper" small /></span><span><RpsIcon choice="paper" small /> gana a <RpsIcon choice="rock" small /></span></p>
      </section>
    </div>
  );
}
