'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Database,
  Zap,
  Bot,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { supabase } from '../api/supabase';
import Link from 'next/link';

type Transaction = {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    sku: string;
  };
  buyerToken: string;
  amountCents: number;
  currency: string;
  status: 'PENDING_HUMAN_APPROVAL' | 'RECOVERY_ROUTED_SUCCESS' | 'SUCCESS' | 'FAILED' | 'APPROVED' | 'REJECTED';
  nexusOrderId?: string;
  razorpayOrderId?: string;
  mitigationTarget?: string;
  auditLog?: string;
  payloadContext?: any;
  createdAt: number;
  approvedAt?: number;
  rejectedAt?: number;
};

type ReconciliationRecord = {
  invoice_uuid: string;
  target_payment_id: string;
  expected_cents: number;
  rbi_regulatory_purpose_code: string;
  status?: 'matched' | 'mismatch' | 'missing' | 'compliance_error';
  actual_cents?: number;
  error_class?: string;
  narrative?: string;
};

export default function MerchantDashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reconciliationRecords, setReconciliationRecords] = useState<ReconciliationRecord[]>([]);
  const [isLoadingReconciliation, setIsLoadingReconciliation] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'reconciliation'>('pending');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    // Fetch transactions from Supabase
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase fetch error:', error);
          // Fallback to localStorage
          const storedTxns = JSON.parse(localStorage.getItem('nexus_transactions') || '[]');
          setTransactions(storedTxns);
          return;
        }
        
        if (data) {
          const txns = data.map((t: any) => ({
            id: t.id,
            product: {
              id: t.product_id,
              name: t.product_name,
              price: t.amount_cents / 100,
              sku: t.product_sku,
            },
            buyerToken: t.buyer_token,
            amountCents: t.amount_cents,
            currency: t.currency,
            status: t.status,
            nexusOrderId: t.nexus_order_id,
            razorpayOrderId: t.razorpay_order_id,
            mitigationTarget: t.mitigation_target,
            auditLog: t.audit_log,
            payloadContext: t.payload_context,
            createdAt: new Date(t.created_at).getTime(),
            approvedAt: t.approved_at ? new Date(t.approved_at).getTime() : undefined,
            rejectedAt: t.rejected_at ? new Date(t.rejected_at).getTime() : undefined,
          }));
          setTransactions(txns);
        }
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err);
        // Fallback to localStorage
        const storedTxns = JSON.parse(localStorage.getItem('nexus_transactions') || '[]');
        setTransactions(storedTxns);
      }
    };
    
    fetchTransactions();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        console.log('Real-time update:', payload);
        fetchTransactions();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (txn: Transaction) => {
    const confirm = window.confirm(
      `Approve payment of $${(txn.amountCents / 100).toFixed(2)} for "${txn.product.name}"?\n\n` +
      `Buyer: ${txn.buyerToken}\n` +
      `Order ID: ${txn.nexusOrderId || txn.razorpayOrderId || 'N/A'}\n\n` +
      `This will release funds to the merchant.`
    );

    if (!confirm) return;

    try {
      toast.loading('Processing approval...', { id: 'approve' });
      
      // Update in Supabase
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'APPROVED', 
          approved_at: new Date().toISOString() 
        })
        .eq('id', txn.id);
      
      if (error) {
        console.error('Supabase update error:', error);
      }
      
      // Optimistic update
      const updatedTxns = transactions.map(t =>
        t.id === txn.id
          ? { ...t, status: 'APPROVED' as const, approvedAt: Date.now() }
          : t
      );
      setTransactions(updatedTxns);

      toast.success('Payment approved! Funds released to merchant.', { id: 'approve', duration: 4000 });
    } catch (error) {
      toast.error('Approval failed. Please try again.', { id: 'approve' });
    }
  };

  const handleReject = async (txn: Transaction) => {
    const reason = window.confirm(
      `Reject payment of ${formatCurrency(txn.amountCents)} for "${txn.product.name}"?\n\n` +
      `Buyer: ${txn.buyerToken}\n` +
      `Order ID: ${txn.nexusOrderId || txn.razorpayOrderId || 'N/A'}`
    );
    if (!reason) return;

    try {
      toast.loading('Processing rejection...', { id: 'reject' });
      
      // Update in Supabase
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'REJECTED', 
          rejected_at: new Date().toISOString() 
        })
        .eq('id', txn.id);
      
      if (error) {
        console.error('Supabase update error:', error);
      }
      
      // Optimistic update
      const updatedTxns = transactions.map(t =>
        t.id === txn.id
          ? { ...t, status: 'REJECTED' as const, rejectedAt: Date.now() }
          : t
      );
      setTransactions(updatedTxns);

      toast.success('Payment rejected.', { id: 'reject', duration: 4000 });
    } catch (error) {
      toast.error('Rejection failed. Please try again.', { id: 'reject' });
    }
  };

  const handleViewOrder = (orderId: string) => {
    window.open(`https://dashboard.razorpay.com/app/orders/${orderId}`, '_blank');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const runReconciliation = async () => {
    setIsLoadingReconciliation(true);
    try {
      const response = await api.post('/reconciliation/batch-audit', {
        batch_set: reconciliationRecords,
      });
      setReconciliationResult(response.data);
      toast.success(`Reconciliation complete: ${response.data.audit_result.system_accuracy_percentage} accuracy`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Reconciliation failed');
    } finally {
      setIsLoadingReconciliation(false);
    }
  };

  const generateTestBatch = async () => {
    try {
      const response = await api.post('/reconciliation/generate-test-batch?count=50');
      setReconciliationRecords(response.data.batch_set);
      setReconciliationResult(null);
      toast.success(`Generated ${response.data.count} test records with anomalies`);
    } catch (error) {
      toast.error('Failed to generate test batch');
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (ts: number) => new Date(ts).toLocaleString();
  const getStatusBadge = (status: Transaction['status']) => {
    const badges: Record<string, { class: string; icon: any; label: string }> = {
      PENDING_HUMAN_APPROVAL: { class: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
      RECOVERY_ROUTED_SUCCESS: { class: 'bg-blue-100 text-blue-700', icon: Zap, label: 'Recovery' },
      SUCCESS: { class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Success' },
      APPROVED: { class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Approved' },
      REJECTED: { class: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
      FAILED: { class: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Failed' },
    };
    return badges[status] || { class: 'bg-neutral-100 text-neutral-700', icon: Clock, label: status };
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return t.status === 'PENDING_HUMAN_APPROVAL' || t.status === 'RECOVERY_ROUTED_SUCCESS';
    if (filterStatus === 'completed') return t.status === 'APPROVED' || t.status === 'SUCCESS';
    if (filterStatus === 'rejected') return t.status === 'REJECTED' || t.status === 'FAILED';
    return true;
  });

  const pendingCount = transactions.filter(t => t.status === 'PENDING_HUMAN_APPROVAL' || t.status === 'RECOVERY_ROUTED_SUCCESS').length;
  const historyCount = transactions.filter(t => ['APPROVED', 'REJECTED', 'SUCCESS', 'FAILED'].includes(t.status)).length;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg">Merchant Dashboard</span>
              </Link>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                Human Approval Gate
              </span>
            </div>

            <nav className="flex items-center gap-4">
              <Link href="/agent-catalog" className="text-sm text-neutral-600 hover:text-neutral-950 transition-colors flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Agent Catalog
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 p-1" role="tablist">
            {[
              { id: 'pending', label: 'Pending Approval', icon: Clock, count: pendingCount },
              { id: 'history', label: 'History', icon: Database, count: historyCount },
              { id: 'reconciliation', label: 'Reconciliation', icon: FileText, count: reconciliationRecords.length },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-neutral-950 text-white' 
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                  role="tab"
                  aria-selected={isActive}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'pending' && (
            <PendingApprovalTab
              transactions={filteredTransactions}
              onApprove={handleApprove}
              onReject={handleReject}
              onViewOrder={handleViewOrder}
              copyToClipboard={copyToClipboard}
              getStatusBadge={getStatusBadge}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              transactions={filteredTransactions}
              getStatusBadge={getStatusBadge}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              copyToClipboard={copyToClipboard}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
          )}

          {activeTab === 'reconciliation' && (
            <ReconciliationTab
              records={reconciliationRecords}
              result={reconciliationResult}
              isLoading={isLoadingReconciliation}
              onRun={runReconciliation}
              onGenerate={generateTestBatch}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function PendingApprovalTab({
  transactions,
  onApprove,
  onReject,
  onViewOrder,
  copyToClipboard,
  getStatusBadge,
  formatCurrency,
  formatDate,
}: {
  transactions: Transaction[];
  onApprove: (txn: Transaction) => void;
  onReject: (txn: Transaction) => void;
  onViewOrder: (orderId: string) => void;
  copyToClipboard: (text: string, label: string) => void;
  getStatusBadge: (status: Transaction['status']) => { class: string; icon: any; label: string };
  formatCurrency: (cents: number) => string;
  formatDate: (ts: number) => string;
}) {
  const pendingTxs = transactions.filter(t =>
    t.status === 'PENDING_HUMAN_APPROVAL' || t.status === 'RECOVERY_ROUTED_SUCCESS'
  );

  if (pendingTxs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Pending Approvals</h3>
        <p className="text-neutral-600 mb-6 max-w-md">
          All transactions have been processed. Visit the Agent Catalog to initiate new payments.
        </p>
        <Link href="/agent-catalog" className="bg-neutral-950 text-white px-6 py-3 rounded-full font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2">
          Browse Agent Catalog
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pending Human Approval</h2>
        <span className="text-sm text-neutral-600">{pendingTxs.length} transaction(s) awaiting action</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pendingTxs.map((txn, index) => {
          const badge = getStatusBadge(txn.status);
          const BadgeIcon = badge.icon;
          return (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.06 }}
              className="bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-base mb-1">{txn.product.name}</h3>
                      <p className="text-xs text-neutral-500 font-mono">{txn.product.sku}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-neutral-950">{formatCurrency(txn.amountCents)}</div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
                    <BadgeIcon className="w-3 h-3" />
                    {badge.label}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-5">
                <div className="flex items-center gap-2 text-neutral-600">
                  <CreditCard className="w-4 h-4 text-neutral-400" />
                  <span>Order: <code className="font-mono text-neutral-800">{txn.nexusOrderId || txn.razorpayOrderId || 'N/A'}</code></span>
                </div>
                <div className="flex items-center gap-2 text-neutral-600">
                  <Bot className="w-4 h-4 text-neutral-400" />
                  <span>Buyer: <code className="font-mono text-neutral-800">{txn.buyerToken}</code></span>
                </div>
                <div className="flex items-center gap-2 text-neutral-600">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <span>{formatDate(txn.createdAt)}</span>
                </div>
                {txn.mitigationTarget && (
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm">Routed via: {txn.mitigationTarget}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-100">
                <button
                  onClick={() => onApprove(txn)}
                  className="flex-1 bg-emerald-500 text-white py-2.5 rounded-full font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => onReject(txn)}
                  className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-full font-medium text-sm hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>

              {txn.nexusOrderId && (
                <button
                  onClick={() => onViewOrder(txn.nexusOrderId!)}
                  className="w-full mt-3 text-sm text-neutral-500 hover:text-neutral-700 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View in Razorpay Dashboard
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function HistoryTab({
  transactions,
  getStatusBadge,
  formatCurrency,
  formatDate,
  copyToClipboard,
  filterStatus,
  setFilterStatus,
}: {
  transactions: Transaction[];
  getStatusBadge: (status: Transaction['status']) => { class: string; icon: any; label: string };
  formatCurrency: (cents: number) => string;
  formatDate: (ts: number) => string;
  copyToClipboard: (text: string, label: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}) {
  const historyTxs = transactions.filter(t =>
    ['APPROVED', 'REJECTED', 'SUCCESS', 'FAILED'].includes(t.status)
  ).sort((a, b) => (b.approvedAt || b.rejectedAt || b.createdAt) - (a.approvedAt || a.rejectedAt || a.createdAt));

  if (historyTxs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-6">
          <Database className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
        <p className="text-neutral-600">Approved and rejected transactions will appear here.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Transaction History</h2>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected/Failed</option>
        </select>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-500 text-sm">
              <th className="pb-3 font-medium px-6">Product</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Buyer</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {historyTxs.map((txn, index) => {
              const badge = getStatusBadge(txn.status);
              const BadgeIcon = badge.icon;
              return (
                <motion.tr
                  key={txn.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-sm">{txn.product.name}</p>
                  <p className="text-xs text-neutral-500 font-mono">{txn.product.sku}</p>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-neutral-950 font-semibold">
                    {formatCurrency(txn.amountCents)}
                  </td>
                  <td className="py-4">
                    <code className="text-sm bg-neutral-100 px-2 py-1 rounded font-mono">{txn.buyerToken}</code>
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-4 text-neutral-500 text-sm">
                    {formatDate(txn.approvedAt || txn.rejectedAt || txn.createdAt)}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {txn.nexusOrderId && (
                        <>
                          <button
                            onClick={() => copyToClipboard(txn.nexusOrderId!, 'Order ID')}
                            className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors rounded-lg bg-neutral-100 hover:bg-neutral-200"
                            title="Copy Order ID"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={`https://dashboard.razorpay.com/app/orders/${txn.nexusOrderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors rounded-lg bg-neutral-100 hover:bg-neutral-200"
                            title="View in Razorpay"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ReconciliationTab({
  records,
  result,
  isLoading,
  onRun,
  onGenerate,
}: {
  records: ReconciliationRecord[];
  result: any;
  isLoading: boolean;
  onRun: () => void;
  onGenerate: () => void;
}) {
  const [showRecords, setShowRecords] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Batch Reconciliation Engine</h2>
          <p className="text-neutral-600 mt-1">
            Finance Controller: Audit financial batches with honest exception matrix
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Test Batch
          </button>
          <button
            onClick={onRun}
            disabled={isLoading || records.length === 0}
            className="flex items-center gap-2 bg-neutral-950 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Run Reconciliation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Records Preview */}
      {records.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Financial Line Items ({records.length})
            </h3>
            <button
              onClick={() => setShowRecords(!showRecords)}
              className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
            >
              {showRecords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showRecords ? 'Hide' : 'Show'} Records
            </button>
          </div>

          {showRecords && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-500">
                    <th className="pb-2">Invoice UUID</th>
                    <th className="pb-2">Payment ID</th>
                    <th className="pb-2">Expected (¢)</th>
                    <th className="pb-2">RBI Purpose Code</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {records.slice(0, 10).map((record, index) => (
                    <tr key={record.invoice_uuid} className="hover:bg-neutral-50">
                      <td className="py-2 font-mono text-xs">{record.invoice_uuid}</td>
                      <td className="py-2 font-mono text-xs">{record.target_payment_id}</td>
                      <td className="py-2 font-mono text-neutral-950">{record.expected_cents}</td>
                      <td className="py-2 font-mono text-xs">
                        <span className={record.rbi_regulatory_purpose_code.startsWith('P0') ? 'text-emerald-600' : 'text-red-600'}>
                          {record.rbi_regulatory_purpose_code}
                        </span>
                      </td>
                      <td className="py-2">
                        {record.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'matched' ? 'bg-emerald-100 text-emerald-700' :
                            record.status === 'mismatch' ? 'bg-red-100 text-red-700' :
                            record.status === 'missing' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {record.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > 10 && (
                <p className="text-center text-neutral-500 text-sm py-4">
                  ... and {records.length - 10} more records
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: 'Total Records', value: result.audit_result.total_records_analyzed, icon: Database, color: 'neutral' },
                { title: 'Validated', value: result.audit_result.validated_reconciliations, icon: CheckCircle, color: 'emerald' },
                { title: 'Accuracy', value: result.audit_result.system_accuracy_percentage, icon: DollarSign, color: 'blue' },
                { title: 'Exceptions', value: result.audit_result.honest_exception_registry.length, icon: AlertCircle, color: 'amber' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white border border-neutral-200 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.color === 'neutral' ? 'bg-neutral-100 text-neutral-600' :
                      item.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                      item.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-neutral-600">{item.title}</span>
                  </div>
                  <div className="text-2xl font-semibold text-neutral-950">{item.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Exception Registry */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Honest Exception Registry
              </h3>

              {result.audit_result.honest_exception_registry.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-neutral-500">No exceptions found. All records reconciled perfectly.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {result.audit_result.honest_exception_registry.map((exc: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded font-mono">
                              {exc.error_class}
                            </span>
                            <span className="text-xs text-neutral-500 font-mono">{exc.invoice_uuid}</span>
                          </div>
                          <p className="text-sm text-neutral-600">{exc.narrative}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `reconciliation-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Results
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {records.length === 0 && !result && (
        <div className="bg-white border border-neutral-200 rounded-2xl text-center py-16">
          <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reconciliation Data</h3>
          <p className="text-neutral-600 mb-6 max-w-md mx-auto">
            Generate a test batch to see the Finance Controller in action with deliberate anomalies.
          </p>
          <button
            onClick={onGenerate}
            className="bg-neutral-950 text-white px-6 py-3 rounded-full font-medium hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Test Batch
          </button>
        </div>
      )}
    </motion.div>
  );
}
