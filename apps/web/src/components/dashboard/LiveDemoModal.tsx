'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { executeLiveDemo, approveLiveDemo, type LiveDemoResult } from '../../lib/api';

export interface LiveDemoModalProps {
  open: boolean;
  onClose: () => void;
}

type DirectionKey =
  | '01_payment_degradation'
  | '02_checkout_dropoff'
  | '03_failed_subscription'
  | '04_b2b_receivables'
  | '05_mandate_retry'
  | '06_hinglish_voice'
  | '07_promise_to_pay';

interface DirectionOption {
  key: DirectionKey;
  label: string;
  code: string;
  icon: string;
  color: string;
  description: string;
  defaultAmount: number;
}

const DIRECTIONS: DirectionOption[] = [
  {
    key: '01_payment_degradation',
    label: 'Payment Degradation',
    code: 'Direction 01',
    icon: 'lucide:alert-triangle',
    color: '#3B82F6',
    description: 'Bank downtime or gateway timeouts requiring smart route switching.',
    defaultAmount: 4999,
  },
  {
    key: '02_checkout_dropoff',
    label: 'Checkout Drop-off',
    code: 'Direction 02',
    icon: 'lucide:shopping-cart',
    color: '#8B5CF6',
    description: 'Cart abandonment during payment selection with intent recovery link.',
    defaultAmount: 2499,
  },
  {
    key: '03_failed_subscription',
    label: 'Failed Subscription',
    code: 'Direction 03',
    icon: 'lucide:refresh-cw',
    color: '#10B981',
    description: 'Recurring billing and expired card dunning within grace period.',
    defaultAmount: 1499,
  },
  {
    key: '04_b2b_receivables',
    label: 'B2B Receivables',
    code: 'Direction 04',
    icon: 'lucide:building',
    color: '#F59E0B',
    description: 'Invoice overdue follow-ups with corporate payment terms and ledger links.',
    defaultAmount: 85000,
  },
  {
    key: '05_mandate_retry',
    label: 'Mandate Retry',
    code: 'Direction 05',
    icon: 'lucide:repeat',
    color: '#EC4899',
    description: 'Auto-debit recurring mandate failure sequencing and window retries.',
    defaultAmount: 3500,
  },
  {
    key: '06_hinglish_voice',
    label: 'Hinglish Voice',
    code: 'Direction 06',
    icon: 'lucide:phone-call',
    color: '#6366F1',
    description: 'Conversational voice call follow-up and settlement link via email.',
    defaultAmount: 6200,
  },
  {
    key: '07_promise_to_pay',
    label: 'Promise-to-Pay',
    code: 'Direction 07',
    icon: 'lucide:calendar-clock',
    color: '#14B8A6',
    description: 'Customer payment commitments logged with reminder schedules.',
    defaultAmount: 12500,
  },
];

type ModalStep = 'FORM' | 'CONFIRM' | 'PROCESSING' | 'APPROVAL_REQUIRED' | 'COMPLETED' | 'ERROR';

export function LiveDemoModal({ open, onClose }: LiveDemoModalProps) {
  const router = useRouter();

  // Form State
  const [direction, setDirection] = useState<DirectionKey>('03_failed_subscription');
  const [customerName, setCustomerName] = useState('Rahul Sharma');
  const [customerEmail, setCustomerEmail] = useState('');
  const [companyName, setCompanyName] = useState('Sharma Tech Solutions');
  const [phone, setPhone] = useState('+919876543210');
  const [amount, setAmount] = useState<number>(1499);

  // Direction Specific Form State
  const [dirFields, setDirFields] = useState<Record<string, any>>({
    paymentId: 'pay_demo_101',
    gateway: 'HDFC',
    errorCode: 'GATEWAY_TIMEOUT',
    failureReason: 'bank_decline',
    orderReference: 'ord_demo_202',
    checkoutStage: 'payment_method',
    subscriptionId: 'sub_demo_303',
    renewalDate: new Date().toISOString().slice(0, 10),
    gracePeriodDays: 5,
    invoiceNumber: 'INV-2026-089',
    dueDate: new Date().toISOString().slice(0, 10),
    paymentTerms: 'Net 30',
    mandateId: 'man_demo_505',
    retryWindow: '09:00 - 11:00 AM',
    transcript: 'Customer: Kal subah tak transfer kar dunga, email par link bhej dijiye.',
    promisedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  });

  // Flow State
  const [step, setStep] = useState<ModalStep>('FORM');
  const [processingMsg, setProcessingMsg] = useState('Initializing Live Demo case...');
  const [result, setResult] = useState<LiveDemoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  if (!open) return null;

  const handleDirectionChange = (newDir: DirectionKey) => {
    setDirection(newDir);
    const opt = DIRECTIONS.find((d) => d.key === newDir);
    if (opt) setAmount(opt.defaultAmount);
  };

  const handleFieldChange = (key: string, value: any) => {
    setDirFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartRun = () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      alert('Please enter a valid customer email address.');
      return;
    }
    setStep('CONFIRM');
  };

  const handleExecute = async () => {
    setStep('PROCESSING');
    setProcessingMsg('Creating ONE recovery case in Postgres...');
    setErrorMsg(null);

    try {
      setTimeout(() => {
        setProcessingMsg('Case Ingested. Running AI Decision Reasoner & Policy...');
      }, 700);

      setTimeout(() => {
        setProcessingMsg('Executing live recovery action & dispatching email...');
      }, 1500);

      const res = await executeLiveDemo({
        direction,
        customer: {
          name: customerName,
          email: customerEmail,
          phone,
          companyName,
        },
        amount,
        directionData: dirFields,
      });

      setResult(res);

      if (res.approvalRequired || res.status === 'escalated') {
        setStep('APPROVAL_REQUIRED');
      } else {
        setStep('COMPLETED');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('recovery:data-updated'));
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute Live Demo');
      setStep('ERROR');
    }
  };

  const handleApprove = async () => {
    if (!result?.case?.id) return;
    setApproving(true);
    try {
      const approvedRes = await approveLiveDemo(result.case.id, 'supervisor');
      setResult(approvedRes);
      setStep('COMPLETED');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recovery:data-updated'));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve case');
    } finally {
      setApproving(false);
    }
  };

  const handleViewCase = () => {
    if (result?.case?.id) {
      onClose();
      router.push(`/recovery-cases/${result.case.id}`);
    }
  };

  const currentOption = DIRECTIONS.find((d) => d.key === direction) || DIRECTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center justify-between bg-[#F8F9FA] dark:bg-[#131416]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center">
              <Icon icon="lucide:play-circle" className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                  LIVE DEMO MODE
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20">
                  REAL PIPELINE
                </span>
              </div>
              <p className="text-xs text-[#8C8C8C] dark:text-[#9CA3AF]">
                Execute exactly ONE live recovery case with real email dispatch & full AI reasoning.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C8C8C] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Icon icon="lucide:x" className="text-lg" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: FORM */}
          {step === 'FORM' && (
            <div className="space-y-6">
              {/* Direction Selector */}
              <div>
                <label className="block text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider mb-2">
                  1. Select Recovery Direction
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DIRECTIONS.map((dir) => {
                    const isSelected = direction === dir.key;
                    return (
                      <button
                        key={dir.key}
                        type="button"
                        onClick={() => handleDirectionChange(dir.key)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#2563EB] bg-[#2563EB]/5 shadow-xs ring-1 ring-[#2563EB]'
                            : 'border-[#E5E7EB] dark:border-[#2A2B2D] hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon icon={dir.icon} style={{ color: dir.color }} className="text-lg" />
                          <span className="text-[10px] font-semibold text-[#8C8C8C] dark:text-[#6B7280]">
                            {dir.code}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[#1A1A1A] dark:text-[#F9FAFB]'
                          }`}
                        >
                          {dir.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280] mt-2 italic">
                  {currentOption.description}
                </p>
              </div>

              {/* Customer Information */}
              <div className="border-t border-[#E5E7EB] dark:border-[#2A2B2D] pt-4">
                <label className="block text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider mb-3">
                  2. Customer Information (Recipient)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                      Customer Email (Receives Real Email) <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. your-email@gmail.com"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                      Recovery Amount (₹) <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#2563EB]"
                    />
                    {amount >= 50000 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-1">
                        ⚡ Amounts ≥ ₹50,000 trigger supervisor approval policy.{amount > 500000 ? " Razorpay links are capped at ₹5,00,000 per link." : ""}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                      Company Name (Optional)
                    </span>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Direction Specific Fields */}
              <div className="border-t border-[#E5E7EB] dark:border-[#2A2B2D] pt-4">
                <label className="block text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider mb-3">
                  3. Direction-Specific Fields ({currentOption.code})
                </label>

                {direction === '01_payment_degradation' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Gateway</span>
                      <input
                        type="text"
                        value={dirFields.gateway || ''}
                        onChange={(e) => handleFieldChange('gateway', e.target.value)}
                        placeholder="HDFC / ICICI"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Error Code</span>
                      <input
                        type="text"
                        value={dirFields.errorCode || ''}
                        onChange={(e) => handleFieldChange('errorCode', e.target.value)}
                        placeholder="GATEWAY_TIMEOUT"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Failure Reason</span>
                      <input
                        type="text"
                        value={dirFields.failureReason || ''}
                        onChange={(e) => handleFieldChange('failureReason', e.target.value)}
                        placeholder="bank_decline"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                  </div>
                )}

                {direction === '02_checkout_dropoff' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Order Ref</span>
                      <input
                        type="text"
                        value={dirFields.orderReference || ''}
                        onChange={(e) => handleFieldChange('orderReference', e.target.value)}
                        placeholder="ord_cart_883"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Checkout Stage</span>
                      <input
                        type="text"
                        value={dirFields.checkoutStage || ''}
                        onChange={(e) => handleFieldChange('checkoutStage', e.target.value)}
                        placeholder="payment_method"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                  </div>
                )}

                {direction === '03_failed_subscription' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Subscription ID</span>
                      <input
                        type="text"
                        value={dirFields.subscriptionId || ''}
                        onChange={(e) => handleFieldChange('subscriptionId', e.target.value)}
                        placeholder="sub_monthly_pro"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Grace Period (Days)</span>
                      <input
                        type="number"
                        value={dirFields.gracePeriodDays || 5}
                        onChange={(e) => handleFieldChange('gracePeriodDays', Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Failure Reason</span>
                      <input
                        type="text"
                        value={dirFields.failureReason || ''}
                        onChange={(e) => handleFieldChange('failureReason', e.target.value)}
                        placeholder="bank_decline"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                  </div>
                )}

                {direction === '04_b2b_receivables' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Invoice Number</span>
                      <input
                        type="text"
                        value={dirFields.invoiceNumber || ''}
                        onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                        placeholder="INV-2026-001"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Due Date</span>
                      <input
                        type="date"
                        value={dirFields.dueDate || ''}
                        onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Payment Terms</span>
                      <input
                        type="text"
                        value={dirFields.paymentTerms || 'Net 30'}
                        onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                  </div>
                )}

                {direction === '05_mandate_retry' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Mandate ID</span>
                      <input
                        type="text"
                        value={dirFields.mandateId || ''}
                        onChange={(e) => handleFieldChange('mandateId', e.target.value)}
                        placeholder="man_upi_992"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Retry Window</span>
                      <input
                        type="text"
                        value={dirFields.retryWindow || '09:00 - 11:00 AM'}
                        onChange={(e) => handleFieldChange('retryWindow', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                  </div>
                )}

                {direction === '06_hinglish_voice' && (
                  <div>
                    <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">
                      Call Transcript / Context (Used by AI Reasoner)
                    </span>
                    <textarea
                      rows={2}
                      value={dirFields.transcript || ''}
                      onChange={(e) => handleFieldChange('transcript', e.target.value)}
                      placeholder="Customer: Haan kal subah tak payment clear ho jayegi..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                    />
                  </div>
                )}

                {direction === '07_promise_to_pay' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Promised Payment Date</span>
                      <input
                        type="date"
                        value={dirFields.promisedDate || ''}
                        onChange={(e) => handleFieldChange('promisedDate', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#6B7280] mb-1">Promise Source</span>
                      <input
                        type="text"
                        value={dirFields.source || 'customer_portal'}
                        onChange={(e) => handleFieldChange('source', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-[#1A1A1A] dark:text-[#F9FAFB]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: CONFIRMATION DIALOG */}
          {step === 'CONFIRM' && (
            <div className="p-8 text-center space-y-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
                <Icon icon="lucide:mail" className="text-2xl" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                  LIVE DEMO CONFIRMATION
                </h3>
                <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF] max-w-md mx-auto">
                  This will create <strong>ONE</strong> recovery case in the database and may send a real email to:
                </p>
                <div className="inline-block px-4 py-2 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#2563EB] dark:text-[#60A5FA] font-bold text-sm font-mono">
                  {customerEmail}
                </div>
                <p className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280]">
                  Payment will use <strong className="text-[#2563EB]">Razorpay TEST MODE</strong>. No real money will be charged.
                </p>
                <p className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280]">
                  The case will run through the full AI Reasoning &amp; Policy enforcement pipeline.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === 'PROCESSING' && (
            <div className="p-12 text-center space-y-4">
              <Icon icon="lucide:loader-2" className="text-4xl text-[#2563EB] animate-spin mx-auto" />
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                Running Live Demo Pipeline
              </h3>
              <p className="text-xs text-[#8C8C8C] dark:text-[#9CA3AF] font-mono">
                {processingMsg}
              </p>
            </div>
          )}

          {/* STEP 4: APPROVAL REQUIRED */}
          {step === 'APPROVAL_REQUIRED' && result && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-start gap-3">
                <Icon icon="lucide:shield-alert" className="text-xl text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#F59E0B]">
                    POLICY ESCALATION: HUMAN APPROVAL REQUIRED
                  </h4>
                  <p className="text-xs text-[#4A4A4A] dark:text-[#D1D5DB] mt-1">
                    {result.decision?.rootCause || 'Policy rule requires supervisor approval for this recovery action.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C]">Proposed Action:</span>
                  <span className="font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {result.decision?.recommendation?.actionType || 'send_email'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C]">Target Recipient:</span>
                  <span className="font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {customerEmail}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C]">At Risk Amount:</span>
                  <span className="font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                    ₹{amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg text-[11px]">
                Note: In compliance with authoritative rules, approving authorizes execution and dispatches the recovery email. It does not mark the case recovered.
              </div>
            </div>
          )}

          {/* STEP 5: COMPLETED RESULT */}
          {step === 'COMPLETED' && result && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center gap-3">
                <Icon icon="lucide:check-circle" className="text-2xl text-[#10B981] shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-[#10B981]">
                    LIVE DEMO COMPLETED SUCCESSFULLY
                  </h4>
                  <p className="text-xs text-[#4A4A4A] dark:text-[#D1D5DB]">
                    Exactly 1 recovery case created and processed through AI Reasoner &amp; Action Executor.
                  </p>
                </div>
              </div>

              {/* Case Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D]">
                  <span className="text-[10px] text-[#8C8C8C] uppercase font-bold block">Case ID</span>
                  <span className="text-xs font-bold text-[#3B82F6] truncate block">{result.case.id}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D]">
                  <span className="text-[10px] text-[#8C8C8C] uppercase font-bold block">Current State</span>
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB] uppercase block">
                    {result.status}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D]">
                  <span className="text-[10px] text-[#8C8C8C] uppercase font-bold block">Action Executed</span>
                  <span className="text-xs font-bold text-[#10B981] block">
                    {result.emailSent ? 'Recovery Email' : 'Action Logged'}
                  </span>
                </div>
              </div>

              {/* Payment Link & Status */}
              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C]">Payment:</span>
                  <span className="font-bold text-[#2563EB] flex items-center gap-1">
                    <Icon icon="lucide:credit-card" className="text-xs" />
                    Razorpay TEST MODE
                  </span>
                </div>
                {result.paymentLink && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#8C8C8C]">Payment Link:</span>
                    <span className="font-bold text-[#10B981] flex items-center gap-1 font-mono text-[11px]">
                      <Icon icon="lucide:check" className="text-xs" />
                      {result.paymentLink.id}
                    </span>
                  </div>
                )}
                {result.paymentLink?.shortUrl && (
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center justify-between">
                    <span className="text-[#8C8C8C]">Live Razorpay Checkout:</span>
                    <a
                      href={result.paymentLink.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Open Payment Link</span>
                      <Icon icon="lucide:external-link" className="text-xs" />
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C]">Status:</span>
                  <span className="font-bold text-[#F59E0B] flex items-center gap-1">
                    <Icon icon="lucide:clock" className="text-xs" />
                    Customer Action Required
                  </span>
                </div>
              </div>

              {/* AI & Delivery Details */}
              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D] space-y-2 text-xs">
                <div>
                  <span className="text-[#8C8C8C] text-[11px] font-bold uppercase block mb-0.5">
                    AI Decision Summary:
                  </span>
                  <p className="text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {result.decision?.recommendation?.rationale || result.case.latestDecisionSummary}
                  </p>
                </div>

                {result.emailResult && (
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center justify-between">
                    <span className="text-[#8C8C8C]">Email Status:</span>
                    <span className="font-bold text-[#10B981] flex items-center gap-1">
                      <Icon icon="lucide:check" className="text-xs" />
                      Accepted by Resend {result.emailResult.messageId ? `(${result.emailResult.messageId.slice(0, 8)}...)` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: ERROR */}
          {step === 'ERROR' && (
            <div className="p-8 text-center space-y-4">
              <Icon icon="lucide:alert-circle" className="text-4xl text-[#EF4444] mx-auto" />
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                Live Demo Execution Failed
              </h3>
              <p className="text-xs text-[#EF4444] font-mono max-w-md mx-auto">
                {errorMsg}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E7EB] dark:border-[#2A2B2D] bg-[#F8F9FA] dark:bg-[#131416] flex items-center justify-between">
          {step === 'FORM' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRun}
                className="px-5 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-[#1D4ED8] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Icon icon="lucide:play" className="text-sm" />
                <span>Next: Review &amp; Run</span>
              </button>
            </>
          )}

          {step === 'CONFIRM' && (
            <>
              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="px-4 py-2 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="px-6 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-[#1D4ED8] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Icon icon="lucide:zap" className="text-sm" />
                <span>RUN LIVE DEMO</span>
              </button>
            </>
          )}

          {step === 'APPROVAL_REQUIRED' && (
            <>
              <button
                type="button"
                onClick={handleViewCase}
                className="px-4 py-2 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                View in Approvals
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="px-5 py-2 bg-[#00B074] text-white rounded-lg text-xs font-bold hover:bg-[#009663] transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Icon icon={approving ? 'lucide:loader-2' : 'lucide:check'} className={`text-sm ${approving ? 'animate-spin' : ''}`} />
                <span>{approving ? 'Authorizing...' : 'Authorize Action'}</span>
              </button>
            </>
          )}

          {step === 'COMPLETED' && (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep('FORM');
                  setResult(null);
                }}
                className="px-4 py-2 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Run Another Demo
              </button>
              <div className="flex items-center gap-2">
                {result?.paymentLink?.shortUrl && (
                  <a
                    href={result.paymentLink.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-[#1D4ED8] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Open Razorpay Checkout</span>
                    <Icon icon="lucide:external-link" className="text-sm" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleViewCase}
                  className="px-6 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Icon icon="lucide:arrow-right" className="text-sm" />
                  <span>VIEW RECOVERY CASE</span>
                </button>
              </div>
            </div>
          )}

          {step === 'ERROR' && (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="px-5 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-[#1D4ED8] cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
