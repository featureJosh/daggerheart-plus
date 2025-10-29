const CRIT_SELECTOR = ".chat-message.message.duality.critical";

export const EnhancedChatEffects = {
  init() {
    try {
      const critParticlesEnabled = game.settings.get("daggerheart-plus", "enableCriticalHitParticles");
      const enhancedChatEnabled = game.settings.get("daggerheart-plus", "enableEnhancedChat");
      if (!critParticlesEnabled || !enhancedChatEnabled) {
        this.disable();
        return;
      }

      this._observe();
      this._scan();
    } catch (e) {
      console.warn("DHP | EnhancedChatEffects failed to initialize", e);
    }
  },

  disable() {
    try {
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
      
      document.querySelectorAll(".dhp-crit-particles").forEach((canvas) => {
        const host = canvas.parentElement;
        if (host && host._dhpCritFX) {
          host._dhpCritFX.stop();
        } else {
          host?.classList?.remove?.("dhp-crit-fx");
          canvas.remove();
        }
      });

      document.querySelectorAll(".dhp-crit-fx").forEach((el) => {
        el.classList.remove("dhp-crit-fx");
        delete el._dhpCritMounted;
        delete el._dhpCritFX;
      });
    } catch (e) {
      console.warn("DHP | EnhancedChatEffects failed to disable", e);
    }
  },

  _observe() {
    if (this._observer) return;
    this._observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          if (n.matches?.(CRIT_SELECTOR)) this._mount(n);

          n.querySelectorAll?.(CRIT_SELECTOR).forEach((el) => this._mount(el));
        }
      }
    });
    this._observer.observe(document.body, { childList: true, subtree: true });
  },

  _scan() {
    try {
      document.querySelectorAll(CRIT_SELECTOR).forEach((el) => this._mount(el));
    } catch (_) {}
  },

  _mount(el) {
    try {
      if (!el || el._dhpCritMounted) return;
      
      const critParticlesEnabled = game.settings.get("daggerheart-plus", "enableCriticalHitParticles");
      const enhancedChatEnabled = game.settings.get("daggerheart-plus", "enableEnhancedChat");
      if (!critParticlesEnabled || !enhancedChatEnabled) return;

      el._dhpCritMounted = true;
      el.classList.add("dhp-crit-fx");

      const canvas = document.createElement("canvas");
      canvas.className = "dhp-crit-particles";

      el.appendChild(canvas);

      const fx = this._createParticleEngine(el, canvas);
      el._dhpCritFX = fx;
    } catch (e) {
      console.warn("DHP | Failed to mount critical FX", e);
    }
  },

  /**
   * Generic particle engine used for critical cards and other hosts (e.g., spellcasting tiles).
   * @param {HTMLElement} host
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [opts]
   * @param {string[]} [opts.colors] - Array of colors for particles.
   * @param {number} [opts.areaDivisor] - Lower makes more particles per area.
   * @param {number} [opts.minParticles]
   * @param {number} [opts.maxParticles]
   * @param {number} [opts.repelRadius]
   */
  _createParticleEngine(host, canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const state = {
      running: true,
      particles: [],
      mouse: { x: -1e6, y: -1e6 },
      lastTime: performance.now(),
      dpr: Math.max(1, window.devicePixelRatio || 1),
    };
    const colors = ["#ff7a66", "#ff6a54", "#ff8a6e", "#ffd3c8"];

    function resize() {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      const dpr = (state.dpr = Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const target = Math.min(90, Math.floor((w * h) / 2200));
      if (state.particles.length === 0) {
        for (let i = 0; i < target; i++)
          state.particles.push(seedParticle(w, h));
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
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.05 + Math.random() * 0.06),
        r: 1 + Math.random() * 1.8,
        c: colors[(Math.random() * colors.length) | 0],
        ang: Math.random() * Math.PI * 2,
        omega: (Math.random() - 0.5) * 0.04,
        seed: Math.random() * Math.PI * 2,
        spd: 0.04 + Math.random() * 0.06,
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

      const grad = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
      grad.addColorStop(0, "rgba(255,90,61,0.06)");
      grad.addColorStop(1, "rgba(255,160,61,0.02)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const t = ts * 0.001;
      const mx = (state.mouse.x - r.left) * dpr;
      const my = (state.mouse.y - r.top) * dpr;
      const repelR = 140;
      const repelR2 = repelR * repelR;

      for (const p of state.particles) {
        const flow =
          Math.sin((p.x + t * 30) * 0.02) + Math.cos((p.y - t * 20) * 0.015);
        p.vx += Math.cos(flow) * 0.02;
        p.vy += Math.sin(flow) * 0.015;

        p.ang += p.omega * 0.98;
        p.vx += Math.cos(p.ang) * 0.02;
        p.vy += Math.sin(p.ang) * 0.015;

        p.vy -= p.spd * 0.6;

        if (state.mouse.x !== -1e6) {
          const dx = p.x * dpr - mx;
          const dy = p.y * dpr - my;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < repelR2) {
            const dist = Math.max(12, Math.sqrt(dist2));
            const force = (repelR - dist) / repelR;
            p.vx += (dx / dist) * 0.25 * force;
            p.vy += (dy / dist) * 0.25 * force;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        p.vx *= 0.985;
        p.vy *= 0.985;
        const sp = Math.hypot(p.vx, p.vy);
        const maxSp = 0.9;
        if (sp > maxSp) {
          p.vx = (p.vx / sp) * maxSp;
          p.vy = (p.vy / sp) * maxSp;
        }

        if (p.y < -8) {
          p.y = h + 6;
          p.x = Math.random() * w;
          p.vx = (Math.random() - 0.5) * 0.2;
          p.vy = -(0.05 + Math.random() * 0.06);
          p.ang = Math.random() * Math.PI * 2;
          p.omega = (Math.random() - 0.5) * 0.04;
        }
        if (p.x < -6) p.x = w + 6;
        if (p.x > w + 6) p.x = -6;

        const tw = 0.35 + 0.25 * Math.sin(t * 2 + p.seed);

        ctx.beginPath();
        ctx.fillStyle = p.c;
        ctx.globalAlpha = tw;
        ctx.arc(p.x * dpr, p.y * dpr, p.r * dpr, 0, Math.PI * 2);
        ctx.fill();

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
        host?.classList?.remove?.("dhp-crit-fx");
        delete host._dhpCritMounted;
        delete host._dhpCritFX;
      },
    };
  },
};
