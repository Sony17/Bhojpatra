/**
 * Vendor payout account — bank/UPI validation, draft cleaning and masking.
 *
 * Run with `npx tsx --test src/lib/payoutAccount.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanPayoutAccount,
  maskAccountNumber,
  parsePayoutAccount,
  payoutAccountErrors,
} from "./payoutAccount";

const OK = {
  holderName: "Annapurna Caterers",
  accountNumber: "50100123456789",
  ifsc: "HDFC0001234",
  accountType: "Savings",
};

test("nothing is mandatory — empty, UPI-only and bank-only all parse", () => {
  const empty = parsePayoutAccount({});
  assert.ok(empty.ok && empty.value === undefined);
  assert.ok(parsePayoutAccount(undefined).ok);
  const upiOnly = parsePayoutAccount({ upiId: "annapurna@okhdfcbank" });
  assert.ok(upiOnly.ok && upiOnly.value?.upiId === "annapurna@okhdfcbank");
  const bank = parsePayoutAccount(OK);
  assert.ok(bank.ok && bank.value?.upiId === undefined);
  // Account number without a holder / type / IFSC is still accepted.
  assert.ok(parsePayoutAccount({ accountNumber: "50100123456789" }).ok);
});

test("field errors", () => {
  assert.deepEqual(payoutAccountErrors(OK), {});
  assert.deepEqual(payoutAccountErrors({ confirmAccountNumber: "" }), {});
  assert.ok(payoutAccountErrors({ ...OK, ifsc: "HDFC1001234" }).ifsc); // 5th char must be 0
  assert.ok(payoutAccountErrors({ ...OK, accountNumber: "12345678" }).accountNumber);
  assert.ok(payoutAccountErrors({ ...OK, accountType: "NRI" }).accountType);
  assert.ok(payoutAccountErrors({ ...OK, upiId: "no-at-sign" }).upiId);
  assert.ok(payoutAccountErrors({ ...OK, confirmAccountNumber: "50100123456780" }).confirmAccountNumber);
  assert.equal(payoutAccountErrors({ ...OK, confirmAccountNumber: "5010 0123 4567 89" }).confirmAccountNumber, undefined);
});

test("drafts keep partial input, normalised", () => {
  assert.deepEqual(cleanPayoutAccount({ ifsc: "hdfc 0001234", accountNumber: "5010-0123" }), {
    ifsc: "HDFC0001234",
    accountNumber: "50100123",
  });
  assert.equal(cleanPayoutAccount({}), undefined);
  assert.equal(cleanPayoutAccount("junk"), undefined);
});

test("mask keeps the last four", () => {
  assert.equal(maskAccountNumber("50100123456789"), "XXXXXXXX6789");
});
