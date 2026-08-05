import { getStateCodeFromGstin, isInterState, calculateItem, calculateInvoiceTotals, numberToWords } from './gstEngine';
import { BusinessProfile, InvoiceItem } from '../types';

// Simple lightweight assertion helper for standard test execution
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

export const runGstEngineTests = () => {
  console.log('Running GST Engine unit tests...');

  // 1. Test getStateCodeFromGstin
  assertEquals(getStateCodeFromGstin('27AAAAA0000A1Z5'), '27', 'Extract Maharashtra code 27');
  assertEquals(getStateCodeFromGstin('07BBBBB1111B2Z6'), '07', 'Extract Delhi code 07');
  assertEquals(getStateCodeFromGstin('invalid'), '', 'Return empty for invalid string');

  // 2. Test isInterState
  const seller: BusinessProfile = {
    id: '1',
    profile_type: 'GST',
    business_name: 'Tech Corp',
    address: '123 Tech St',
    city: 'Mumbai',
    state: 'Maharashtra',
    state_code: '27',
    gstin: '27AAAAA0000A1Z5',
    phone: '9999999999'
  };

  assertEquals(isInterState(seller, '27'), false, 'Intrastate transaction (same state code 27)');
  assertEquals(isInterState(seller, '07'), true, 'Interstate transaction (Maharashtra to Delhi)');
  assertEquals(isInterState(seller, 'Delhi'), true, 'Interstate transaction by state name');

  // 3. Test calculateItem (Intrastate - CGST + SGST split)
  const intraItem = calculateItem(100, 2, 10, 18, false); // Rate: 100, Qty: 2, Disc: 10%, GST: 18%
  // Taxable: 100 * 0.9 * 2 = 180. Tax (18%): 32.4. CGST: 16.2, SGST: 16.2. Total: 212.4
  assertEquals(intraItem.cgst_amount, 16.2, 'Intrastate CGST amount');
  assertEquals(intraItem.sgst_amount, 16.2, 'Intrastate SGST amount');
  assertEquals(intraItem.igst_amount, 0, 'Intrastate IGST amount zero');
  assertEquals(intraItem.amount, 212.4, 'Intrastate total item amount');

  // 4. Test calculateItem (Interstate - IGST only)
  const interItem = calculateItem(100, 2, 10, 18, true);
  assertEquals(interItem.cgst_amount, 0, 'Interstate CGST amount zero');
  assertEquals(interItem.sgst_amount, 0, 'Interstate SGST amount zero');
  assertEquals(interItem.igst_amount, 32.4, 'Interstate IGST amount');
  assertEquals(interItem.amount, 212.4, 'Interstate total item amount');

  // 5. Test calculateInvoiceTotals
  const items: InvoiceItem[] = [
    { product_name: 'Widget A', quantity: 2, unit: 'PCS', rate: 500, discount_pct: 0, gst_rate: 18 } as InvoiceItem
  ];
  const totals = calculateInvoiceTotals(items, seller, '07');
  assertEquals(totals.subtotal, 1000, 'Invoice subtotal');
  assertEquals(totals.igst_total, 180, 'Invoice IGST total');
  assertEquals(totals.grand_total, 1180, 'Invoice grand total');

  // 6. Test numberToWords
  assertEquals(numberToWords(1180), 'Rupees One Thousand One Hundred and Eighty Only', 'Number to words 1180');
  assertEquals(numberToWords(50.5), 'Rupees Fifty and Fifty Paise Only', 'Number to words 50.50');

  console.log('All GST Engine unit tests passed successfully!');
};

// Auto-run if executed via Node
runGstEngineTests();
