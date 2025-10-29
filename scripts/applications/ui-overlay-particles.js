export const UIOverlayParticles = {
  /**
   * Mount particles onto any host element (e.g., spellcasting attribute tile).
   * Colors can be derived from CSS variables if not provided.
   */
  mount(
    host,
    {
      className = "dhp-spell-particles",
      colors,
      minParticles = 18,
      maxParticles = 45,
      areaDivisor = 1400,
      repelRadius = 110,
      shape = "star",
    } = {}
  ) {
    try {
      if (!host || host._dhpParticlesMounted) return;
      host._dhpParticlesMounted = true;
      const canvas = document.createElement("canvas");
      canvas.className = className;
      host.appendChild(canvas);

      // If not provided, pull colors from CSS custom properties
      let palette = colors;
      try {
        if (!palette || !palette.length) {
          const cs = getComputedStyle(host);
          const c1 = cs.getPropertyValue("--sc-glow").trim();
          const c2 = cs.getPropertyValue("--sc-accent").trim();
          const c3 = cs.getPropertyValue("--sc-core").trim();
          palette = [c1, c2, c3].filter(Boolean);
        }
      } catch (_) {}

      const fx = this._createEngine(host, canvas, {
        colors: palette,
        minParticles,
        maxParticles,
        areaDivisor,
        repelRadius,
        shape,
      });
      host._dhpParticlesFX = fx;
      return fx;
    } catch (e) {
      console.warn("DHP | UIOverlayParticles.mount failed", e);
    }
  },

  unmount(host) {
    try {
      host?._dhpParticlesFX?.stop?.();
    } catch (_) {}
    try {
      host._dhpParticlesMounted = false;
      delete host._dhpParticlesFX;
    } catch (_) {}
  },

  /**
   * Generic particle engine.
   * @param {HTMLElement} host
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [opts]
   * @param {string[]} [opts.colors]
   * @param {number} [opts.areaDivisor]
   * @param {number} [opts.minParticles]
   * @param {number} [opts.maxParticles]
   * @param {number} [opts.repelRadius]
   */
  _createEngine(host, canvas, opts = {}) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const state = {
      running: true,
      particles: [],
      mouse: { x: -1e6, y: -1e6 },
      lastTime: performance.now(),
      dpr: Math.max(1, window.devicePixelRatio || 1),
    };

    const defaultColors = ["#8fd6ff", "#57b2ff", "#c8ecff"]; // tuned for spell FX
    const colors = Array.isArray(opts.colors) && opts.colors.length
      ? opts.colors
      : defaultColors;

    function resize() {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      const dpr = (state.dpr = Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const areaDivisor = Math.max(200, Number(opts.areaDivisor) || 1400);
      let target = Math.floor((w * h) / areaDivisor);
      const minP = Math.max(0, Number(opts.minParticles) || 18);
      const maxP = Math.max(minP || 0, Number(opts.maxParticles) || 55);
      target = Math.max(minP, Math.min(maxP, target));
      if (state.particles.length === 0) {
        for (let i = 0; i < target; i++) state.particles.push(seedParticle(w, h));
      } else if (target > state.particles.length) {
        for (let i = state.particles.length; i < target; i++)
          state.particles.push(seedParticle(w, h));
      } else if (target < state.particles.length) {
        state.particles.length = target;
      }
    }

    function seedParticle(w, h) {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -(0.02 + Math.random() * 0.03),
        r: 1 + Math.random() * 1.8,
        c: colors[(Math.random() * colors.length) | 0],
        ang: Math.random() * Math.PI * 2,
        omega: (Math.random() - 0.5) * 0.015,
        seed: Math.random() * Math.PI * 2,
        spd: 0.015 + Math.random() * 0.03,
        pts: 5 + ((Math.random() * 2) | 0),
        inner: 0.45 + Math.random() * 0.15,
      };
    }

    function step(ts) {
      if (!host.isConnected) return (state.running = false);
      if (!state.running) return;
      const r = host.getBoundingClientRect();
      const w = r.width;
      const h = r.height;

      const dpr = state.dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cs = getComputedStyle(host);
      const glow = cs.getPropertyValue("--sc-glow").trim() || "rgba(120,180,255,0.18)";
      const core = cs.getPropertyValue("--sc-core").trim() || "rgba(180,220,255,0.08)";
      const grad = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
      try {
        grad.addColorStop(0, `${glow}0F`.replace(/\s+/g, ""));
        grad.addColorStop(1, `${core}08`.replace(/\s+/g, ""));
      } catch (_) {
        grad.addColorStop(0, "rgba(120,180,255,0.06)");
        grad.addColorStop(1, "rgba(180,220,255,0.03)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const t = ts * 0.001;
      const mx = (state.mouse.x - r.left) * dpr;
      const my = (state.mouse.y - r.top) * dpr;
      const repelR = Number(opts.repelRadius) || 110;
      const repelR2 = repelR * repelR;

      const shape = String(opts.shape || "star").toLowerCase();

      function drawStar(cx, cy, outer, inner, points, rot) {
        const step = Math.PI / points;
        let a = rot;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        for (let i = 0; i < points; i++) {
          a += step;
          ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
          a += step;
          ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        }
        ctx.closePath();
        ctx.fill();
      }

      for (const p of state.particles) {
        const flow = Math.sin((p.x + t * 12) * 0.011) + Math.cos((p.y - t * 8) * 0.009);
        p.vx += Math.cos(flow) * 0.004;
        p.vy += Math.sin(flow) * 0.003;

        p.ang += p.omega * 0.94;
        p.vx += Math.cos(p.ang) * 0.004;
        p.vy += Math.sin(p.ang) * 0.003;

        p.vy -= p.spd * 0.2;

        if (state.mouse.x !== -1e6) {
          const dx = p.x * dpr - mx;
          const dy = p.y * dpr - my;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < repelR2) {
            const dist = Math.max(12, Math.sqrt(dist2));
            const force = (repelR - dist) / repelR;
            p.vx += (dx / dist) * 0.16 * force;
            p.vy += (dy / dist) * 0.16 * force;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        p.vx *= 0.978;
        p.vy *= 0.978;
        const sp = Math.hypot(p.vx, p.vy);
        const maxSp = 0.32;
        if (sp > maxSp) {
          p.vx = (p.vx / sp) * maxSp;
          p.vy = (p.vy / sp) * maxSp;
        }

        if (p.y < -8) {
          p.y = h + 6;
          p.x = Math.random() * w;
          p.vx = (Math.random() - 0.5) * 0.08;
          p.vy = -(0.02 + Math.random() * 0.03);
          p.ang = Math.random() * Math.PI * 2;
          p.omega = (Math.random() - 0.5) * 0.015;
        }
        if (p.x < -6) p.x = w + 6;
        if (p.x > w + 6) p.x = -6;

        const tw = 0.35 + 0.25 * Math.sin(t * 2 + p.seed);

        ctx.fillStyle = p.c;
        ctx.globalAlpha = tw;
        const cx = p.x * dpr;
        const cy = p.y * dpr;
        if (shape === "star") {
          const outer = p.r * dpr;
          const inner = outer * (p.inner || 0.55);
          const pts = Math.max(4, Math.min(8, p.pts || 5));
          drawStar(cx, cy, outer, inner, pts, p.ang + p.seed);
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, p.r * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.globalAlpha = tw * 0.35;
        ctx.fillStyle = p.c;
        ctx.arc(p.x * dpr, p.y * dpr, p.r * 3 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      requestAnimationFrame(step);
    }

    function onMove(ev) {
      state.mouse.x = ev.clientX;
      state.mouse.y = ev.clientY;
    }
    function onLeave() {
      state.mouse.x = -1e6;
      state.mouse.y = -1e6;
    }

    const ro = new ResizeObserver(() => requestAnimationFrame(resize));
    ro.observe(host);
    resize();
    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
    requestAnimationFrame(step);

    return {
      stop() {
        try {
          ro.disconnect();
        } catch {}
        host.removeEventListener("mousemove", onMove);
        host.removeEventListener("mouseleave", onLeave);
        state.running = false;
        try {
          canvas.remove();
        } catch {}
        host._dhpParticlesMounted = false;
        delete host._dhpParticlesFX;
      },
    };
  },
};
