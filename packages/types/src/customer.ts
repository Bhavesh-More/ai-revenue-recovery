import type { CustomerId, IsoTimestamp, Money, Timestamps } from './common';

export type CustomerType = 'individual' | 'business';

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'voice';

export interface CustomerContact {
  email?: string;
  phone?: string;
  preferredChannel?: CommunicationChannel;
}

export interface CustomerHistory {
  // Lifetime revenue successfully collected.
  lifetimeRevenueMinor: number;
  // Lifetime successful payments.
  successfulPayments: number;
  // Lifetime failed payments.
  failedPayments: number;
  // Tenure in months since first seen.
  tenureMonths: number;
  // Has the customer previously broken a promise?
  hasBrokenPromise: boolean;
  // Total prior recovery cases.
  priorRecoveryCases: number;
}

export interface CustomerRiskSignal {
  // 0..1 — higher = more reliable.
  reliabilityScore: number;
  // 0..1 — estimated probability next recovery attempt succeeds.
  recoveryProbability: number;
  // True if customer opted out of any recovery channel.
  optedOut: boolean;
  // Last communication timestamp, if any.
  lastContactedAt?: IsoTimestamp;
}

export interface Customer extends Timestamps {
  id: CustomerId;
  type: CustomerType;
  // Display name.
  name: string;
  contact: CustomerContact;
  history: CustomerHistory;
  risk: CustomerRiskSignal;
  gstin?: string;
  // Account manager for high-touch customers.
  accountManagerId?: string;
}

// Represents the customer's current exposure to the platform.
export interface CustomerExposure {
  customerId: CustomerId;
  outstandingMinor: number;
  currency: string;
  amount: Money;
}
