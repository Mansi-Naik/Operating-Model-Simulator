/** F1 Step 1 domain values and labels (single source for forms + read-only displays). */
export const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select industry' },
  { value: 'safety_security', label: 'Safety & Security' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'finance_ops', label: 'Finance Operations' },
  { value: 'hr_ops', label: 'HR Operations' },
  { value: 'sales_ops', label: 'Sales Operations' },
  { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'other', label: 'Other' },
];

/** Sub-function picklist per domain (Phase A). "Other" uses free-text instead. */
export const SUB_FUNCTION_OPTIONS_BY_DOMAIN: Record<string, string[]> = {
  safety_security: [
    'Content Moderation',
    'Fraud',
    'AML/KYC',
    'Identity Verification',
    'Risk Operations',
  ],
  customer_service: [
    'Retail Banking',
    'Telecom',
    'E-commerce',
    'Healthcare',
    'Insurance',
    'B2B SaaS',
    'Hospitality',
  ],
  finance_ops: ['AP/AR', 'Reconciliation', 'Treasury', 'Tax', 'Financial Reporting', 'Procurement'],
  hr_ops: ['Recruiting Ops', 'Benefits Admin', 'Payroll', 'Employee Lifecycle', 'L&D Ops'],
  sales_ops: ['Lead Qualification', 'CRM Admin', 'Quote-to-Cash', 'Deal Desk', 'Sales Reporting'],
  supply_chain: ['Order Mgmt', 'Logistics', 'Inventory', 'Procurement', 'Vendor Mgmt'],
};

export function domainLabelFromValue(domain: string | null | undefined): string {
  if (!domain) return '';
  const row = DOMAIN_OPTIONS.find((o) => o.value === domain);
  return row?.label ?? String(domain);
}

export function subFunctionOptionsForDomain(domain: string, currentSub: string): string[] {
  const base = SUB_FUNCTION_OPTIONS_BY_DOMAIN[domain] ?? [];
  const cur = String(currentSub ?? '').trim();
  if (!cur || base.includes(cur)) return base;
  return [cur, ...base];
}
