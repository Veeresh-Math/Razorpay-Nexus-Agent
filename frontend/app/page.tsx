'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import { useRef } from 'react';
import GradientText from '../components/react-bits/GradientText';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HomePage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  
  const scaleX: MotionValue<number> = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const features = [
    {
      title: 'Smart Routing',
      description: 'AI-powered gateway selection ensures optimal success rates for every transaction.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'Auto Failover',
      description: 'Instant automatic switching to backup gateways when issues are detected.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    {
      title: 'Compliance Engine',
      description: 'Built-in RBI, PCI, and GDPR compliance checks for every transaction.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: 'Real-time Analytics',
      description: 'Live dashboard with transaction metrics, success rates, and revenue analytics.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Batch Processing',
      description: 'Process thousands of transactions with intelligent batching and reconciliation.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      title: 'Human Approval',
      description: 'Configurable workflows for high-value or suspicious transactions.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Create account',
      description: 'Sign up and get your API keys instantly. No credit card required.',
    },
    {
      step: '02',
      title: 'Integrate',
      description: 'Use our SDK or REST API to add payments to your platform in minutes.',
    },
    {
      step: '03',
      title: 'Go live',
      description: 'Switch to production and start processing payments immediately.',
    },
  ];

  const testimonials = [
    {
      quote: "Reduced our payment failures by 99%. The auto-failover is incredible.",
      name: "Sarah Chen",
      role: "CTO at TechCorp",
      initials: "SC"
    },
    {
      quote: "Finally, a payment API that just works. Integration took an afternoon.",
      name: "Marcus Johnson",
      role: "Lead Developer at ScaleUp",
      initials: "MJ"
    },
    {
      quote: "The compliance automation alone saves us weeks of engineering time.",
      name: "Priya Patel",
      role: "VP Engineering at FinTech Co",
      initials: "PP"
    },
  ];

  const trustLogos = [
    { name: 'Stripe', width: 70, color: '#635BFF' },
    { name: 'Razorpay', width: 90, color: '#2563EB' },
    { name: 'PayPal', width: 80, color: '#003087' },
    { name: 'Square', width: 75, color: '#000000' },
    { name: 'Adyen', width: 75, color: '#FF0054' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-white">
      
      {/* Scroll Progress */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-0.5 bg-neutral-200 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="font-bold text-lg text-neutral-900">Nexus-Agent</span>
            </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-950 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-neutral-600 hover:text-neutral-950 transition-colors">How it works</a>
            <a href="#testimonials" className="text-sm text-neutral-600 hover:text-neutral-950 transition-colors">Testimonials</a>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/merchant-dashboard" 
              className="text-sm text-neutral-600 hover:text-neutral-950 transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link 
              href="/agent-catalog" 
              className="bg-neutral-950 text-white text-sm px-5 py-2.5 rounded-full font-medium hover:bg-neutral-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-[85vh] flex items-center justify-center relative px-6 pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-white to-white -z-10" />
        
        <motion.div 
          style={{ y, opacity }}
          className="text-center max-w-4xl"
        >
          <motion.p 
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm text-neutral-500 uppercase tracking-[0.2em] mb-4"
          >
            AI-Native Payment Infrastructure
          </motion.p>
          
          <motion.h1 
            {...fadeInUp}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-4"
          >
            <GradientText 
              colors={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef']}
              animationSpeed={5}
              className="inline-block"
            >
              AI-native payments
            </GradientText>
            <span className="text-neutral-900"> that never fail.</span>
          </motion.h1>
          
          <motion.p 
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg md:text-xl text-neutral-500 max-w-lg mx-auto mb-8 leading-relaxed"
          >
            Intelligent routing, automatic failover, and compliance built-in.
          </motion.p>
          
          <motion.div 
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              href="/agent-catalog" 
              className="bg-neutral-950 text-white px-8 py-4 rounded-full font-medium hover:bg-neutral-800 transition-all duration-300 hover:shadow-xl hover:shadow-neutral-950/10"
            >
              Start for free
            </Link>
            <Link 
              href="/merchant-dashboard" 
              className="text-neutral-600 px-8 py-4 rounded-full font-medium hover:text-neutral-950 transition-colors border border-neutral-200 hover:border-neutral-300"
            >
              View demo
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Trust Logos */}
      <section className="py-16 px-6 border-y border-neutral-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-neutral-400 mb-8 uppercase tracking-wider">
            Trusted by forward-thinking teams
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
            {trustLogos.map((logo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="font-bold text-xl tracking-tight"
                style={{ width: logo.width, color: logo.color }}
              >
                {logo.name}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-neutral-950 rounded-2xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { value: '99.99%', label: 'Uptime guarantee' },
                { value: '<100ms', label: 'Average latency' },
                { value: '50+', label: 'Payment gateways' },
                { value: '100%', label: 'Transaction success' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-neutral-300">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <GradientText 
              colors={['#5227FF', '#FF9FFC', '#B497CF']}
              animationSpeed={8}
              className="text-sm uppercase tracking-wider mb-4"
            >
              Features
            </GradientText>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight mb-4">
              Everything you need to scale payments.
            </h2>
            <p className="text-neutral-500 max-w-lg mx-auto">
              From smart routing to automated compliance, we handle the complexity so you can focus on building.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 hover:border-neutral-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600 mb-4 group-hover:bg-neutral-950 group-hover:text-white transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-base md:text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 md:py-24 px-6 bg-neutral-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight mb-4">
              How it works.
            </h2>
            <p className="text-neutral-600 max-w-lg mx-auto">
              Get started in minutes, not months.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-4">
                  <div className="text-4xl md:text-5xl font-semibold text-neutral-300">{item.step}</div>
                </div>
                <h3 className="text-base md:text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-neutral-600 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight">
              Loved by developers.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 hover:shadow-lg transition-all duration-300"
              >
                <p className="text-neutral-700 mb-4 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 font-medium text-sm">
                    {testimonial.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-neutral-900">{testimonial.name}</div>
                    <div className="text-neutral-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-neutral-950 rounded-2xl md:rounded-3xl p-8 md:p-16 text-center"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-white mb-4">
              Ready to upgrade?
            </h2>
            <p className="text-neutral-300 mb-8 max-w-md mx-auto">
              Join thousands of teams already using Nexus-Agent. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/agent-catalog" 
                className="bg-white text-neutral-950 px-8 py-4 rounded-full font-medium hover:bg-neutral-100 transition-colors w-full sm:w-auto"
              >
                Start free trial
              </Link>
              <Link 
                href="/merchant-dashboard" 
                className="bg-white/10 text-white px-8 py-4 rounded-full font-medium hover:bg-white/20 transition-colors border border-white/20 w-full sm:w-auto"
              >
                Schedule demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-neutral-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
                <span className="text-white font-bold text-xs">N</span>
              </div>
              <span className="font-bold text-sm text-neutral-900">Nexus-Agent</span>
            </div>
            
            <p className="text-sm text-neutral-500">
              © 2026 Nexus-Agent. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <a href="#" className="hover:text-neutral-950 transition-colors">Privacy</a>
              <a href="#" className="hover:text-neutral-950 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
