import { useEffect, useRef, useState, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "motion/react";

/* -------------------- formatting -------------------- */
const HUF = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("hu-HU");

/* -------------------- 3D digit globe canvas -------------------- */
/*  Projects a sphere of glyphs to 2D, rotates it, and reacts to the mouse.
    ~1800 points, orthographic-ish projection with a soft z-depth shade. */
function DigitGlobe({ mx, my }: { mx: number; my: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rot = useRef({ x: 0, y: 0, vx: 0.002, vy: 0.004 });

  const points = useMemo(() => {
    const N = 1600;
    const arr: { x: number; y: number; z: number; g: string; s: number }[] = [];
    const glyphs = "0123456789$€₣¥₽₩+-×÷%.,";
    // Fibonacci sphere
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      arr.push({
        x: Math.cos(theta) * r,
        y,
        z: Math.sin(theta) * r,
        g: glyphs[i % glyphs.length],
        s: 0.6 + Math.random() * 0.9,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;
    let raf = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cvs.clientWidth;
      const h = cvs.clientHeight;
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    const draw = () => {
      if (!running) return;
      const w = cvs.clientWidth;
      const h = cvs.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.42;

      // idle drift + mouse influence
      rot.current.y += rot.current.vy + mx * 0.0004;
      rot.current.x += rot.current.vx + -my * 0.0003;

      ctx.clearRect(0, 0, w, h);

      const cosX = Math.cos(rot.current.x);
      const sinX = Math.sin(rot.current.x);
      const cosY = Math.cos(rot.current.y);
      const sinY = Math.sin(rot.current.y);

      // draw glow
      const grd = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.4);
      grd.addColorStop(0, "rgba(52, 211, 153, 0.14)");
      grd.addColorStop(0.5, "rgba(20, 100, 90, 0.05)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // draw core disk
      ctx.fillStyle = "rgba(6, 22, 30, 0.55)";
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.98, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // rotate Y
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        // rotate X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const px = cx + x1 * R;
        const py = cy + y2 * R;

        const depth = (z2 + 1) / 2; // 0 back, 1 front
        const alpha = 0.15 + depth * 0.85;
        const size = 8 + depth * 6;

        // color: emerald front, cooler behind
        const hue = 155 + (1 - depth) * 30;
        const light = 45 + depth * 40;
        ctx.fillStyle = `hsla(${hue}, 75%, ${light}%, ${alpha * p.s})`;
        ctx.font = `${depth > 0.5 ? 600 : 400} ${size.toFixed(1)}px 'JetBrains Mono', ui-monospace, monospace`;
        ctx.fillText(p.g, px, py);
      }

      // scanning ring
      const t = performance.now() / 1000;
      ctx.strokeStyle = `hsla(155, 90%, 65%, 0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R, R * Math.abs(Math.sin(t * 0.6)), 0, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [points, mx, my]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

/* -------------------- particle rain behind everything -------------------- */
function NumberRain() {
  const cvs = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const cols = () => Math.floor(c.clientWidth / 18);
    let drops: number[] = Array.from({ length: cols() }, () => Math.random() * -50);

    const draw = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      ctx.fillStyle = "rgba(8, 15, 24, 0.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "12px 'JetBrains Mono', monospace";
      for (let i = 0; i < drops.length; i++) {
        const ch = String.fromCharCode(0x30 + Math.floor(Math.random() * 10));
        const x = i * 18;
        const y = drops[i] * 18;
        const grad = ctx.createLinearGradient(x, y - 60, x, y);
        grad.addColorStop(0, "rgba(52, 211, 153, 0)");
        grad.addColorStop(1, "rgba(52, 211, 153, 0.55)");
        ctx.fillStyle = grad;
        ctx.fillText(ch, x, y);
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={cvs} className="absolute inset-0 h-full w-full opacity-[0.18]" />;
}

/* -------------------- animated big number -------------------- */
function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const controls = animate(display, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className="tabular-nums">{format(display)}</span>;
}

/* -------------------- live global counter -------------------- */
function LiveMoney({ base, perSecond }: { base: number; perSecond: number }) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setVal(base + ((now - start) / 1000) * perSecond);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base, perSecond]);
  return <>{HUF.format(Math.floor(val))}</>;
}

/* -------------------- Tax Optimizer -------------------- */
function TaxOptimizer() {
  const [revenue, setRevenue] = useState(85_000_000);
  // "before" pays 27% avg, "after" pays 14.2% thanks to structuring
  const before = Math.round(revenue * 0.27);
  const after = Math.round(revenue * 0.142);
  const saved = before - after;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface-elevated/70 p-6 backdrop-blur-xl shadow-elegant">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Élő adó-szimulátor</div>
          <div className="mt-1 font-display text-2xl text-foreground">Húzd. Nézd. Ledöbbenj.</div>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] text-primary">
          v2026.1
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Éves árbevétel</span>
          <span className="font-mono text-foreground">{HUF.format(revenue)}</span>
        </div>
        <input
          type="range"
          min={10_000_000}
          max={500_000_000}
          step={1_000_000}
          value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
          className="mt-2 h-2 w-full cursor-grab appearance-none rounded-full bg-background/70 accent-[color:var(--primary)]"
          style={{
            background: `linear-gradient(90deg, oklch(0.78 0.19 155) 0%, oklch(0.78 0.19 155) ${
              ((revenue - 10_000_000) / (500_000_000 - 10_000_000)) * 100
            }%, oklch(1 0 0 / 0.08) ${
              ((revenue - 10_000_000) / (500_000_000 - 10_000_000)) * 100
            }%, oklch(1 0 0 / 0.08) 100%)`,
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Átlagos könyvelő</div>
          <div className="mt-1 font-mono text-xl text-foreground/80 line-through decoration-destructive/70">
            <AnimatedNumber value={before} format={HUF.format} />
          </div>
          <div className="mt-1 text-[10px] text-destructive">27% effektív adóteher</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-primary/10 p-4">
          <div className="text-[10px] uppercase tracking-widest text-primary">Ledger optimalizációval</div>
          <div className="mt-1 font-mono text-xl text-primary">
            <AnimatedNumber value={after} format={HUF.format} />
          </div>
          <div className="mt-1 text-[10px] text-primary/80">14.2% effektív adóteher</div>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-primary/30 blur-2xl" />
        </div>
      </div>

      <motion.div
        key={saved}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-5 flex items-center justify-between rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">Megtakarítás egy évben</div>
        <div className="font-mono text-2xl font-semibold text-accent">
          + <AnimatedNumber value={saved} format={HUF.format} />
        </div>
      </motion.div>
    </div>
  );
}

/* -------------------- ticker items -------------------- */
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
  { s: "EUR/HUF", v: "398.42", up: false },
  { s: "USD/HUF", v: "362.11", up: true },
  { s: "BUX", v: "78 214", up: true },
];

/* -------------------- Hero -------------------- */
export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 20 });
  const my = useSpring(myRaw, { stiffness: 60, damping: 20 });
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      mxRaw.set(nx);
      myRaw.set(ny);
      setPointer({ x: nx, y: ny });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mxRaw, myRaw]);

  const globeTiltX = useTransform(my, [-1, 1], [8, -8]);
  const globeTiltY = useTransform(mx, [-1, 1], [-10, 10]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-hero"
    >
      {/* background layers */}
      <NumberRain />
      <div className="pointer-events-none absolute inset-0 grid-bg mask-fade opacity-40" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[620px] w-[620px] rounded-full bg-accent/20 blur-[160px]" />
      {/* cursor bloom */}
      <motion.div
        className="pointer-events-none absolute h-[380px] w-[380px] rounded-full bg-primary/15 blur-[100px]"
        style={{
          left: `calc(50% + ${pointer.x * 40}vw)`,
          top: `calc(50% + ${pointer.y * 30}vh)`,
          x: "-50%",
          y: "-50%",
        }}
      />

      {/* NAV */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-gradient text-primary-foreground shadow-glow">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M4 20V8l8-4 8 4v12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 20v-6h6v6" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display text-2xl tracking-tight">
            Ledger<span className="text-primary">.</span>
          </span>
        </div>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a className="transition-colors hover:text-foreground" href="#">Szolgáltatások</a>
          <a className="transition-colors hover:text-foreground" href="#">Módszer</a>
          <a className="transition-colors hover:text-foreground" href="#">Ügyfelek</a>
          <a className="transition-colors hover:text-foreground" href="#">Rólunk</a>
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden text-sm text-muted-foreground hover:text-foreground md:block">Belépés</button>
          <button className="rounded-full bg-emerald-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]">
            Ingyenes konzultáció
          </button>
        </div>
      </nav>

      {/* HERO GRID */}
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pt-6 pb-32 lg:grid-cols-12 lg:pt-10">
        {/* LEFT */}
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-3 py-1.5 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              487 vállalkozás pénzügye fut most a Ledgeren
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-tight text-gradient"
          >
            Ez nem
            <br />
            könyvelés.
            <br />
            <span className="italic text-gradient-emerald">Ez pénzügyi</span>
            <br />
            <span className="italic text-gradient-emerald">szuperképesség.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground"
          >
            Egy csapat, ami a szabályok mögé lát. Élő NAV-szinkron, AI-alapú
            adóoptimalizálás és egy dashboard, ami valóban megmutatja, mennyi
            pénzt hagysz az asztalon — <span className="text-foreground">mielőtt otthagyod.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="mt-8 rounded-2xl border border-border/60 bg-surface/50 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
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
        </div>

        {/* RIGHT: globe + optimizer */}
        <div className="relative lg:col-span-6">
          <motion.div
            style={{ rotateX: globeTiltX, rotateY: globeTiltY, transformPerspective: 1400 }}
            className="relative mx-auto aspect-square w-full max-w-[520px]"
          >
            <DigitGlobe mx={pointer.x} my={pointer.y} />

            {/* orbit labels */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute inset-6 rounded-full border border-primary/20"
            >
              {["NAV", "ÁFA", "SZJA", "TAO", "KATA", "TB"].map((t, i) => {
                const angle = (i / 6) * Math.PI * 2;
                const r = 48;
                return (
                  <span
                    key={t}
                    style={{
                      left: `calc(50% + ${Math.cos(angle) * r}% - 20px)`,
                      top: `calc(50% + ${Math.sin(angle) * r}% - 10px)`,
                    }}
                    className="absolute rounded-full border border-primary/30 bg-background/70 px-2 py-0.5 font-mono text-[10px] text-primary backdrop-blur"
                  >
                    {t}
                  </span>
                );
              })}
            </motion.div>

            {/* center HUD */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="rounded-2xl border border-border/50 bg-background/40 px-4 py-2 text-center backdrop-blur-md">
                <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Realtime engine</div>
                <div className="font-mono text-sm text-primary">Ledger&nbsp;OS</div>
              </div>
            </div>
          </motion.div>

          {/* Interactive tax optimizer */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6"
          >
            <TaxOptimizer />
          </motion.div>
        </div>
      </div>

      {/* stats row */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-10">
        <div className="grid grid-cols-2 gap-6 border-t border-border/60 pt-6 md:grid-cols-4">
          {[
            { k: "487+", l: "aktív ügyfél" },
            { k: "99.2%", l: "elégedettség" },
            { k: "842M Ft", l: "megspórolt adó 2025-ben" },
            { k: "< 4 perc", l: "átlagos válaszidő" },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-mono text-2xl font-medium text-foreground sm:text-3xl">{s.k}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TICKER */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-y border-border/60 bg-background/70 backdrop-blur-md">
        <div className="flex overflow-hidden py-3">
          <div className="flex min-w-max animate-ticker gap-10 pr-10">
            {[...TICKER, ...TICKER].map((t, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-muted-foreground">{t.s}</span>
                <span className={t.up ? "text-primary" : "text-accent"}>{t.v}</span>
                <span className={t.up ? "text-primary" : "text-accent/70"}>{t.up ? "▲" : "▼"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
{/* NUM re-export to avoid unused import lint if tree-shaken */}
export const _fmt = NUM;
