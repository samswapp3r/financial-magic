import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate, type MotionValue } from "motion/react";

/* -------------------- Utilities -------------------- */
const HUF = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("hu-HU");

function useCountUp(target: number, duration = 2.4, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(decimals ? Number(v.toFixed(decimals)) : Math.floor(v)),
    });
    return () => controls.stop();
  }, [target, duration, decimals]);
  return value;
}

/* -------------------- Live ticking counter (never stops) -------------------- */
function LiveMoney({ base, perSecond }: { base: number; perSecond: number }) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      setVal(base + elapsed * perSecond);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base, perSecond]);
  return <>{HUF.format(Math.floor(val))}</>;
}

/* -------------------- Rolling digit column -------------------- */
function Digit({ d }: { d: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline tabular-nums">
      <motion.span
        className="absolute inset-x-0 flex flex-col items-center"
        animate={{ y: `-${d * 10}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="block h-[1em] leading-none">
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function RollingNumber({ value }: { value: number }) {
  const str = NUM.format(Math.max(0, Math.floor(value)));
  return (
    <span className="inline-flex leading-none">
      {str.split("").map((ch, i) =>
        /\d/.test(ch) ? <Digit key={i} d={Number(ch)} /> : <span key={i} className="inline-block px-[0.02em]">{ch}</span>,
      )}
    </span>
  );
}

/* -------------------- Mini sparkline -------------------- */
function Sparkline({ points, color = "var(--color-primary)" }: { points: number[]; color?: string }) {
  const w = 120;
  const h = 36;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#spark)" />
    </svg>
  );
}

/* -------------------- Floating card with parallax -------------------- */
function FloatingCard({
  x,
  y,
  depth = 20,
  className = "",
  children,
  delay = 0,
  mouse,
}: {
  x: number;
  y: number;
  depth?: number;
  className?: string;
  children: React.ReactNode;
  delay?: number;
  mouse: { mx: ReturnType<typeof useMotionValue>; my: ReturnType<typeof useMotionValue> };
}) {
  const tx = useTransform(mouse.mx, (v) => v * depth);
  const ty = useTransform(mouse.my, (v) => v * depth);
  const sx = useSpring(tx, { stiffness: 60, damping: 15 });
  const sy = useSpring(ty, { stiffness: 60, damping: 15 });
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ left: `${x}%`, top: `${y}%`, x: sx, y: sy }}
      className={`absolute ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* -------------------- Ticker items -------------------- */
const TICKER = [
  { s: "TAX-24", v: "–18.4%", up: true },
  { s: "ÁFA", v: "27.0%", up: false },
  { s: "SZJA", v: "15.0%", up: false },
  { s: "KATA", v: "50 000 Ft", up: true },
  { s: "TB", v: "18.5%", up: false },
  { s: "TAO", v: "9.0%", up: true },
  { s: "KIVA", v: "10.0%", up: true },
  { s: "LEDGER", v: "+2 341 db", up: true },
  { s: "NAV-SYNC", v: "LIVE", up: true },
];

/* -------------------- Main Hero -------------------- */
export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
      my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  const savedTax = useCountUp(842_650_000, 2.8);
  const clients = useCountUp(487, 2.0);
  const satisfaction = useCountUp(99.2, 2.4, 1);

  // Animated sparkline that mutates over time
  const [spark, setSpark] = useState<number[]>(() =>
    Array.from({ length: 24 }, (_, i) => 40 + Math.sin(i / 2) * 15 + Math.random() * 10),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setSpark((prev) => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1];
        next.push(Math.max(20, Math.min(95, last + (Math.random() - 0.45) * 12)));
        return next;
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const [liveNumber, setLiveNumber] = useState(1_248_301);
  useEffect(() => {
    const id = setInterval(() => setLiveNumber((n) => n + Math.floor(Math.random() * 4200) + 300), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-hero"
    >
      {/* Grid + mask */}
      <div className="pointer-events-none absolute inset-0 grid-bg mask-fade opacity-70" />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[560px] w-[560px] rounded-full bg-accent/20 blur-[160px]" />

      {/* NAV */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-gradient text-primary-foreground shadow-glow">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M4 20V8l8-4 8 4v12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 20v-6h6v6" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display text-2xl tracking-tight">Ledger<span className="text-primary">.</span></span>
        </div>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a className="hover:text-foreground transition-colors" href="#">Szolgáltatások</a>
          <a className="hover:text-foreground transition-colors" href="#">Módszer</a>
          <a className="hover:text-foreground transition-colors" href="#">Ügyfelek</a>
          <a className="hover:text-foreground transition-colors" href="#">Rólunk</a>
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden text-sm text-muted-foreground hover:text-foreground md:block">Belépés</button>
          <button className="rounded-full bg-emerald-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]">
            Ingyenes konzultáció
          </button>
        </div>
      </nav>

      {/* HERO GRID */}
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pt-10 pb-32 lg:grid-cols-12 lg:pt-16">
        {/* LEFT: copy */}
        <div className="lg:col-span-6 xl:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-3 py-1.5 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              NAV-szinkron aktív · valós idejű könyvelés
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 font-display text-[clamp(2.8rem,6.4vw,5.6rem)] leading-[0.98] tracking-tight text-gradient"
          >
            A számok, amiket
            <br />
            <span className="italic text-gradient-emerald">valóban látni</span> akarsz.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            A Ledger prémium könyvelő iroda vállalkozóknak, akik nem kimutatásokat, hanem
            <span className="text-foreground"> tisztánlátást</span> keresnek. Élő pénzügyi dashboard,
            adóoptimalizálás és teljes automatizáció — egy csapatban.
          </motion.p>

          {/* Live ticker line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-8 rounded-2xl border border-border/60 bg-surface/50 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Ügyfeleink összesített bevétele ma
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">LIVE · HUF</span>
            </div>
            <div className="mt-2 font-mono text-3xl font-medium text-gradient-emerald sm:text-4xl">
              <LiveMoney base={4_192_874_500} perSecond={3421} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <button className="group relative overflow-hidden rounded-full bg-emerald-gradient px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]">
              <span className="relative z-10">Kérj kalkulációt</span>
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-foreground/90 hover:text-foreground">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-border">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              Nézd meg 90 másodpercben
            </button>
          </motion.div>

          {/* stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.7 }}
            className="mt-12 grid grid-cols-3 gap-6 border-t border-border/60 pt-6"
          >
            <div>
              <div className="font-mono text-2xl font-medium text-foreground sm:text-3xl">
                {NUM.format(clients)}+
              </div>
              <div className="mt-1 text-xs text-muted-foreground">aktív ügyfél</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-medium text-foreground sm:text-3xl">
                {satisfaction.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">elégedettségi ráta</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-medium text-primary sm:text-3xl">
                {HUF.format(savedTax)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">adó megspórolva 2025-ben</div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT: interactive dashboard mock */}
        <div className="relative lg:col-span-6 xl:col-span-6">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[560px] sm:aspect-[5/6]">
            {/* Central big card */}
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 12 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                rotateY: useTransform(mx, [-1, 1], [-6, 6]),
                rotateX: useTransform(my, [-1, 1], [4, -4]),
                transformPerspective: 1200,
              }}
              className="absolute inset-x-6 top-8 rounded-3xl border border-border/70 bg-surface-elevated/90 p-6 shadow-elegant backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Q3 · Cash flow</div>
                  <div className="mt-1 font-display text-3xl text-foreground">
                    <RollingNumber value={liveNumber} /> <span className="text-lg text-muted-foreground">Ft</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M7 14l5-5 5 5H7z" /></svg>
                  +12.4%
                </div>
              </div>
              <div className="mt-4">
                <Sparkline points={spark} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { l: "Bevétel", v: "84.2M", c: "text-primary" },
                  { l: "Kiadás", v: "31.7M", c: "text-foreground" },
                  { l: "Adó", v: "9.8M", c: "text-accent" },
                ].map((k) => (
                  <div key={k.l} className="rounded-xl border border-border/60 bg-background/40 py-2.5">
                    <div className={`font-mono text-base ${k.c}`}>{k.v}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.l}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Floating cards */}
            <FloatingCard mouse={{ mx, my }} x={-8} y={2} depth={-30} delay={0.4}>
              <div className="w-[210px] rounded-2xl border border-border/70 bg-surface-elevated/90 p-4 shadow-card backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/20 text-primary">✓</span>
                  NAV feladva
                </div>
                <div className="mt-2 font-mono text-lg text-foreground">21A 2025/09</div>
                <div className="mt-1 text-xs text-primary">Elfogadva · 00:04</div>
              </div>
            </FloatingCard>

            <FloatingCard mouse={{ mx, my }} x={68} y={-2} depth={35} delay={0.55}>
              <div className="w-[200px] rounded-2xl border border-accent/40 bg-surface-elevated/90 p-4 shadow-card backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-widest text-accent">Adómegtakarítás</div>
                <div className="mt-1 font-display text-3xl text-gradient">
                  <RollingNumber value={4_284_000} />
                </div>
                <div className="text-xs text-muted-foreground">Ft · Q3 optimalizálás</div>
              </div>
            </FloatingCard>

            <FloatingCard mouse={{ mx, my }} x={-2} y={70} depth={25} delay={0.7}>
              <div className="w-[230px] rounded-2xl border border-border/70 bg-surface-elevated/90 p-4 shadow-card backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Számla feldolgozva</div>
                  <span className="animate-pulse-glow rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">AI</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <div className="font-mono text-2xl text-foreground"><RollingNumber value={12_847} /></div>
                  <div className="text-xs text-muted-foreground">db / hó</div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "87%" }}
                    transition={{ duration: 2, delay: 1 }}
                    className="h-full bg-emerald-gradient"
                  />
                </div>
              </div>
            </FloatingCard>

            <FloatingCard mouse={{ mx, my }} x={62} y={68} depth={-25} delay={0.85}>
              <div className="w-[200px] rounded-2xl border border-border/70 bg-surface-elevated/90 p-4 shadow-card backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Payroll · október</div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="font-mono text-2xl text-foreground">42</div>
                  <div className="text-[10px] text-primary">100% pontos</div>
                </div>
                <div className="mt-3 flex gap-1">
                  {[0.6, 0.9, 0.4, 0.75, 1, 0.55, 0.8].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: h }}
                      transition={{ duration: 0.8, delay: 1 + i * 0.06 }}
                      style={{ transformOrigin: "bottom" }}
                      className="h-8 flex-1 rounded-sm bg-emerald-gradient"
                    />
                  ))}
                </div>
              </div>
            </FloatingCard>
          </div>
        </div>
      </div>

      {/* TICKER BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-y border-border/60 bg-background/60 backdrop-blur-md">
        <div className="flex overflow-hidden py-3">
          <div className="flex min-w-max animate-ticker gap-10 pr-10">
            {[...TICKER, ...TICKER].map((t, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-muted-foreground">{t.s}</span>
                <span className={t.up ? "text-primary" : "text-accent"}>{t.v}</span>
                <span className={`inline-block ${t.up ? "text-primary" : "text-accent/70"}`}>
                  {t.up ? "▲" : "▼"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
