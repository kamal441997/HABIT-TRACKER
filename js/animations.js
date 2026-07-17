// ============================================================
// ✨ HABIT TRACKER v2 — ANIMATIONS ENGINE
// ============================================================
// Confetti, particles, animated counters, ripples, and more.
// ============================================================

const Animations = (() => {
  let particleCanvas = null;
  let particleCtx = null;
  let particles = [];
  let particleAnimId = null;

  // ─── PARTICLE BACKGROUND ───

  function initParticles(canvasId = 'particleCanvas') {
    particleCanvas = document.getElementById(canvasId);
    if (!particleCanvas) return;

    particleCtx = particleCanvas.getContext('2d');
    resizeParticleCanvas();
    window.addEventListener('resize', resizeParticleCanvas);

    // Create particles
    particles = [];
    const count = Math.min(60, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        color: ['#6c5ce7', '#a29bfe', '#00b894', '#fdcb6e', '#74b9ff'][
          Math.floor(Math.random() * 5)
        ],
      });
    }

    animateParticles();
  }

  function resizeParticleCanvas() {
    if (!particleCanvas) return;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }

  function animateParticles() {
    if (!particleCtx || !particleCanvas) return;

    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = particleCanvas.width;
      if (p.x > particleCanvas.width) p.x = 0;
      if (p.y < 0) p.y = particleCanvas.height;
      if (p.y > particleCanvas.height) p.y = 0;

      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      particleCtx.fillStyle = p.color;
      particleCtx.globalAlpha = p.opacity;
      particleCtx.fill();
    });

    // Draw connections
    particleCtx.globalAlpha = 0.05;
    particleCtx.strokeStyle = '#6c5ce7';
    particleCtx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          particleCtx.beginPath();
          particleCtx.moveTo(particles[i].x, particles[i].y);
          particleCtx.lineTo(particles[j].x, particles[j].y);
          particleCtx.stroke();
        }
      }
    }

    particleCtx.globalAlpha = 1;
    particleAnimId = requestAnimationFrame(animateParticles);
  }

  function destroyParticles() {
    if (particleAnimId) cancelAnimationFrame(particleAnimId);
    particles = [];
  }

  // ─── CURSOR TRAIL ───

  function initCursorTrail() {
    const trailCanvas = document.createElement('canvas');
    trailCanvas.id = 'cursorTrail';
    trailCanvas.style.position = 'fixed';
    trailCanvas.style.top = '0';
    trailCanvas.style.left = '0';
    trailCanvas.style.width = '100%';
    trailCanvas.style.height = '100%';
    trailCanvas.style.pointerEvents = 'none';
    trailCanvas.style.zIndex = '9999';
    document.body.appendChild(trailCanvas);

    const ctx = trailCanvas.getContext('2d');
    let points = [];

    function resize() {
      trailCanvas.width = window.innerWidth;
      trailCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('mousemove', (e) => {
      points.push({ x: e.clientX, y: e.clientY, age: 0 });
    });

    function drawTrail() {
      ctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.age += 1;
        
        if (p.age > 20) {
          points.splice(i, 1);
          i--;
          continue;
        }

        const size = (20 - p.age) * 0.5;
        const opacity = 1 - (p.age / 20);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 127, ${opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f0ff';
        ctx.fill();
      }
      
      requestAnimationFrame(drawTrail);
    }
    drawTrail();
  }

  // ─── CONFETTI EXPLOSION ───

  function confetti(options = {}) {
    const {
      count = 150,
      duration = 3000,
      spread = 360,
      origin = { x: 0.5, y: 0.4 },
    } = options;

    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000;overflow:hidden;';
    document.body.appendChild(container);

    const colors = ['#6c5ce7', '#a29bfe', '#00b894', '#fdcb6e', '#ff6b35', '#fd79a8', '#74b9ff', '#ffd700'];
    const shapes = ['circle', 'square', 'triangle'];

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const size = Math.random() * 10 + 5;
      const angle = (Math.random() * spread * Math.PI) / 180;
      const velocity = Math.random() * 600 + 200;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 400;
      const rotation = Math.random() * 360;
      const rotSpeed = (Math.random() - 0.5) * 720;

      piece.style.cssText = `
        position:absolute;
        left:${origin.x * 100}%;
        top:${origin.y * 100}%;
        width:${size}px;
        height:${size}px;
        background:${color};
        opacity:1;
        pointer-events:none;
        ${shape === 'circle' ? 'border-radius:50%;' : ''}
        ${shape === 'triangle' ? `clip-path:polygon(50% 0%,0% 100%,100% 100%);` : ''}
      `;

      container.appendChild(piece);

      // Animate
      const startTime = performance.now();
      const animate = (now) => {
        const elapsed = (now - startTime) / 1000;
        const progress = elapsed / (duration / 1000);

        if (progress >= 1) {
          piece.remove();
          return;
        }

        const x = vx * elapsed;
        const y = vy * elapsed + 0.5 * 800 * elapsed * elapsed;
        const rot = rotation + rotSpeed * elapsed;
        const opacity = 1 - Math.pow(progress, 2);

        piece.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        piece.style.opacity = opacity;

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }

    setTimeout(() => container.remove(), duration + 100);
  }

  // ─── ANIMATED COUNTER ───

  function animateCounter(element, target, duration = 1500, prefix = '', suffix = '') {
    const start = 0;
    const startTime = performance.now();

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const current = Math.round(start + (target - start) * easedProgress);

      element.textContent = prefix + current + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ─── PROGRESS RING ANIMATION ───

  function animateProgressRing(svgCircle, percentage, duration = 1200) {
    const circumference = parseFloat(svgCircle.getAttribute('stroke-dasharray'));
    const targetOffset = circumference - (percentage / 100) * circumference;

    svgCircle.style.strokeDashoffset = circumference;

    const startTime = performance.now();
    const startOffset = circumference;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentOffset = startOffset + (targetOffset - startOffset) * easedProgress;

      svgCircle.style.strokeDashoffset = currentOffset;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  // ─── RIPPLE EFFECT ───

  function createRipple(event, element) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      width:${size}px;
      height:${size}px;
      left:${x}px;
      top:${y}px;
    `;

    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // ─── TOAST NOTIFICATION ───

  function showToast(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      reward: '🏆',
      badge: '🏅',
      streak: '🔥',
      info: 'ℹ️',
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '📢'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-visible');
    });

    // Auto-remove
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  // ─── CARD 3D TILT ───

  function initTiltEffects() {
    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.transition = 'transform 0.1s ease';

        // Glow effect
        const glowX = (x / rect.width) * 100;
        const glowY = (y / rect.height) * 100;
        card.style.setProperty('--glow-x', `${glowX}%`);
        card.style.setProperty('--glow-y', `${glowY}%`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.5s ease';
      });
    });
  }

  // ─── STAGGERED ENTRANCE ───

  function staggerEntrance(selector, delay = 80) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = `opacity 0.5s ease ${i * delay}ms, transform 0.5s ease ${i * delay}ms`;

      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }

  // ─── BADGE UNLOCK ANIMATION ───

  function badgeUnlock(badgeElement) {
    badgeElement.classList.add('badge-unlocking');

    // Flash
    const flash = document.createElement('div');
    flash.className = 'badge-flash';
    badgeElement.appendChild(flash);

    setTimeout(() => {
      flash.remove();
      badgeElement.classList.remove('badge-unlocking');
      badgeElement.classList.add('badge-earned');
    }, 1000);
  }

  // ─── CELEBRATION (full-screen) ───

  function celebrate(message, subtext = '') {
    confetti({ count: 250, duration: 4000 });

    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <h2 class="celebration-title">${message}</h2>
        ${subtext ? `<p class="celebration-subtitle">${subtext}</p>` : ''}
        <button class="btn btn-accent celebration-btn" onclick="this.closest('.celebration-overlay').remove()">
          Awesome! 🚀
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('celebration-visible'));

    // Auto-dismiss after 8s
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.classList.remove('celebration-visible');
        setTimeout(() => overlay.remove(), 500);
      }
    }, 8000);
  }

  // ─── SKELETON LOADING ───

  function showSkeleton(container, count = 3) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      skeleton.innerHTML = `
        <div class="skeleton-line skeleton-line-short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line-medium"></div>
      `;
      container.appendChild(skeleton);
    }
  }

  function removeSkeleton(container) {
    container.querySelectorAll('.skeleton-card').forEach((s) => s.remove());
  }

  // ─── SHAKE EFFECT ───

  function shake(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 600);
  }

  // ─── GLOW PULSE ───

  function glowPulse(element, color = '#6c5ce7') {
    element.style.boxShadow = `0 0 0 0 ${color}66`;
    element.animate(
      [
        { boxShadow: `0 0 0 0 ${color}66` },
        { boxShadow: `0 0 0 20px ${color}00` },
      ],
      { duration: 800, easing: 'ease-out' }
    );
  }

  // ─── Public API ───

  return {
    initParticles,
    destroyParticles,
    initCursorTrail,
    confetti,
    animateCounter,
    animateProgressRing,
    createRipple,
    showToast,
    initTiltEffects,
    staggerEntrance,
    badgeUnlock,
    celebrate,
    showSkeleton,
    removeSkeleton,
    shake,
    glowPulse,
  };
})();
