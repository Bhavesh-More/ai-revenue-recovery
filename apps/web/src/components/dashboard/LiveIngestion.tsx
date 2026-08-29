'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import {
  EVENT_SOURCES,
  FAILURE_REASONS,
  RECOVERY_DIRECTIONS,
  LiveIngestionEvent,
} from '../../mocks/ingestion';

export interface LiveIngestionProps {
  onIngestLiveCase: (event: LiveIngestionEvent) => void;
  isIngesting?: boolean;
}

export function LiveIngestion({
  onIngestLiveCase,
  isIngesting = false,
}: LiveIngestionProps) {
  const [source, setSource] = useState<string>(EVENT_SOURCES[0]);
  const [customerId, setCustomerId] = useState('cust_10292');
  const [customerName, setCustomerName] = useState('Vikram Malhotra');
  const [paymentId, setPaymentId] = useState('pay_78292');
  const [direction, setDirection] = useState<string>(RECOVERY_DIRECTIONS[0]);
  const [amount, setAmount] = useState(4999);
  const [failureReason, setFailureReason] = useState<string>(FAILURE_REASONS[0]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isIngesting) return;

    const eventId = `evt_${Date.now().toString().slice(-6)}`;
    const event: LiveIngestionEvent = {
      eventId,
      source,
      customerId,
      customerName,
      paymentId,
      direction,
      amount: Math.max(1, amount),
      failureReason,
      occurredAt: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    };

    onIngestLiveCase(event);

    const createdCaseId = `RC-${Math.floor(10290 + Math.random() * 100)}`;
    setSuccessMessage(`Event ingested successfully! Recovery case ${createdCaseId} created.`);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-start gap-4">
        <div>
          <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
            <Icon icon="lucide:zap" className="text-[#3B82F6] text-base" />
            Live Ingestion
          </h2>
          <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280] mt-1">
            Create a recovery case from a live payment event.
          </p>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 shrink-0">
          One Event → Case
        </span>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mx-6 mt-4 p-3 bg-[#00B074]/10 border border-[#00B074]/30 rounded-lg flex items-center gap-2 text-xs font-bold text-[#00B074] transition-all">
          <Icon icon="lucide:check-circle-2" className="text-base shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-4">
        {/* Event Source */}
        <div>
          <label
            htmlFor="event-source"
            className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
          >
            Event Source
          </label>
          <select
            id="event-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {EVENT_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* Customer ID & Customer Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="customer-id"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Customer ID
            </label>
            <input
              id="customer-id"
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="cust_..."
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="customer-name"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Customer Name
            </label>
            <input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full Name"
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors"
            />
          </div>
        </div>

        {/* Payment ID & Direction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="payment-id"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Payment ID
            </label>
            <input
              id="payment-id"
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="pay_..."
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="live-direction"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Recovery Direction
            </label>
            <select
              id="live-direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
            >
              {RECOVERY_DIRECTIONS.map((dir) => (
                <option key={dir} value={dir}>
                  {dir}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Failure Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="live-amount"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] font-mono text-sm">
                ₹
              </span>
              <input
                id="live-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-8 pr-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="failure-reason"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Failure Reason
            </label>
            <select
              id="failure-reason"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
            >
              {FAILURE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit CTA */}
        <div className="mt-auto pt-2">
          <button
            type="submit"
            disabled={isIngesting}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            {isIngesting ? (
              <>
                <Icon icon="lucide:loader-2" className="text-lg animate-spin" />
                <span>Ingesting Event...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:arrow-down-to-dot" className="text-lg" />
                <span>Ingest &amp; Create Case</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
