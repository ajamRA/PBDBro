"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type Duck = {
  id: number;
  name: string;
  color: string;
  x: number;
};

const SAMPLE_NAMES = [
  "XRA RIANNA",
  "AQI HUDA",
  "AUSYRAH",
  "TRUMAN",
  "HA AIRA",
  "QANIAH",
  "ALEYA",
  "FARISHA",
  "IMRAN",
  "QILAH",
  "AMIR",
  "AQIL",
  "ZARA",
  "DANIA",
  "HADI",
  "SOFIA",
  "DANISH",
  "AULIA",
  "IRFAN",
  "NURIN",
];

const DUCK_COLORS = [
  "#ffd335",
  "#ff8a33",
  "#43d17a",
  "#55b8ff",
  "#c27bff",
  "#ff6fa1",
  "#ffb53f",
  "#7ed957",
  "#48a3ff",
  "#ff7a59",
];

const formatTime = (ms: number) => {
  const centi = Math.floor(ms / 10) % 100;
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / 60000);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}:${String(centi).padStart(2, "0")}`;
};

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function DuckRacePage() {
  const initialDucks = useMemo(
    () =>
      SAMPLE_NAMES.map((name, idx) => ({
        id: idx + 1,
        name,
        color: DUCK_COLORS[idx % DUCK_COLORS.length],
        x: 0,
      })),
    []
  );

  const [ducks, setDucks] = useState<Duck[]>(initialDucks);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(10000);
  const [winner, setWinner] = useState<string | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const trackHeight = Math.max(760, 170 + ducks.length * 36);

  useEffect(() => {
    if (!running) return;

    tickRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
      setDucks((prev) => {
        let foundWinner: string | null = null;
        const next = prev.map((duck) => {
          if (foundWinner) return duck;
          const step = Math.random() * 2.7;
          const x = Math.min(95, duck.x + step);
          if (x >= 95 && !foundWinner) {
            foundWinner = duck.name;
          }
          return { ...duck, x };
        });

        if (foundWinner) {
          setRunning(false);
          setWinner(foundWinner);
        }

        return next;
      });
    }, 100);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  const handleStart = () => {
    if (!winner) {
      const allAtStart = ducks.every((duck) => duck.x === 0);
      if (allAtStart) setElapsedMs(0);
    }
    setRunning(true);
  };

  const handleClear = () => {
    setRunning(false);
    setWinner(null);
    setElapsedMs(10000);
    setDucks((prev) => prev.map((duck) => ({ ...duck, x: 0 })));
  };

  const handleShuffle = () => {
    setRunning(false);
    setWinner(null);
    setElapsedMs(10000);
    setDucks(shuffle(initialDucks));
  };

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.brand}>Free Duck Race Name Picker</div>
        <div className={styles.user}>g-93558821@moe-dl.edu.my</div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <button className={`${styles.navBtn} ${styles.active}`}>Home</button>
          <button className={styles.navBtn}>Offline Mode</button>
          <button className={styles.navBtn}>Unlock Premium</button>
          <button className={styles.navBtn}>Wheel of Names</button>
          <button className={styles.navBtn}>Settings</button>
          <div className={styles.roomBox}>
            <div className={styles.roomTitle}>1 Jazari</div>
            <div className={styles.roomCount}>{ducks.length} ducks</div>
            <button className={styles.createBtn}>+ Create Room</button>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.roomHeader}>Room: 1 Jazari ({ducks.length} ducks)</div>

          <section className={styles.arena}>
            <div className={styles.controls}>
              <button onClick={handleShuffle}>Shuffle</button>
              <button onClick={handleStart} disabled={running}>Start</button>
              <button onClick={handleClear}>Clear</button>
            </div>

            <div className={styles.timer}>{formatTime(elapsedMs)}</div>

            <div className={styles.track} style={{ height: `${trackHeight}px` }}>
              <div className={styles.grass} />
              <div className={styles.water} />
              <div className={styles.finish} />

              {ducks.map((duck, idx) => (
                <div
                  key={`${duck.id}-${duck.name}`}
                  className={styles.duckRow}
                  style={{ top: `${100 + idx * 36}px` }}
                >
                  <div className={styles.nameTag}>{duck.name}</div>
                  <div
                    className={styles.duck}
                    style={{ transform: `translateX(${duck.x}%)`, backgroundColor: duck.color }}
                  >
                    <span className={styles.eye} />
                    <span className={styles.beak} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {winner ? <div className={styles.winner}>Pemenang: {winner}</div> : null}
        </main>
      </div>
    </div>
  );
}
