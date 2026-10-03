import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BossBattle } from "./game/BossBattle";
import { GameCanvas, type SoundKind } from "./game/GameCanvas";
import { levels, themeNames } from "./game/levels";
import type { GameSnapshot } from "./game/types";

const STORAGE_KEY = "super-noa-progress-v1";

type LevelStats = Record<string, { completed: boolean; bestApples: number }>;
type Progress = { unlocked: number; levelStats: LevelStats };
type Screen = "home" | "map" | "game" | "boss" | "complete" | "gameover" | "finished";

const emptyProgress: Progress = { unlocked: 0, levelStats: {} };
const emptySnapshot: GameSnapshot = { apples: 0, power: "normal", checkpoint: 0, paused: false };

function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress;
    const saved = JSON.parse(raw) as Partial<Progress>;
    const levelStats = saved.levelStats && typeof saved.levelStats === "object" ? saved.levelStats : {};
    const savedUnlocked = Math.max(0, Number(saved.unlocked) || 0);
    const hasNewLevelStats = ["1-3", "2-3", "3-3"].some((id) => Object.hasOwn(levelStats, id));
    const legacyIndexMap = [0, 1, 3, 4, 6, 7];
    let unlocked = hasNewLevelStats
      ? Math.min(levels.length - 1, savedUnlocked)
      : legacyIndexMap[Math.min(legacyIndexMap.length - 1, savedUnlocked)];
    levels.forEach((level, index) => {
      if (levelStats[level.id]?.completed) unlocked = Math.max(unlocked, Math.min(levels.length - 1, index + 1));
    });
    return {
      unlocked,
      levelStats,
    };
  } catch {
    return emptyProgress;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [screen, setScreen] = useState<Screen>("home");
  const [activeIndex, setActiveIndex] = useState(0);
  const [lives, setLives] = useState(5);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem("super-noa-muted") === "true");
  const [showHelp, setShowHelp] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(emptySnapshot);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeLevel = levels[activeIndex];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem("super-noa-muted", String(muted));
  }, [muted]);

  useEffect(() => {
    const tracks = {
      1: "./assets/music/manzanos.mp3",
      2: "./assets/music/gatitos.mp3",
      3: "./assets/music/lobos.mp3",
    } as const;
    const audio = new Audio(tracks[activeLevel.world]);
    audio.loop = true;
    audio.volume = 0.22;
    musicRef.current?.pause();
    musicRef.current = audio;
    if ((screen === "game" || screen === "boss") && !paused && !muted) void audio.play().catch(() => undefined);
    return () => audio.pause();
  }, [activeLevel.world, muted, paused, screen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && screen === "game") setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen]);

  const playSound = useCallback((kind: SoundKind) => {
    if (muted) return;
    const audioContext = audioContextRef.current ?? createAudioContext();
    if (!audioContext) return;
    audioContextRef.current = audioContext;
    if (audioContext.state === "suspended") void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const notes: Record<SoundKind, [number, number, OscillatorType]> = {
      apple: [660, 0.11, "square"], block: [410, 0.12, "square"], cat: [523, 0.28, "triangle"], jump: [360, 0.12, "square"],
      hurt: [145, 0.22, "sawtooth"], stomp: [210, 0.09, "square"], yarn: [760, 0.08, "triangle"],
      checkpoint: [880, 0.18, "triangle"], goal: [1046, 0.42, "square"],
    };
    const [frequency, duration, type] = notes[kind];
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "hurt" ? 70 : frequency * 1.35, now + duration);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }, [muted]);

  const totalApples = useMemo(
    () => Object.values(progress.levelStats).reduce((total, stat) => total + (Number(stat.bestApples) || 0), 0),
    [progress.levelStats],
  );

  const beginLevel = (index: number) => {
    if (index > progress.unlocked) return;
    setActiveIndex(index);
    setLives(5);
    setSnapshot(emptySnapshot);
    setPaused(false);
    setScreen("game");
  };

  const handleLoseLife = useCallback(() => {
    setLives((current) => {
      if (current <= 1) {
        window.setTimeout(() => setScreen("gameover"), 0);
        return 0;
      }
      return current - 1;
    });
  }, []);

  const handleComplete = useCallback(() => {
    setProgress((current) => {
      const previous = current.levelStats[activeLevel.id];
      return {
        unlocked: Math.max(current.unlocked, Math.min(levels.length - 1, activeIndex + 1)),
        levelStats: {
          ...current.levelStats,
          [activeLevel.id]: { completed: true, bestApples: Math.max(previous?.bestApples ?? 0, snapshot.apples) },
        },
      };
    });
    setScreen(activeIndex === levels.length - 1 ? "finished" : "complete");
  }, [activeIndex, activeLevel.id, snapshot.apples]);

  const handleBossEncounter = useCallback(() => {
    setPaused(false);
    setScreen("boss");
  }, []);

  const nextLevel = () => {
    setActiveIndex(Math.min(levels.length - 1, activeIndex + 1));
    setLives(5);
    setSnapshot(emptySnapshot);
    setPaused(false);
    setScreen("game");
  };

  const resetProgress = () => {
    if (!window.confirm("¿Empezar de nuevo? Se borrarán las pantallas completadas y las manzanas guardadas.")) return;
    setProgress(emptyProgress);
    setActiveIndex(0);
    setLives(5);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <main className="app-shell">
      {screen === "home" && (
        <section className="home-screen" aria-labelledby="game-title">
          <div className="star-field" aria-hidden="true" />
          <div className="home-copy">
            <p className="eyebrow">Una aventura de 8 bits</p>
            <h1 id="game-title"><span>SUPER</span> NOA</h1>
            <p className="home-lead">Nueve aventuras entre manzanos, ovillos, gatitos y tres grandes duelos de piedra, papel o tijera.</p>
            <div className="home-actions">
              <button className="pixel-button primary" type="button" onClick={() => setScreen("map")}>▶ Jugar</button>
              <button className="pixel-button" type="button" onClick={() => setShowHelp(true)}>¿Cómo se juega?</button>
            </div>
            {progress.unlocked > 0 && <p className="save-note">Partida guardada · {Object.values(progress.levelStats).filter((stats) => stats.completed).length}/9 pantallas</p>}
          </div>
          <div className="hero-scene" aria-hidden="true">
            <div className="pixel-sun" />
            <div className="hero-sprite" style={{ backgroundImage: 'url("./assets/sprites/noa-sprite-sheet.png")' }} />
            <div className="hero-apple">●</div>
            <div className="hero-cat">=^•ᴥ•^=</div>
          </div>
          <nav className="home-footer" aria-label="Opciones">
            <button type="button" onClick={() => setMuted((value) => !value)}>{muted ? "🔇 Activar sonido" : "🔊 Sonido"}</button>
            <button type="button" onClick={() => setShowCredits(true)}>Créditos</button>
          </nav>
        </section>
      )}

      {screen === "map" && (
        <section className="map-screen">
          <header className="map-header">
            <div><p className="eyebrow">Elige una pantalla</p><h2>El mapa de Noa</h2></div>
            <div className="map-actions">
              <span className="apple-total">🍎 {totalApples}</span>
              <button className="icon-button" type="button" onClick={() => setScreen("home")} aria-label="Volver al inicio">⌂</button>
            </div>
          </header>
          <div className="world-list">
            {[1, 2, 3].map((world) => (
              <article className={`world-card world-${world}`} key={world}>
                <div className="world-heading">
                  <span className="world-number">Mundo {world}</span>
                  <h3>{world === 1 ? "El Prado de las Manzanas" : world === 2 ? "El Bosque de los Gatitos" : "El Bosque de los Lobos"}</h3>
                  <p>{world === 1 ? "Sol, ramas anchas y manzanas crujientes." : world === 2 ? "Luciérnagas, luna y suaves maullidos." : "Pinos, huellas y lobos enfadados."}</p>
                </div>
                <div className="level-row">
                  {levels.map((level, index) => {
                    if (level.world !== world) return null;
                    const unlocked = index <= progress.unlocked;
                    const stats = progress.levelStats[level.id];
                    return (
                      <button className={`level-card ${stats?.completed ? "is-complete" : ""}`} type="button" disabled={!unlocked} onClick={() => beginLevel(index)} key={level.id}>
                        <span className="level-id">{unlocked ? level.id : "🔒"}</span>
                        <strong>{level.title}</strong>
                        <small>{stats?.completed ? `✓ Completada · 🍎 ${stats.bestApples}` : unlocked ? "Lista para jugar" : "Completa la anterior"}</small>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
          <button className="text-button reset-button" type="button" onClick={resetProgress}>Borrar progreso</button>
        </section>
      )}

      {(screen === "game" || screen === "boss" || screen === "complete" || screen === "gameover" || screen === "finished") && (
        <section className="play-screen">
          <header className="game-hud">
            <div className="hud-level"><span>{activeLevel.id}</span><strong>{activeLevel.title}</strong></div>
            <div className="hud-stats">
              <span aria-label={`${lives} vidas`}>♥ × {lives}</span>
              <span aria-label={`${snapshot.apples} manzanas`}>🍎 × {snapshot.apples}</span>
              <span className={`power-chip power-${snapshot.power}`}>{snapshot.power === "cat" ? "🧶 Gato" : snapshot.power === "apple" ? "🍎 Protegida" : "Noa"}</span>
            </div>
            <div className="hud-actions">
              <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Activar sonido" : "Silenciar"}>{muted ? "🔇" : "🔊"}</button>
              <button type="button" onClick={toggleFullscreen} aria-label="Pantalla completa">⛶</button>
              {screen === "game" && <button type="button" onClick={() => setPaused((value) => !value)} aria-label="Pausa">Ⅱ</button>}
            </div>
          </header>
          <GameCanvas level={activeLevel} running={screen === "game" && !paused} onLoseLife={handleLoseLife} onComplete={handleComplete} onBossEncounter={handleBossEncounter} onSnapshot={setSnapshot} playSound={playSound} />
          <div className="level-caption"><span>{themeNames[activeLevel.theme]}</span><span>Bandera {snapshot.checkpoint}/{activeLevel.checkpoints.length}</span></div>

          {screen === "boss" && activeLevel.boss && (
            <BossBattle key={activeLevel.id} bossId={activeLevel.boss} onWin={handleComplete} playSound={playSound} />
          )}

          {paused && screen === "game" && (
            <div className="modal-backdrop"><div className="game-modal compact">
              <p className="eyebrow">Descanso</p><h2>Juego en pausa</h2>
              <button className="pixel-button primary" type="button" onClick={() => setPaused(false)}>Seguir jugando</button>
              <button className="pixel-button" type="button" onClick={() => { setPaused(false); setScreen("map"); }}>Volver al mapa</button>
            </div></div>
          )}

          {screen === "complete" && (
            <div className="modal-backdrop celebration"><div className="game-modal">
              <div className="big-icon">{activeLevel.boss ? "🏆" : "🐱"}</div><p className="eyebrow">{activeLevel.boss ? "¡Duelo ganado!" : "¡Gatito encontrado!"}</p>
              <h2>Pantalla {activeLevel.id} completada</h2>
              <p>Noa ha recogido {snapshot.apples} {snapshot.apples === 1 ? "manzana" : "manzanas"}. {activeLevel.boss ? "El monstruo guardián ha dejado libre el camino." : "La siguiente aventura ya está abierta."}</p>
              <button className="pixel-button primary" type="button" onClick={nextLevel}>Siguiente pantalla ▶</button>
              <button className="pixel-button" type="button" onClick={() => setScreen("map")}>Volver al mapa</button>
            </div></div>
          )}

          {screen === "gameover" && (
            <div className="modal-backdrop"><div className="game-modal">
              <div className="big-icon">🍎</div><p className="eyebrow">Casi, casi…</p><h2>¡Otra oportunidad!</h2>
              <p>Las cinco vidas vuelven a estar listas. El camino ya te lo sabes.</p>
              <button className="pixel-button primary" type="button" onClick={() => beginLevel(activeIndex)}>Reintentar</button>
              <button className="pixel-button" type="button" onClick={() => setScreen("map")}>Volver al mapa</button>
            </div></div>
          )}

          {screen === "finished" && (
            <div className="modal-backdrop celebration"><div className="game-modal finale">
              <div className="cat-party" aria-hidden="true">🐱 🍎 🐱 🧶 🐱</div><p className="eyebrow">Aventura completada</p>
              <h2>¡Bravo, Super Noa!</h2><p>Los tres guardianes son ahora amigos de Noa y todos los gatitos celebran una fiesta bajo la luna. Fin… por ahora.</p>
              <button className="pixel-button primary" type="button" onClick={() => setScreen("map")}>Ver el mapa</button>
              <button className="pixel-button" type="button" onClick={() => setScreen("home")}>Ir al inicio</button>
            </div></div>
          )}
        </section>
      )}

      {showHelp && (
        <div className="modal-backdrop"><div className="game-modal help-modal">
          <button className="modal-close" type="button" onClick={() => setShowHelp(false)} aria-label="Cerrar">×</button>
          <p className="eyebrow">Es muy fácil</p><h2>Cómo jugar</h2>
          <div className="help-grid">
            <div><span>◀ ▶</span><strong>Moverse</strong><small>Flechas o A y D</small></div>
            <div><span>↑</span><strong>Saltar</strong><small>Espacio, W o flecha arriba</small></div>
            <div><span>▣</span><strong>Abrir cajas</strong><small>Salta y golpea la huella desde abajo</small></div>
            <div><span>🧶</span><strong>Lanzar</strong><small>X o K, después de coger el gato</small></div>
            <div><span>🍎</span><strong>Protegerse</strong><small>Una manzana protege de un golpe</small></div>
            <div><span>🪨✋✌️</span><strong>Vencer al jefe</strong><small>Gana dos rondas de piedra, papel o tijera</small></div>
          </div>
          <p className="help-note">También puedes usar los botones grandes de la pantalla o un mando.</p>
          <button className="pixel-button primary" type="button" onClick={() => { setShowHelp(false); setScreen("map"); }}>¡Vamos!</button>
        </div></div>
      )}

      {showCredits && (
        <div className="modal-backdrop"><div className="game-modal credits-modal">
          <button className="modal-close" type="button" onClick={() => setShowCredits(false)} aria-label="Cerrar">×</button>
          <p className="eyebrow">Hecho con cariño</p><h2>Créditos</h2>
          <p><strong>Super Noa</strong> es un juego original inspirado en los plataformas familiares de 8 bits.</p>
          <p>Personaje creado para este proyecto a partir de referencias privadas. Las fotografías originales no forman parte de la web.</p>
          <p>Música de los tres mundos: <a href="https://opengameart.org/content/platformer-chiptunes" target="_blank" rel="noreferrer">Platformer Chiptunes</a>, de Guy G. Gamerson, publicada bajo licencia CC0.</p>
          <p>Los tres monstruos finales son diseños originales generados para este proyecto. Efectos de sonido generados en el navegador; escenarios, interfaz y código creados para Super Noa.</p>
          <button className="pixel-button primary" type="button" onClick={() => setShowCredits(false)}>Cerrar</button>
        </div></div>
      )}
    </main>
  );
}
