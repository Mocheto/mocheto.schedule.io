import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BossBattle } from "./game/BossBattle";
import { GameAssetIcon } from "./game/GameAssetIcon";
import { PixelIcon } from "./game/PixelIcon";
import { GameCanvas, type SoundKind } from "./game/GameCanvas";
import { levels, themeNames } from "./game/levels";
import { getStickerSprite, stickerCatalog } from "./game/stickers";
import type { GameSnapshot } from "./game/types";

const STORAGE_KEY = "super-noa-progress-v1";

type LevelStats = Record<string, { completed: boolean; bestApples: number }>;
type Progress = { unlocked: number; levelStats: LevelStats; stickers: string[]; secretUnlocked: boolean };
type Screen = "home" | "map" | "game" | "boss" | "complete" | "gameover" | "finished" | "secret-transition";

const emptyProgress: Progress = { unlocked: 0, levelStats: {}, stickers: [], secretUnlocked: false };
const emptySnapshot: GameSnapshot = { apples: 0, stickers: [], power: "normal", checkpoint: 0, paused: false };
const MAX_LIVES = 3;
const secretLevelIndex = levels.findIndex((level) => level.world === 7);
const campaignLevelCount = secretLevelIndex === -1 ? levels.length : secretLevelIndex;
const worldCatalog = [
  { id: 1, name: "El Prado de las Manzanas", description: "Sol, ramas anchas y manzanas crujientes." },
  { id: 2, name: "El Bosque de los Gatitos", description: "Luciérnagas, cristales, murciélagos y una cueva de lava." },
  { id: 3, name: "El Bosque de los Lobos", description: "Pinos, luna llena y lobos enfadados." },
  { id: 4, name: "El Bosque de los Jabalíes", description: "Bellotas, copas altas y jabalíes salvajes." },
  { id: 5, name: "La Flota de las Nubes", description: "Barcos voladores, piratas, loros y cañones." },
  { id: 6, name: "El Castillo Encantado", description: "Un laberinto de piedra, trampas con pinchos y fantasmas traviesos." },
  { id: 7, name: "El Reino Secreto", description: "Nubes mágicas, pájaros y unicornios en lo más alto del cielo." },
] as const;

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
      ? Math.min(campaignLevelCount - 1, savedUnlocked)
      : legacyIndexMap[Math.min(legacyIndexMap.length - 1, savedUnlocked)];
    levels.forEach((level, index) => {
      if (level.world !== 7 && levelStats[level.id]?.completed) unlocked = Math.max(unlocked, Math.min(campaignLevelCount - 1, index + 1));
    });
    return {
      unlocked,
      levelStats,
      stickers: Array.isArray(saved.stickers) ? saved.stickers.filter((id): id is string => typeof id === "string") : [],
      secretUnlocked: saved.secretUnlocked === true || Boolean(levelStats["S-1"]),
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
  const [levelRun, setLevelRun] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem("super-noa-muted") === "true");
  const [showHelp, setShowHelp] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showAlbum, setShowAlbum] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(emptySnapshot);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playScreenRef = useRef<HTMLElement | null>(null);
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
      4: "./assets/music/lobos.mp3",
      5: "./assets/music/manzanos.mp3",
      6: "./assets/music/castillo.wav",
      7: "./assets/music/gatitos.mp3",
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
      checkpoint: [880, 0.18, "triangle"], goal: [1046, 0.42, "square"], sticker: [1174, 0.32, "triangle"],
      howl: [196, 0.48, "sawtooth"], snort: [110, 0.22, "square"], countdown: [330, 0.08, "square"],
      cannon: [92, 0.3, "sawtooth"],
    };
    const [frequency, duration, type] = notes[kind];
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "hurt" || kind === "howl" || kind === "snort" ? 70 : frequency * 1.35, now + duration);
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
  const albumStickers = progress.secretUnlocked ? stickerCatalog : stickerCatalog.filter((sticker) => sticker.world !== 7);

  const beginLevel = (index: number) => {
    if (index === secretLevelIndex ? !progress.secretUnlocked : index > progress.unlocked) return;
    setActiveIndex(index);
    setLevelRun((current) => current + 1);
    setLives(MAX_LIVES);
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

  const handleSnapshot = useCallback((next: GameSnapshot) => {
    setSnapshot(next);
    if (next.stickers.length === 0) return;
    setProgress((current) => {
      const newStickers = next.stickers.filter((id) => !current.stickers.includes(id));
      return newStickers.length > 0 ? { ...current, stickers: [...current.stickers, ...newStickers] } : current;
    });
  }, []);

  const handleComplete = useCallback(() => {
    setProgress((current) => {
      const previous = current.levelStats[activeLevel.id];
      return {
        ...current,
        unlocked: activeLevel.world === 7 ? current.unlocked : Math.max(current.unlocked, Math.min(campaignLevelCount - 1, activeIndex + 1)),
        levelStats: {
          ...current.levelStats,
          [activeLevel.id]: { completed: true, bestApples: Math.max(previous?.bestApples ?? 0, snapshot.apples) },
        },
      };
    });
    setScreen(activeLevel.id === "6-3" ? "finished" : "complete");
  }, [activeIndex, activeLevel.id, activeLevel.world, snapshot.apples]);

  const handleBossEncounter = useCallback(() => {
    setPaused(false);
    setScreen("boss");
  }, []);

  const handleSecretExit = useCallback(() => {
    setProgress((current) => ({ ...current, secretUnlocked: true }));
    setPaused(false);
    setScreen("secret-transition");
    window.setTimeout(() => {
      setActiveIndex(secretLevelIndex);
      setLevelRun((current) => current + 1);
      setLives(MAX_LIVES);
      setSnapshot(emptySnapshot);
      setScreen("game");
    }, 1800);
  }, []);

  const spendBossApple = useCallback(() => {
    setSnapshot((current) => {
      const apples = Math.max(0, current.apples - 1);
      return { ...current, apples, power: apples === 0 && current.power === "apple" ? "normal" : current.power };
    });
  }, []);

  const restartBossLevel = useCallback(() => {
    setLevelRun((current) => current + 1);
    setSnapshot(emptySnapshot);
    setPaused(false);
    setScreen("game");
  }, []);

  const abandonBossBattle = useCallback(() => {
    setPaused(false);
    setScreen("map");
  }, []);

  const nextLevel = () => {
    setActiveIndex(Math.min(levels.length - 1, activeIndex + 1));
    setLevelRun((current) => current + 1);
    setLives(MAX_LIVES);
    setSnapshot(emptySnapshot);
    setPaused(false);
    setScreen("game");
  };

  const resetProgress = () => {
    if (!window.confirm("¿Empezar de nuevo? Se borrarán las pantallas, las manzanas y las pegatinas guardadas.")) return;
    setProgress(emptyProgress);
    setActiveIndex(0);
    setLives(MAX_LIVES);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void (playScreenRef.current ?? document.documentElement).requestFullscreen?.().catch(() => undefined);
  };

  return (
    <main className="app-shell">
      {screen === "home" && (
        <section className="home-screen" aria-labelledby="game-title">
          <div className="star-field" aria-hidden="true" />
          <div className="home-copy">
            <p className="eyebrow">Una aventura pixel art</p>
            <h1 id="game-title"><span>SUPER</span> NOA</h1>
            <p className="home-lead">Ponte las orejas de gatita, salta entre manzanos, barcos voladores y castillos encantados, rescata a los gatitos y hazte amiga de seis grandes guardianes.</p>
            <p className="home-invite"><PixelIcon kind="sparkle" /> ¡La aventura te está esperando!</p>
            <div className="home-actions">
              <button className="pixel-button primary home-play" type="button" onClick={() => setScreen("map")}>▶ ¡Jugar ahora!</button>
              <button className="pixel-button" type="button" onClick={() => setShowHelp(true)}>¿Cómo se juega?</button>
            </div>
            {progress.unlocked > 0 && <p className="save-note">Partida guardada · {Object.values(progress.levelStats).filter((stats) => stats.completed).length}/{campaignLevelCount}{progress.secretUnlocked ? " + secreto" : ""}</p>}
          </div>
          <div className="hero-scene" aria-hidden="true">
            <img className="hero-backdrop" src="./assets/home-adventure-v2.png" alt="" />
            <div className="hero-rays" />
            <img className="hero-sprite hero-cat-sprite" src="./assets/sprites/noa-cat-jump-v2.png" alt="" />
          </div>
          <nav className="home-footer" aria-label="Opciones">
            <button type="button" onClick={() => setMuted((value) => !value)}><PixelIcon kind={muted ? "mute" : "sound"} /> {muted ? "Activar sonido" : "Sonido"}</button>
            <button type="button" onClick={() => setShowAlbum(true)}>Álbum {progress.stickers.filter((id) => albumStickers.some((sticker) => sticker.id === id)).length}/{albumStickers.length}</button>
            <button type="button" onClick={() => setShowCredits(true)}>Créditos</button>
          </nav>
        </section>
      )}

      {screen === "map" && (
        <section className="map-screen">
          <header className="map-header">
            <div><p className="eyebrow">Elige una pantalla</p><h2>El mapa de Noa</h2></div>
            <div className="map-actions">
              <span className="apple-total"><GameAssetIcon kind="apple" /> {totalApples}</span>
              <button className="album-button" type="button" onClick={() => setShowAlbum(true)}><PixelIcon kind="sparkle" /> {progress.stickers.filter((id) => albumStickers.some((sticker) => sticker.id === id)).length}/{albumStickers.length}</button>
              <button className="icon-button" type="button" onClick={() => setScreen("home")} aria-label="Volver al inicio">⌂</button>
            </div>
          </header>
          <div className="world-list">
            {worldCatalog.filter((world) => world.id !== 7 || progress.secretUnlocked).map((world) => (
              <article className={`world-card world-${world.id}`} key={world.id}>
                <img className="world-art" src={`./assets/worlds/world-${world.id}.png`} alt="" aria-hidden="true" />
                <div className="world-heading">
                  <span className="world-number">{world.id === 7 ? "Mundo secreto" : `Mundo ${world.id}`}</span>
                  <h3>{world.name}</h3>
                  <p>{world.description}</p>
                </div>
                <div className="level-row">
                  {levels.map((level, index) => {
                    if (level.world !== world.id) return null;
                    const unlocked = level.world === 7 ? progress.secretUnlocked : index <= progress.unlocked;
                    const stats = progress.levelStats[level.id];
                    return (
                      <button className={`level-card ${stats?.completed ? "is-complete" : ""}`} type="button" disabled={!unlocked} onClick={() => beginLevel(index)} key={level.id}>
                        <span className="level-id">{unlocked ? level.id : <PixelIcon kind="lock" />}</span>
                        <strong>{level.title}</strong>
                        <small>{stats?.completed ? <>✓ Completada · <GameAssetIcon kind="apple" /> {stats.bestApples}</> : unlocked ? "Lista para jugar" : "Completa la anterior"}</small>
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

      {screen === "secret-transition" && (
        <section className="secret-transition" aria-live="polite">
          <img className="secret-vine-rise" src="./assets/sprites/secret-vine-transition-v1.png" alt="" aria-hidden="true" />
          <p className="eyebrow">¡Pasadizo secreto!</p>
          <h2>Subiendo al Reino de las Nubes…</h2>
          <p>La enredadera mágica lleva a Noa por encima del bosque.</p>
          <div className="transition-clouds" aria-hidden="true">☁ ☁ ☁</div>
        </section>
      )}

      {(screen === "game" || screen === "boss" || screen === "complete" || screen === "gameover" || screen === "finished") && (
        <section className="play-screen" ref={playScreenRef}>
          <header className="game-hud">
            <div className="hud-level"><span>{activeLevel.id}</span><strong>{activeLevel.title}</strong></div>
            <div className="hud-stats">
              <span aria-label={`${lives} vidas`}><GameAssetIcon kind="heart" /> × {lives}</span>
              <span aria-label={`${snapshot.apples} manzanas`}><GameAssetIcon kind="apple" /> × {snapshot.apples}</span>
              <span aria-label={`${snapshot.stickers.length} pegatinas encontradas`}><PixelIcon kind="sparkle" /> × {snapshot.stickers.length}</span>
              <span className={`power-chip power-${snapshot.power}`}>{snapshot.power === "cat" ? <><PixelIcon kind="yarn" /> Gato</> : snapshot.power === "apple" ? <><GameAssetIcon kind="apple" /> Protegida</> : "Noa"}</span>
            </div>
            <div className="hud-actions">
              <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Activar sonido" : "Silenciar"}><PixelIcon kind={muted ? "mute" : "sound"} /></button>
              <button type="button" onClick={toggleFullscreen} aria-label="Pantalla completa">⛶</button>
              {screen === "game" && <button type="button" onClick={() => setPaused((value) => !value)} aria-label="Pausa">Ⅱ</button>}
            </div>
          </header>
          <GameCanvas key={`game-${activeLevel.id}-${levelRun}`} level={activeLevel} running={screen === "game" && !paused} onLoseLife={handleLoseLife} onComplete={handleComplete} onBossEncounter={handleBossEncounter} onSecretExit={handleSecretExit} onSnapshot={handleSnapshot} playSound={playSound} />
          <div className="level-caption"><span>{themeNames[activeLevel.theme]}</span><span>Bandera {snapshot.checkpoint}/{activeLevel.checkpoints.length}</span></div>

          {screen === "boss" && activeLevel.boss && (
            <BossBattle
              key={`boss-${activeLevel.id}-${levelRun}`}
              bossId={activeLevel.boss}
              apples={snapshot.apples}
              protectedByApple={snapshot.power === "apple"}
              onSpendApple={spendBossApple}
              onRestartLevel={restartBossLevel}
              onAbandon={abandonBossBattle}
              onWin={handleComplete}
              playSound={playSound}
            />
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
              <div className="big-icon">{activeLevel.boss ? <img className="completion-trophy" src="./assets/sprites/completion-trophy-v1.png" alt="Trofeo dorado con una huella de gato" /> : <img className="completion-cat" src="./assets/sprites/completion-cat-v1.png" alt="Gatito feliz rescatado" />}</div><p className="eyebrow">{activeLevel.boss ? "¡Duelo ganado!" : "¡Gatito encontrado!"}</p>
              <h2>Pantalla {activeLevel.id} completada</h2>
              <p>Noa ha recogido {snapshot.apples} {snapshot.apples === 1 ? "manzana" : "manzanas"}. {activeLevel.world === 7 ? "La Reina Arcoíris guarda para siempre las insignias encontradas." : activeLevel.boss ? "El monstruo guardián ha dejado libre el camino." : "La siguiente aventura ya está abierta."}</p>
              {snapshot.stickers.length > 0 && <p className="sticker-found"><PixelIcon kind="sparkle" /> {snapshot.stickers.length === 1 ? "Insignia guardada" : `${snapshot.stickers.length} insignias guardadas`} en el álbum.</p>}
              {activeLevel.world !== 7 && <button className="pixel-button primary" type="button" onClick={nextLevel}>Siguiente pantalla ▶</button>}
              {activeLevel.world === 7 && <button className="pixel-button primary" type="button" onClick={() => setScreen("map")}>Volver al mapa secreto</button>}
              {activeLevel.world !== 7 && <button className="pixel-button" type="button" onClick={() => setScreen("map")}>Volver al mapa</button>}
            </div></div>
          )}

          {screen === "gameover" && (
            <div className="modal-backdrop"><div className="game-modal">
              <div className="big-icon"><GameAssetIcon kind="apple" /></div><p className="eyebrow">Casi, casi…</p><h2>¡Otra oportunidad!</h2>
              <p>Las tres vidas vuelven a estar listas. El camino ya te lo sabes.</p>
              <button className="pixel-button primary" type="button" onClick={() => beginLevel(activeIndex)}>Reintentar</button>
              <button className="pixel-button" type="button" onClick={() => setScreen("map")}>Volver al mapa</button>
            </div></div>
          )}

          {screen === "finished" && (
            <div className="modal-backdrop celebration"><div className="game-modal finale">
              <div className="cat-party" aria-hidden="true"><PixelIcon kind="cat" /><GameAssetIcon kind="apple" /><PixelIcon kind="cat" /><PixelIcon kind="yarn" /><PixelIcon kind="cat" /></div><p className="eyebrow">Aventura completada</p>
              <h2>¡Bravo, Super Noa!</h2><p>Los seis guardianes son ahora amigos de Noa. Los gatitos y la tripulación celebran una fiesta en el castillo. Fin… por ahora.</p>
              <button className="pixel-button primary" type="button" onClick={() => setScreen("map")}>Ver el mapa</button>
              <button className="pixel-button" type="button" onClick={() => setScreen("home")}>Ir al inicio</button>
            </div></div>
          )}
        </section>
      )}

      {showHelp && (
        <div className="modal-backdrop"><div className="game-modal help-modal">
          <button className="modal-close" type="button" onClick={() => setShowHelp(false)} aria-label="Cerrar">×</button>
          <p className="eyebrow">Ayuda a Noa</p><h2>¿Cómo se juega?</h2>
          <p className="help-intro">¡Camina, salta y busca caminos secretos!</p>
          <div className="help-first-steps">
            <div><b>1</b><span className="help-control-icon">◀ ▶</span><strong>Camina</strong><small>Mantén pulsada una flecha.</small></div>
            <div className="help-double-jump"><b>2</b><span className="help-control-icon">↑ + ↑</span><strong>Haz un doble salto</strong><small>Toca <em>SALTAR</em>. En el aire, ¡tócalo otra vez!</small></div>
            <div><b>3</b><span className="help-control-icon">▣</span><strong>Abre las cajas</strong><small>Salta y golpea la caja por debajo.</small></div>
          </div>
          <p className="help-mobile-tip"><strong>En móvil:</strong> puedes mantener una flecha con un dedo y tocar <b>SALTAR</b> con el otro.</p>
          <div className="help-grid">
            <div><span><PixelIcon kind="yarn" /></span><strong>Bola de lana</strong><small>Cuando Noa tenga orejas de gato, toca <b>LANA</b>.</small></div>
            <div><span><GameAssetIcon kind="apple" /></span><strong>Manzana escudo</strong><small>La manzana salva a Noa de un golpe.</small></div>
            <div><span className="help-rps"><PixelIcon kind="rock" /><PixelIcon kind="paper" /><PixelIcon kind="scissors" /></span><strong>Duelo final</strong><small>Gana dos rondas de piedra, papel o tijera.</small></div>
            <div><span><PixelIcon kind="sparkle" /></span><strong>Mira arriba</strong><small>Las pegatinas se esconden en caminos altos.</small></div>
          </div>
          <p className="help-note">Con teclado: A/D o flechas para caminar, espacio para saltar y X/K para lanzar lana. También puedes usar un mando.</p>
          <button className="pixel-button primary" type="button" onClick={() => { setShowHelp(false); setScreen("map"); }}>¡Lista para jugar!</button>
        </div></div>
      )}

      {showCredits && (
        <div className="modal-backdrop"><div className="game-modal credits-modal">
          <button className="modal-close" type="button" onClick={() => setShowCredits(false)} aria-label="Cerrar">×</button>
          <p className="eyebrow">Hecho con cariño</p><h2>Créditos</h2>
          <p><strong>Super Noa</strong> es un juego original inspirado en los plataformas familiares de 8 bits.</p>
          <p>Personaje creado para este proyecto a partir de referencias privadas. Las fotografías originales no forman parte de la web.</p>
          <p>Música de los primeros cinco mundos: <a href="https://opengameart.org/content/platformer-chiptunes" target="_blank" rel="noreferrer">Platformer Chiptunes</a>, de Guy G. Gamerson, publicada bajo licencia CC0. La música del castillo es una composición original sintetizada para Super Noa.</p>
          <p>Los seis monstruos finales y las miniaturas pixel art de los mundos son diseños originales generados para este proyecto. Efectos de sonido generados en el navegador; escenarios jugables, interfaz y código creados para Super Noa.</p>
          <button className="pixel-button primary" type="button" onClick={() => setShowCredits(false)}>Cerrar</button>
        </div></div>
      )}

      {showAlbum && (
        <div className="modal-backdrop"><div className="game-modal album-modal">
          <button className="modal-close" type="button" onClick={() => setShowAlbum(false)} aria-label="Cerrar">×</button>
          <p className="eyebrow">Colección de Noa</p><h2>Álbum de pegatinas</h2>
          <p>{progress.secretUnlocked ? "Hay una pegatina por pantalla y tres insignias en el reino secreto." : "Hay una pegatina escondida en la ruta elevada de cada pantalla."}</p>
          <div className="sticker-grid">
            {albumStickers.map((sticker) => {
              const found = progress.stickers.includes(sticker.id);
              const sprite = getStickerSprite(sticker.id);
              return (
                <article className={`sticker-card ${found ? "is-found" : "is-locked"}`} key={sticker.id}>
                  <span className="sticker-frame" aria-hidden="true">{found && sprite ? <span className="sticker-sprite" style={{ backgroundImage: `url(${sprite.src})`, backgroundPosition: `${sprite.column * 50}% center` }} /> : "?"}</span>
                  <strong>{found ? sticker.name : `Mundo ${sticker.world}`}</strong>
                  <small>{found ? "¡Encontrada!" : sticker.hint}</small>
                </article>
              );
            })}
          </div>
          <p className="album-progress"><PixelIcon kind="sparkle" /> {progress.stickers.filter((id) => albumStickers.some((sticker) => sticker.id === id)).length} de {albumStickers.length}</p>
          <button className="pixel-button primary" type="button" onClick={() => setShowAlbum(false)}>Seguir explorando</button>
        </div></div>
      )}
    </main>
  );
}
