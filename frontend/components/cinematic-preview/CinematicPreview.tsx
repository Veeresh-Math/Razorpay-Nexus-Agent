'use client';

import Link from 'next/link';
import {
  MotionConfig,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import styles from './cinematic-preview.module.css';

type ScenarioId = 'steady' | 'congested' | 'outage';
type GatewayId = 'atlas' | 'orbit' | 'pulse';
type BreakerState = 'closed' | 'open' | 'halfOpen';

type Gateway = {
  id: GatewayId;
  name: string;
  latency: number;
  success: number;
  load: number;
  tone: 'teal' | 'violet' | 'amber';
};

type Scenario = {
  id: ScenarioId;
  label: string;
  description: string;
  gateways: Gateway[];
};

type RouteConfig = {
  label: string;
  path: string;
  fallbackPath: string;
  packet: Array<{ x: number; y: number }>;
  node: { x: number; y: number };
};

type LastSimulationResult = {
  gateway: string;
  latency: number;
};

const headlineVariants = {
  hidden: { opacity: 0, y: 34, filter: 'blur(10px)' },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      delay: 0.16 + index * 0.13,
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const revealVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const journeyActs = [
  {
    number: '01',
    title: 'Capture intent',
    body: 'A checkout intent arrives with amount, currency, risk context, and merchant preferences.',
    signal: 'Source event',
  },
  {
    number: '02',
    title: 'Score the path',
    body: 'Mock routing signals compare latency, availability, cost, and compliance fit across gateways.',
    signal: 'Decision graph',
  },
  {
    number: '03',
    title: 'Authorize safely',
    body: 'The selected path is visualized as a controlled authorization with human approval guardrails.',
    signal: 'Approval gate',
  },
  {
    number: '04',
    title: 'Learn and settle',
    body: 'Outcome signals feed the next decision while reconciliation stays visible to finance teams.',
    signal: 'Feedback loop',
  },
] as const;

const scenarioCatalog: Record<ScenarioId, Scenario> = {
  steady: {
    id: 'steady',
    label: 'Steady demand',
    description: 'Normal traffic with healthy gateway headroom.',
    gateways: [
      { id: 'atlas', name: 'Atlas Primary', latency: 118, success: 99.4, load: 42, tone: 'teal' },
      { id: 'orbit', name: 'Orbit Backup', latency: 146, success: 98.9, load: 37, tone: 'violet' },
      { id: 'pulse', name: 'Pulse Recovery', latency: 174, success: 98.2, load: 29, tone: 'amber' },
    ],
  },
  congested: {
    id: 'congested',
    label: 'Congested corridor',
    description: 'Latency rises on the primary route and backup capacity becomes valuable.',
    gateways: [
      { id: 'atlas', name: 'Atlas Primary', latency: 342, success: 96.8, load: 88, tone: 'teal' },
      { id: 'orbit', name: 'Orbit Backup', latency: 161, success: 99.1, load: 54, tone: 'violet' },
      { id: 'pulse', name: 'Pulse Recovery', latency: 189, success: 98.7, load: 41, tone: 'amber' },
    ],
  },
  outage: {
    id: 'outage',
    label: 'Primary outage',
    description: 'The primary path is unavailable; recovery routing is the only healthy option.',
    gateways: [
      { id: 'atlas', name: 'Atlas Primary', latency: 0, success: 0, load: 100, tone: 'teal' },
      { id: 'orbit', name: 'Orbit Backup', latency: 204, success: 97.6, load: 72, tone: 'violet' },
      { id: 'pulse', name: 'Pulse Recovery', latency: 152, success: 99.2, load: 48, tone: 'amber' },
    ],
  },
};

const routeConfig: Record<GatewayId, RouteConfig> = {
  atlas: {
    label: 'Atlas Primary',
    path: 'M 58 110 C 150 42 250 42 350 42 L 440 42 L 500 110',
    fallbackPath: 'M 58 110 C 150 110 250 110 350 110 L 440 110 L 500 110',
    packet: [
      { x: 58, y: 110 },
      { x: 170, y: 54 },
      { x: 280, y: 42 },
      { x: 390, y: 42 },
      { x: 455, y: 68 },
      { x: 500, y: 110 },
    ],
    node: { x: 390, y: 42 },
  },
  orbit: {
    label: 'Orbit Backup',
    path: 'M 58 110 C 150 110 250 110 350 110 L 440 110 L 500 110',
    fallbackPath: 'M 58 110 C 150 42 250 42 350 42 L 440 42 L 500 110',
    packet: [
      { x: 58, y: 110 },
      { x: 170, y: 110 },
      { x: 280, y: 110 },
      { x: 390, y: 110 },
      { x: 455, y: 110 },
      { x: 500, y: 110 },
    ],
    node: { x: 390, y: 110 },
  },
  pulse: {
    label: 'Pulse Recovery',
    path: 'M 58 110 C 150 178 250 178 350 178 L 440 178 L 500 110',
    fallbackPath: 'M 58 110 C 150 110 250 110 350 110 L 440 110 L 500 110',
    packet: [
      { x: 58, y: 110 },
      { x: 170, y: 166 },
      { x: 280, y: 178 },
      { x: 390, y: 178 },
      { x: 455, y: 152 },
      { x: 500, y: 110 },
    ],
    node: { x: 390, y: 178 },
  },
};

const breakerCopy: Record<BreakerState, { label: string; status: string; detail: string }> = {
  closed: {
    label: 'Closed',
    status: 'Closed: traffic is flowing through the healthy path.',
    detail: 'Requests pass normally while latency and failure signals are observed.',
  },
  open: {
    label: 'Open',
    status: 'Open: the unhealthy path is isolated from new traffic.',
    detail: 'New requests are held or rerouted while the failure window cools down.',
  },
  halfOpen: {
    label: 'Half-Open',
    status: 'Half-Open: a controlled probe is testing recovery.',
    detail: 'A small canary cohort is admitted before the circuit returns to Closed.',
  },
};

const bentoCards: Array<{
  id: string;
  kicker: string;
  title: string;
  body: string;
  link: string;
  large?: boolean;
  icon: ReactNode;
}> = [
  {
    id: 'routing',
    kicker: 'Routing intelligence',
    title: 'Choose the next best path',
    body: 'Every decision balances latency, success probability, cost, and policy fit.',
    link: '#routing-simulator',
    large: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M4 17c4-8 8 4 12-4" strokeLinecap="round" />
        <path d="M4 7h5M15 17h5" strokeLinecap="round" />
        <circle cx="16" cy="13" r="2.2" />
      </svg>
    ),
  },
  {
    id: 'failover',
    kicker: 'Automatic failover',
    title: 'Recover without drama',
    body: 'A circuit breaker contains failures before they become a merchant incident.',
    link: '#circuit-breaker',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'compliance',
    kicker: 'Compliance guardrails',
    title: 'Policy stays attached',
    body: 'Risk and regulatory context travel with the transaction through every hop.',
    link: '#journey',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'observability',
    kicker: 'Observability',
    title: 'See the whole journey',
    body: 'A shared visual language connects engineering, finance, and operations.',
    link: '#journey',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M4 14a8 8 0 1 1 16 0" strokeLinecap="round" />
        <path d="M12 14 15 9" strokeLinecap="round" />
        <circle cx="12" cy="14" r="1.5" />
      </svg>
    ),
  },
  {
    id: 'approval',
    kicker: 'Human approval',
    title: 'Keep people in the loop',
    body: 'High-value or unusual activity can pause for a clear, auditable decision.',
    link: '#circuit-breaker',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3" strokeLinecap="round" />
        <path d="m9 16 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'reconciliation',
    kicker: 'Reconciliation',
    title: 'Close the loop',
    body: 'Outcome signals remain legible from authorization through finance settlement.',
    link: '#journey',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M4 5h16v14H4z" strokeLinejoin="round" />
        <path d="M8 9h8M8 13h5M8 17h7" strokeLinecap="round" />
      </svg>
    ),
  },
];

function PaymentNetworkCanvas({ paused, reducedMotion }: { paused: boolean; reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    };

    type Node = { x: number; y: number; label: string };

    let width = 1;
    let height = 1;
    let particles: Particle[] = [];
    let nodes: Node[] = [];
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;
    const pointer = { x: -9999, y: -9999, active: false };
    const staticMode = paused || reducedMotion;

    const buildScene = () => {
      const count = Math.max(36, Math.min(96, Math.floor((width * height) / 15000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.6 + 0.7,
        alpha: Math.random() * 0.45 + 0.25,
      }));

      nodes = [
        { x: width * 0.14, y: height * 0.28, label: 'SHOPPER' },
        { x: width * 0.36, y: height * 0.17, label: 'RISK' },
        { x: width * 0.6, y: height * 0.38, label: 'ROUTER' },
        { x: width * 0.84, y: height * 0.22, label: 'GATEWAY' },
        { x: width * 0.24, y: height * 0.73, label: 'APPROVAL' },
        { x: width * 0.54, y: height * 0.78, label: 'LEDGER' },
        { x: width * 0.82, y: height * 0.7, label: 'SETTLE' },
      ];
    };

    const drawScene = (time: number, interactive: boolean) => {
      context.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(width * 0.62, height * 0.42, 0, width * 0.62, height * 0.42, Math.max(width, height) * 0.62);
      glow.addColorStop(0, 'rgba(38, 214, 196, 0.12)');
      glow.addColorStop(0.45, 'rgba(90, 107, 255, 0.07)');
      glow.addColorStop(1, 'rgba(7, 11, 20, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.lineWidth = 1;
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 112) {
            context.strokeStyle = `rgba(126, 226, 214, ${0.16 * (1 - distance / 112)})`;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      const routes = [
        { from: nodes[0], to: nodes[2], control: { x: width * 0.3, y: height * 0.08 }, color: 'rgba(94, 234, 212, 0.5)' },
        { from: nodes[2], to: nodes[3], control: { x: width * 0.76, y: height * 0.12 }, color: 'rgba(139, 123, 255, 0.48)' },
        { from: nodes[2], to: nodes[5], control: { x: width * 0.48, y: height * 0.92 }, color: 'rgba(255, 200, 122, 0.36)' },
        { from: nodes[4], to: nodes[5], control: { x: width * 0.4, y: height * 0.94 }, color: 'rgba(126, 226, 214, 0.3)' },
        { from: nodes[5], to: nodes[6], control: { x: width * 0.72, y: height * 0.9 }, color: 'rgba(139, 123, 255, 0.3)' },
      ];

      routes.forEach((route, routeIndex) => {
        context.beginPath();
        context.moveTo(route.from.x, route.from.y);
        context.quadraticCurveTo(route.control.x, route.control.y, route.to.x, route.to.y);
        context.strokeStyle = route.color;
        context.lineWidth = 1.1;
        context.stroke();

        if (interactive) {
          const pulse = (time / 2100 + routeIndex * 0.23) % 1;
          const inverse = 1 - pulse;
          const x = inverse * inverse * route.from.x + 2 * inverse * pulse * route.control.x + pulse * pulse * route.to.x;
          const y = inverse * inverse * route.from.y + 2 * inverse * pulse * route.control.y + pulse * pulse * route.to.y;
          context.beginPath();
          context.arc(x, y, 2.6, 0, Math.PI * 2);
          context.fillStyle = routeIndex % 2 ? 'rgba(167, 151, 255, 0.9)' : 'rgba(110, 240, 219, 0.9)';
          context.fill();
        }
      });

      nodes.forEach((node, index) => {
        context.beginPath();
        context.arc(node.x, node.y, index === 2 ? 6 : 4, 0, Math.PI * 2);
        context.fillStyle = index === 2 ? 'rgba(94, 234, 212, 0.95)' : 'rgba(184, 199, 224, 0.72)';
        context.fill();
        context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.fillStyle = 'rgba(184, 199, 224, 0.58)';
        context.fillText(node.label, node.x + 10, node.y + 3);
      });

      particles.forEach((particle) => {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(174, 219, 226, ${particle.alpha})`;
        context.fill();
      });

      if (interactive && pointer.active) {
        context.beginPath();
        context.arc(pointer.x, pointer.y, 72, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(94, 234, 212, 0.22)';
        context.stroke();
        context.beginPath();
        context.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2);
        context.fillStyle = 'rgba(180, 255, 239, 0.95)';
        context.fill();

        particles.forEach((particle) => {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120 && distance > 0.1) {
            context.strokeStyle = `rgba(126, 226, 214, ${0.22 * (1 - distance / 120)})`;
            context.beginPath();
            context.moveTo(pointer.x, pointer.y);
            context.lineTo(particle.x, particle.y);
            context.stroke();
          }
        });
      }
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      buildScene();
      drawScene(0, false);
    };

    const updateParticles = () => {
      particles.forEach((particle) => {
        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 130 && distance > 0.1) {
            particle.vx += (dx / distance) * 0.018;
            particle.vy += (dy / distance) * 0.018;
          }
        }
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = height + 10;
        if (particle.y > height + 10) particle.y = -10;
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (staticMode) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    resize();
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(wrap);
    } else {
      window.addEventListener('resize', resize);
    }

    if (!staticMode) {
      const animate = (time: number) => {
        updateParticles();
        drawScene(time, true);
        frame = window.requestAnimationFrame(animate);
      };
      frame = window.requestAnimationFrame(animate);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [paused, reducedMotion]);

  return (
    <div ref={wrapRef} className={styles.networkCanvasWrap}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className={styles.srOnly}>
        Animated particle and payment-route network. The visual is decorative; all route information is available in the surrounding text.
      </span>
    </div>
  );
}

function Hero({ paused, reducedMotion }: { paused: boolean; reducedMotion: boolean }) {
  return (
    <section className={styles.hero} aria-labelledby="cinematic-hero-title">
      <div className={styles.heroBackdrop} aria-hidden="true" />
      <PaymentNetworkCanvas paused={paused} reducedMotion={reducedMotion} />
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroContent}>
        <div className={styles.heroCopy}>
          <motion.div className={styles.heroEyebrow} variants={revealVariants} initial="hidden" animate="visible">
            <span className={styles.liveDot} aria-hidden="true" />
            <span>Visual prototype / approval gate</span>
          </motion.div>
          <h1 id="cinematic-hero-title" className={styles.heroTitle}>
            <motion.span className={styles.heroLine} custom={0} variants={headlineVariants} initial="hidden" animate="visible">
              Payments that
            </motion.span>
            <motion.span className={`${styles.heroLine} ${styles.heroLineAccent}`} custom={1} variants={headlineVariants} initial="hidden" animate="visible">
              think ahead.
            </motion.span>
          </h1>
          <motion.p className={styles.heroCopyText} variants={revealVariants} initial="hidden" animate="visible">
            A cinematic view of intelligent routing, resilient authorization, and
            auditable settlement. Move through the prototype to see the system think.
          </motion.p>
          <motion.div className={styles.heroActions} variants={revealVariants} initial="hidden" animate="visible">
            <Link className={styles.heroButton} href="#journey">
              Watch the journey
              <span aria-hidden="true">↓</span>
            </Link>
            <Link className={styles.heroButtonSecondary} href="#routing-simulator">
              Open simulator
            </Link>
          </motion.div>
          <motion.dl className={styles.heroMetrics} variants={revealVariants} initial="hidden" animate="visible">
            <div>
              <dt>Decision latency</dt>
              <dd>&lt; 180 ms</dd>
            </div>
            <div>
              <dt>Mock gateway coverage</dt>
              <dd>3 paths</dd>
            </div>
            <div>
              <dt>Live data</dt>
              <dd>None</dd>
            </div>
          </motion.dl>
        </div>

        <div className={styles.coreStage} aria-hidden="true">
          <div className={styles.coreHalo} />
          <div className={styles.paymentCore}>
            <span className={`${styles.coreRing} ${styles.coreRingOne}`} />
            <span className={`${styles.coreRing} ${styles.coreRingTwo}`} />
            <span className={`${styles.coreRing} ${styles.coreRingThree}`} />
            <span className={styles.coreOrbit} />
            <span className={styles.coreOrbitDelay} />
            <div className={styles.coreCenter}>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="7" y="13" width="34" height="23" rx="5" />
                <path d="M7 21h34M15 28h8" strokeLinecap="round" />
              </svg>
              <span>NEXUS</span>
            </div>
            <span className={`${styles.coreBadge} ${styles.coreBadgeTop}`}>ROUTE</span>
            <span className={`${styles.coreBadge} ${styles.coreBadgeBottom}`}>SETTLE</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TransactionJourney() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 30,
    restDelta: 0.001,
  });
  const [activeAct, setActiveAct] = useState(0);
  const visualY = useTransform(progress, [0, 1], [0, -34]);
  const visualScale = useTransform(progress, [0, 1], [0.96, 1]);

  useMotionValueEvent(progress, 'change', (value) => {
    const next = Math.min(journeyActs.length - 1, Math.max(0, Math.floor(value * journeyActs.length)));
    setActiveAct((current) => (current === next ? current : next));
  });

  return (
    <section ref={sectionRef} className={styles.journey} id="journey" aria-labelledby="journey-title">
      <div className={styles.sectionInner}>
        <motion.div className={styles.sectionHeading} variants={revealVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <p className={styles.sectionKicker}>01 / Transaction journey</p>
          <h2 id="journey-title" className={styles.sectionTitle}>Four acts, one continuous decision.</h2>
          <p className={styles.sectionIntro}>Scroll to move from intent to settlement. The route visualization and act state are driven by scroll position.</p>
        </motion.div>

        <div className={styles.journeyLayout}>
          <div className={styles.journeyVisualWrap}>
            <motion.div className={styles.journeyVisual} style={{ y: visualY, scale: visualScale }}>
              <div className={styles.journeyGlow} aria-hidden="true" />
              <svg className={styles.journeySvg} viewBox="0 0 560 260" role="img" aria-labelledby="journey-svg-title journey-svg-desc">
                <title id="journey-svg-title">Scroll-driven transaction route</title>
                <desc id="journey-svg-desc">A route line reveals as the visitor scrolls through four transaction acts.</desc>
                <defs>
                  <linearGradient id="journeyGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#5eead4" />
                    <stop offset="0.55" stopColor="#8b7bff" />
                    <stop offset="1" stopColor="#ffc87a" />
                  </linearGradient>
                </defs>
                <path className={styles.journeyBaseRoute} d="M 45 210 C 130 210 150 70 260 70 S 420 170 515 170" />
                <motion.path className={styles.journeyRoute} d="M 45 210 C 130 210 150 70 260 70 S 420 170 515 170" pathLength={progress} />
                {journeyActs.map((act, index) => {
                  const x = [62, 210, 360, 500][index];
                  const y = index % 2 === 0 ? 210 : 70;
                  return (
                    <g key={act.number} className={styles.journeyNode} transform={`translate(${x}, ${y})`}>
                      <circle r={activeAct === index ? 10 : 7} />
                      <text y={index % 2 === 0 ? -22 : 30}>{act.number}</text>
                    </g>
                  );
                })}
              </svg>
              <div className={styles.journeyReadout}>
                <span className={styles.readoutNumber}>{journeyActs[activeAct].number}</span>
                <span className={styles.readoutLabel}>{journeyActs[activeAct].signal}</span>
              </div>
            </motion.div>
          </div>

          <ol className={styles.actList}>
            {journeyActs.map((act, index) => {
              const isActive = activeAct === index;
              return (
                <li key={act.number} className={`${styles.act} ${isActive ? styles.actActive : ''}`} aria-current={isActive ? 'step' : undefined}>
                  <span className={styles.actNumber}>{act.number}</span>
                  <div>
                    <h3>{act.title}</h3>
                    <p>{act.body}</p>
                    <span className={styles.actSignal}>{act.signal}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function SmartRoutingSimulator({ paused }: { paused: boolean }) {
  const [scenario, setScenario] = useState<ScenarioId>('steady');
  const [selectedGateway, setSelectedGateway] = useState<GatewayId>('atlas');
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<LastSimulationResult | null>(null);
  const [runId, setRunId] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateways = scenarioCatalog[scenario].gateways;
  const selectedGatewayData = gateways.find((gateway) => gateway.id === selectedGateway) ?? gateways[0];
  const route = routeConfig[selectedGateway];

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setLastResult(null);
    timerRef.current = setTimeout(() => {
      setIsSimulating(false);
      setLastResult({
        gateway: selectedGatewayData.name,
        latency: Math.max(1, selectedGatewayData.latency + 18),
      });
      setRunId((current) => current + 1);
    }, 1400);
  };

  const statusText = isSimulating
    ? `Routing a mock authorization through ${selectedGatewayData.name}...`
    : lastResult
      ? `Mock authorization approved via ${lastResult.gateway} in ${lastResult.latency} ms.`
      : 'Ready. This simulator uses mocked data and sends no network requests.';

  return (
    <section className={styles.simulator} id="routing-simulator" aria-labelledby="simulator-title">
      <div className={styles.sectionInner}>
        <motion.div className={styles.sectionHeading} variants={revealVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <p className={styles.sectionKicker}>02 / Smart routing simulator</p>
          <h2 id="simulator-title" className={styles.sectionTitle}>Choose a path. Watch the decision.</h2>
          <p className={styles.sectionIntro}>Change the traffic scenario or gateway to explore how a routing policy can respond. Every value on this page is mocked locally.</p>
        </motion.div>

        <div className={styles.simulatorGrid}>
          <div className={styles.simulatorPanel} aria-busy={isSimulating}>
            <fieldset className={styles.scenarioField}>
              <legend>Mock traffic scenario</legend>
              <div className={styles.scenarioOptions}>
                {(Object.values(scenarioCatalog) as Scenario[]).map((item) => (
                  <label key={item.id} className={styles.scenarioOption}>
                    <input
                      type="radio"
                      name="mock-scenario"
                      value={item.id}
                      checked={scenario === item.id}
                      disabled={isSimulating}
                      onChange={() => setScenario(item.id)}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.gatewayPicker} role="group" aria-label="Mock gateway selection">
              {gateways.map((gateway) => (
                <button
                  key={gateway.id}
                  type="button"
                  className={`${styles.gatewayOption} ${selectedGateway === gateway.id ? styles.gatewayOptionSelected : ''}`}
                  aria-pressed={selectedGateway === gateway.id}
                  disabled={isSimulating || gateway.success === 0}
                  onClick={() => setSelectedGateway(gateway.id)}
                >
                  <span className={styles.gatewayOptionMark} data-tone={gateway.tone} aria-hidden="true" />
                  <span className={styles.gatewayOptionCopy}>
                    <strong>{gateway.name}</strong>
                    <small>{gateway.success === 0 ? 'Unavailable' : `${gateway.latency} ms · ${gateway.success}% success`}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.gatewayMetrics} aria-label="Mock gateway metrics">
              {gateways.map((gateway) => (
                <div key={gateway.id} className={styles.gatewayMetric} data-tone={gateway.tone}>
                  <span>{gateway.name}</span>
                  <strong>{gateway.success === 0 ? '—' : `${gateway.latency} ms`}</strong>
                  <small>{gateway.success === 0 ? 'open circuit' : `${gateway.load}% load`}</small>
                </div>
              ))}
            </div>

            <div className={styles.simulatorActions}>
              <button type="button" className={styles.simulatorRun} onClick={runSimulation} disabled={isSimulating || selectedGatewayData.success === 0}>
                {isSimulating ? 'Routing...' : 'Run mock authorization'}
              </button>
              <p className={styles.simulatorStatus} role="status" aria-live="polite">
                {statusText}
              </p>
            </div>
          </div>

          <div className={styles.routePanel}>
            <div className={styles.routePanelHeader}>
              <div>
                <p className={styles.routePanelKicker}>Animated route</p>
                <h3>{route.label}</h3>
              </div>
              <span className={styles.routePanelState}>{isSimulating ? 'IN FLIGHT' : lastResult ? 'APPROVED' : 'READY'}</span>
            </div>
            <svg className={styles.routeSvg} viewBox="0 0 560 220" role="img" aria-labelledby="route-svg-title route-svg-desc">
              <title id="route-svg-title">Animated mock payment route</title>
              <desc id="route-svg-desc">A packet travels from checkout to the selected mock gateway and destination.</desc>
              <path className={styles.routeFallbackLine} d={route.fallbackPath} />
              <motion.path
                className={styles.routeActiveLine}
                d={route.path}
                pathLength={1}
                strokeDasharray="0.06 0.1"
                animate={paused ? undefined : { strokeDashoffset: [0, -0.16] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
              <motion.circle
                key={`${selectedGateway}-${runId}`}
                className={styles.routePacket}
                cx={route.packet[0].x}
                cy={route.packet[0].y}
                r={5}
                animate={paused ? undefined : {
                  cx: route.packet.map((point) => point.x),
                  cy: route.packet.map((point) => point.y),
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
              <g className={styles.routeNode} transform="translate(58, 110)">
                <circle r="9" />
                <text y="30">CHECKOUT</text>
              </g>
              <g className={styles.routeNode} transform={`translate(${route.node.x}, ${route.node.y})`}>
                <circle r="11" />
                <text y={route.node.y > 130 ? -22 : 30}>{selectedGateway.toUpperCase()}</text>
              </g>
              <g className={styles.routeNode} transform="translate(500, 110)">
                <circle r="9" />
                <text y="30">DESTINATION</text>
              </g>
            </svg>
            <div className={styles.routeLegend}>
              <span><i className={styles.legendActive} aria-hidden="true" />Selected route</span>
              <span><i className={styles.legendFallback} aria-hidden="true" />Fallback path</span>
            </div>
            {lastResult && (
              <div className={styles.simulationResult}>
                <span>Result</span>
                <strong>{lastResult.gateway}</strong>
                <small>{lastResult.latency} ms · mock approval</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CircuitBreaker() {
  const [breakerState, setBreakerState] = useState<BreakerState>('closed');
  const info = breakerCopy[breakerState];
  const leverX = breakerState === 'closed' ? 0 : breakerState === 'halfOpen' ? 102 : 204;

  return (
    <section className={styles.circuit} id="circuit-breaker" aria-labelledby="circuit-title">
      <div className={styles.sectionInner}>
        <motion.div className={styles.sectionHeading} variants={revealVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <p className={styles.sectionKicker}>03 / Circuit breaker</p>
          <h2 id="circuit-title" className={styles.sectionTitle}>Resilience with a visible state.</h2>
          <p className={styles.sectionIntro}>Select a state to preview how the system contains failures and admits recovery traffic.</p>
        </motion.div>

        <div className={styles.circuitLayout}>
          <div className={styles.breakerStage}>
            <div className={styles.breakerVisual} role="img" aria-label={`Circuit breaker visual: ${info.label}`}>
              <div className={styles.breakerGlow} aria-hidden="true" />
              <div className={styles.breakerTrack}>
                <motion.div className={styles.breakerLever} animate={{ x: leverX }} transition={{ type: 'spring', stiffness: 180, damping: 18 }} />
              </div>
              <div className={styles.breakerLabels} aria-hidden="true">
                <span>CLOSED</span>
                <span>HALF-OPEN</span>
                <span>OPEN</span>
              </div>
              <div className={styles.breakerReadout}>
                <span className={styles.breakerReadoutLabel}>STATE</span>
                <strong>{info.label}</strong>
              </div>
            </div>
          </div>

          <div className={styles.breakerCopyPanel}>
            <fieldset className={styles.stateField}>
              <legend>Circuit state</legend>
              <div className={styles.stateOptions}>
                {([
                  { id: 'closed', label: 'Closed' },
                  { id: 'halfOpen', label: 'Half-Open' },
                  { id: 'open', label: 'Open' },
                ] as Array<{ id: BreakerState; label: string }>).map((item) => (
                  <label key={item.id} className={styles.stateOption}>
                    <input
                      type="radio"
                      name="breaker-state"
                      value={item.id}
                      checked={breakerState === item.id}
                      onChange={() => setBreakerState(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className={styles.breakerStatus} role="status" aria-live="polite">{info.status}</p>
            <p className={styles.breakerDetail}>{info.detail}</p>
            <dl className={styles.breakerFacts}>
              <div>
                <dt>New traffic</dt>
                <dd>{breakerState === 'open' ? 'Held / rerouted' : breakerState === 'halfOpen' ? 'Canary only' : 'Allowed'}</dd>
              </div>
              <div>
                <dt>Recovery probe</dt>
                <dd>{breakerState === 'halfOpen' ? 'Active' : 'Idle'}</dd>
              </div>
              <div>
                <dt>Operator signal</dt>
                <dd>{breakerState === 'open' ? 'Investigate' : breakerState === 'halfOpen' ? 'Watch closely' : 'Healthy'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function TiltCard({ card, disabled }: { card: typeof bentoCards[number]; disabled: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 160, damping: 17 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 160, damping: 17 });

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - bounds.left) / bounds.width - 0.5);
    y.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const resetTilt = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <article className={`${styles.bentoCard} ${card.large ? styles.bentoCardLarge : ''}`} aria-labelledby={`bento-${card.id}`}>
      <motion.div
        className={styles.bentoTilt}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
      >
        <div className={styles.bentoIcon}>{card.icon}</div>
        <p className={styles.bentoKicker}>{card.kicker}</p>
        <h3 id={`bento-${card.id}`}>{card.title}</h3>
        <p className={styles.bentoBody}>{card.body}</p>
        <Link className={styles.bentoLink} href={card.link}>
          Inspect pattern <span aria-hidden="true">↗</span>
        </Link>
        <span className={styles.bentoSheen} aria-hidden="true" />
      </motion.div>
    </article>
  );
}

function BentoGrid({ disabled }: { disabled: boolean }) {
  return (
    <section className={styles.bento} aria-labelledby="bento-title">
      <div className={styles.sectionInner}>
        <motion.div className={styles.sectionHeading} variants={revealVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <p className={styles.sectionKicker}>04 / Operating surface</p>
          <h2 id="bento-title" className={styles.sectionTitle}>One surface for every signal.</h2>
          <p className={styles.sectionIntro}>Pointer over the cards to feel the physical response. The content remains available without pointer input.</p>
        </motion.div>
        <div className={styles.bentoGrid}>
          {bentoCards.map((card) => <TiltCard key={card.id} card={card} disabled={disabled} />)}
        </div>
      </div>
    </section>
  );
}

export default function CinematicPreview() {
  const systemReducedMotion = useReducedMotion() ?? false;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const motionDisabled = reduceMotion || systemReducedMotion;
  const isPaused = motionDisabled || ambientPaused;

  return (
    <MotionConfig reducedMotion={motionDisabled ? 'always' : 'user'}>
      <div className={`${styles.root} ${isPaused ? styles.rootPaused : ''}`}>
      <style jsx global>{`
        body:has(.${styles.root}) .nav-glass,
        body:has(.${styles.root}) [data-rht-toaster] {
          display: none !important;
        }
      `}</style>
        <a className={styles.skipLink} href="#preview-content">Skip to preview content</a>

        <header className={styles.previewHeader}>
          <div className={styles.headerInner}>
            <Link className={styles.brandLink} href="/" aria-label="Return to Nexus-Agent production site">
              <span className={styles.brandMark} aria-hidden="true">N</span>
              <span className={styles.brandName}>Nexus-Agent <small>cinematic preview</small></span>
            </Link>
            <div className={styles.notice} role="note" aria-labelledby="prototype-notice-title">
              <span className={styles.noticeIcon} aria-hidden="true">!</span>
              <div>
                <p className={styles.noticeKicker}>Prototype / approval notice</p>
                <h2 id="prototype-notice-title">Visual-only preview</h2>
                <p>No payment request, API call, or production state change occurs on this route.</p>
              </div>
            </div>
            <div className={styles.previewControls} aria-label="Preview controls">
              <label className={styles.motionSwitch}>
                <input type="checkbox" checked={reduceMotion} onChange={(event) => setReduceMotion(event.target.checked)} />
                <span className={styles.switchTrack} aria-hidden="true"><span /></span>
                <span>Reduce motion</span>
              </label>
              <button type="button" className={styles.pauseButton} aria-pressed={ambientPaused} onClick={() => setAmbientPaused((current) => !current)}>
                {ambientPaused ? 'Resume ambient motion' : 'Pause ambient motion'}
              </button>
              <Link className={styles.returnLink} href="/">Return to production site</Link>
            </div>
          </div>
        </header>

        <main id="preview-content">
          <Hero paused={isPaused} reducedMotion={motionDisabled} />
          <TransactionJourney />
          <SmartRoutingSimulator paused={isPaused} />
          <CircuitBreaker />
          <BentoGrid disabled={isPaused} />
        </main>

        <footer className={styles.previewFooter}>
          <div className={styles.sectionInner}>
            <span className={styles.footerMark} aria-hidden="true">N</span>
            <p>Cinematic prototype for review and approval. All data is illustrative.</p>
            <Link href="/">Production site</Link>
          </div>
        </footer>
      </div>
    </MotionConfig>

  );
}




