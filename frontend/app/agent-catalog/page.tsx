'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Bot, CreditCard, Shield, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../api/client';
import { supabase } from '../api/supabase';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image: string;
  sku: string;
  availability: string;
  seller: string;
}

interface ContextualData {
  offers: Array<{id: string; type: string; title: string; description: string; value: string; max_discount?: string}>;
  emi_options: Array<{tenure_months: number; interest_rate: number; monthly_installment: number; total_payable: number; bank: string}>;
  fraud_signals: {score: number; level: string; factors: string[]; recommendation: string};
  loyalty_rewards: Array<{type: string; value: string; description: string}>;
  contextual_insights: Record<string, any>;
}

const products: Product[] = [
  {
    id: 'prod_001',
    name: 'Enterprise API Gateway License',
    description: 'High-throughput API gateway with rate limiting, analytics, and multi-region failover for enterprise-scale applications.',
    price: 299.00,
    currency: 'USD',
    category: 'Software',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop',
    sku: 'ENT-API-GW-001',
    availability: 'InStock',
    seller: 'Nexus Merchant Services',
  },
  {
    id: 'prod_002',
    name: 'Cross-Border Payment Optimization',
    description: 'AI-powered routing engine for international transactions with 99.9% success rate and multi-currency support.',
    price: 599.00,
    currency: 'USD',
    category: 'SaaS',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    sku: 'CB-PAY-OPT-002',
    availability: 'InStock',
    seller: 'Nexus Merchant Services',
  },
  {
    id: 'prod_003',
    name: 'RBI Compliance Automation Toolkit',
    description: 'Automated invoice parsing, purpose code mapping, and regulatory reporting for PA-CB transactions.',
    price: 399.00,
    currency: 'USD',
    category: 'Compliance',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop',
    sku: 'RBI-COMP-003',
    availability: 'InStock',
    seller: 'Nexus Merchant Services',
  },
  {
    id: 'prod_004',
    name: 'Revenue Recovery Dashboard',
    description: 'Real-time failed payment detection, automated retry logic, and recovery analytics dashboard.',
    price: 199.00,
    currency: 'USD',
    category: 'Analytics',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    sku: 'REV-REC-004',
    availability: 'InStock',
    seller: 'Nexus Merchant Services',
  },
];

function JSONLdInjector({ jsonLd }: { jsonLd: object }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld';
    script.textContent = JSON.stringify(jsonLd, null, 2);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('json-ld');
      if (existing) existing.remove();
    };
  }, [jsonLd]);

  return null;
}

export default function AgentCatalogPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [buyerToken, setBuyerToken] = useState('ai-bot-');
  const [gatewayHealth, setGatewayHealth] = useState(true);
  const [contextualData, setContextualData] = useState<ContextualData | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const router = useRouter();

  useEffect(() => {
    setBuyerToken('ai-bot-' + Math.random().toString(36).substring(7));
  }, []);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  const fetchContextualData = async (product: Product) => {
    try {
      const response = await api.get('/contextual/enrich', {
        params: {
          amount: Math.round(product.price * 100),
          currency: product.currency,
          purpose_code: 'P0802',
          merchant: 'nexus',
          buyer_country: 'US',
          buyer_token: buyerToken,
        }
      });
      setContextualData(response.data);
    } catch (error) {
      console.warn('Failed to fetch contextual data:', error);
      setContextualData(null);
    }
  };

  const handlePurchase = async (product: Product) => {
    setSelectedProduct(product);
    setIsProcessing(true);
    setContextualData(null);
    
    await fetchContextualData(product);

    try {
      const response = await api.post('/nexus/checkout-orchestrator', {
        transaction_id: `txn_${Date.now()}`,
        amount_usd: product.price,
        buyer_signature_token: buyerToken,
        buyer_country: 'US',
        purpose_code: 'P0802',
        network_node_integrity: gatewayHealth,
        metadata: {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
        },
      });

      setIsProcessing(false);

      if (response.data.status === 'PENDING_HUMAN_APPROVAL' || response.data.status === 'RECOVERY_ROUTED_SUCCESS') {
        const txnId = buyerToken + '_' + Date.now();
        
        // Save to Supabase
        const { error: supabaseError } = await supabase
          .from('transactions')
          .insert({
            id: txnId,
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            buyer_token: buyerToken,
            amount_cents: Math.round(product.price * 100),
            currency: 'USD',
            status: response.data.status,
            nexus_order_id: response.data.nexus_order_id,
            razorpay_order_id: response.data.payload_context?.razorpay_order_id,
            mitigation_target: response.data.mitigation_target,
            payload_context: response.data.payload_context,
            created_at: new Date().toISOString(),
          });
        
        if (supabaseError) {
          console.error('Supabase insert error:', supabaseError);
          // Fallback to localStorage
          const txn = {
            id: txnId,
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              sku: product.sku,
            },
            buyerToken: buyerToken,
            amountCents: Math.round(product.price * 100),
            currency: 'USD',
            status: response.data.status,
            nexusOrderId: response.data.nexus_order_id,
            razorpayOrderId: response.data.payload_context?.razorpay_order_id,
            mitigationTarget: response.data.mitigation_target,
            payloadContext: response.data.payload_context,
            createdAt: Date.now(),
          };
          const existingTxns = JSON.parse(localStorage.getItem('nexus_transactions') || '[]');
          existingTxns.push(txn);
          localStorage.setItem('nexus_transactions', JSON.stringify(existingTxns));
        }
        
        toast.success(response.data.status === 'PENDING_HUMAN_APPROVAL' 
          ? 'Payment initiated! Awaiting human approval...' 
          : 'Routed through fallback gateway!', { duration: 5000 });
        setTimeout(() => router.push('/merchant-dashboard'), 2000);
      }
    } catch (error: any) {
      setIsProcessing(false);
      const message = error.response?.data?.detail || 'Payment failed. Please try again.';
      toast.error(message, { duration: 5000 });
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        '@id': `https://nexus-agent.razorpay.com/products/${product.id}`,
        sku: product.sku,
        name: product.name,
        description: product.description,
        image: product.image,
        offers: {
          '@type': 'Offer',
          '@id': `https://nexus-agent.razorpay.com/offers/${product.id}`,
          priceCurrency: product.currency,
          price: product.price,
          availability: `https://schema.org/${product.availability}`,
          seller: {
            '@type': 'Organization',
            name: product.seller,
          },
        },
      },
    })),
  };

  return (
    <>
      <JSONLdInjector jsonLd={jsonLd} />
      <div className="min-h-screen bg-white">
        {/* Minimal Header */}
        <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-neutral-900">Nexus-Agent</span>
              </Link>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400">
                  <Bot className="w-4 h-4" />
                  <span>Agent-Readable Mode</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <Link 
                  href="/merchant-dashboard" 
                  className="bg-white text-neutral-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-neutral-100 transition-colors"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Agent Mode Banner */}
        <div className="bg-neutral-900 text-white border-b border-neutral-800">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-white">AI-Agent Mode Active</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
                  JSON-LD Ready
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-neutral-400">Gateway:</span>
                  <span className={`w-2 h-2 rounded-full ${gatewayHealth ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className={gatewayHealth ? 'text-emerald-400' : 'text-red-400'}>
                    {gatewayHealth ? 'Healthy' : 'Down'}
                  </span>
                  <input
                    type="checkbox"
                    checked={gatewayHealth}
                    onChange={(e) => setGatewayHealth(e.target.checked)}
                    className="sr-only"
                  />
                </label>
                <div className="text-neutral-500">
                  <span className="font-mono text-xs" suppressHydrationWarning>
                    {buyerToken}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-6 py-12">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-semibold mb-3">
              Agent Catalog
            </h1>
            <p className="text-neutral-600 max-w-xl">
              Programmatically discoverable products with structured metadata for autonomous AI buyers.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === category
                    ? 'bg-neutral-950 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {category === 'all' ? 'All Products' : category}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                itemScope
                itemType="https://schema.org/Product"
                className="group bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:border-neutral-300 hover:shadow-xl transition-all duration-300"
              >
                {/* Product Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    itemProp="image"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      product.availability === 'InStock' 
                        ? 'bg-emerald-500/90 text-white' 
                        : 'bg-red-500/90 text-white'
                    }`}>
                      {product.availability === 'InStock' ? 'In stock' : 'Out of stock'}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-neutral-700 capitalize">
                      {product.category}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-base line-clamp-1" itemProp="name">{product.name}</h3>
                  </div>
                  
                  <p className="text-neutral-600 text-sm line-clamp-2 mb-4" itemProp="description">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xl font-semibold" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                      <span className="text-neutral-950">${product.price.toFixed(2)}</span>
                      <meta itemProp="priceCurrency" content={product.currency} />
                      <meta itemProp="price" content={product.price.toFixed(2)} />
                    </div>
                    <span className="text-xs text-neutral-500 font-mono">{product.sku}</span>
                  </div>

                  {/* AI Metadata Toggle */}
                  <details className="border-t border-neutral-100 pt-3 mb-4">
                    <summary className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer hover:text-neutral-800 transition-colors">
                      <Shield className="w-3 h-3" />
                      AI Metadata
                    </summary>
                    <div className="mt-2 space-y-1 text-xs font-mono text-neutral-500 bg-neutral-50 p-3 rounded-lg">
                      <div>@type: Product</div>
                      <div>@id: nexus-agent/products/{product.id}</div>
                      <div>price: {product.price} {product.currency}</div>
                    </div>
                  </details>

                  <button
                    onClick={() => handlePurchase(product)}
                    disabled={isProcessing}
                    className="w-full bg-neutral-950 text-white py-3 rounded-full font-medium text-sm hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing && selectedProduct?.id === product.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Purchase
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </motion.article>
            ))}
          </div>


        </main>

        {/* Processing Modal */}
        <AnimatePresence>
          {selectedProduct && isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-lg text-center overflow-hidden"
              >
                <div className="flex flex-col items-center gap-6 p-10">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-neutral-300 animate-spin" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 border-2 border-neutral-200 rounded-full"
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Processing Payment</h3>
                    <p className="text-neutral-500 text-sm">
                      {selectedProduct.name}
                    </p>
                    <p className="text-lg font-semibold text-neutral-950 mt-1">
                      ${selectedProduct.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-3 text-left w-full max-w-sm mx-auto text-sm">
                    {[
                      'Converting to integer cents...',
                      'Smart routing with RBI purpose code...',
                      'Checking gateway health...',
                      'Awaiting human approval gate...',
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-neutral-600">
                        <div className="w-2 h-2 bg-neutral-300 rounded-full animate-pulse" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-neutral-100 w-full">
                    <p className="text-xs text-neutral-500 font-mono">
                      Transaction ID: txn_{Date.now()}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
