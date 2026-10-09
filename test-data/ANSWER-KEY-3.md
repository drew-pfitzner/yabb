# Reconcile test 3: answer key

Try the test first, then read this. Made with `.generator-3.js` (run `node test-data/.generator-3.js`).

## The setup

- **Today:** 9 Oct 2026. **Last reconciled:** 25 Sep 2026 at $14,463.99 (NAB Everyday).
- **Bank file:** `NAB-Everyday-test-3.csv`, NAB's CSV layout (with a Balance column), posted 20 Sep to 8 Oct, newest first. The top line is a pending fuel hold.
- About two thirds of the everyday purchases since 25 Sep were typed by hand, plus the trap entries below.

## The numbers

| | Amount |
|---|---|
| **Bank balance to type into Reconcile** (8 Oct, including the pending fuel hold) | **$13,857.22** |
| NAB Everyday in the app before importing | $13,981.37 |
| Before 9 Oct, approving everything and deleting nothing | $15,538.92, out by $1,681.70 (the mistyped Rebel Sport isn't counted: it's dated after 8 Oct) |
| Correct NAB Everyday once fixed | $13,857.22, the same as the bank |
| **NAB Savings, correct** | **$11,550.00** (the app shows $11,500.00 because of T9) |

## Since 9 Oct: what the import does

The import now matches the "probably the same" cases for you to approve in Needs review (each says what was different, and Unmatch puts it back exactly): T1 (Amazon in parts), T2 (Bunnings joined, split), T3, T6, T8, T10 (bank amount used), T4 (same amount and day), T9 (transfer becomes $550, Savings follows), T11 (bank date used), T7 (bank amount put back), T12 (reconciled hold removed, ticked). Straight after importing, reconcile says **Matches ✓**. T5 (crossed categories) and the fee in T10 still need you.

## Before 9 Oct: what the app did with each trap

Checked by running the app's own matching code on the file. Since 9 Oct, the "Why it doesn't match" panel after importing finds T1–T4, T6–T12 and **Fix all** leaves it matching; T5 (crossed categories) doesn't change the total, so it isn't shown.

| | Trap | What the app does | What you should do |
|---|---|---|---|
| T1 | **One order, two charges.** Typed Amazon $85 once; the bank charged $50 (27 Sep) and $35 (28 Sep) | Both come in new. Your $85 is left over | Delete your $85 (copy its note to the new ones) |
| T2 | **Two entries, one charge.** Typed Bunnings $12.40 and $27.60; the bank took $40.00 in one go | The $40 comes in new. Both of yours are left over | Delete your two, or split the bank's $40 the same way |
| T3 | **Cents typo.** Aldi $42.60 typed as $42.06 | Doesn't match. Doubled | Delete yours |
| T4 | **A date in the note.** Brownes Bakery $48 on 3 Oct, note "Cake for Mia's party 12/10" | The 12/10 in the note makes the app think it's a different day's purchase. Doubled, even though the shop and amount agree | Delete yours (keep the note on the bank's) |
| T5 | **Same amount, no shop names.** "Dinner with Jess" $60 and "School shoes" $60, both typed on 1 Oct. The bank: The Grounds 30 Sep, Platypus Shoes 1 Oct | **Crossed.** Platypus Shoes is matched to "Dinner with Jess" (Eating out) and The Grounds to "School shoes" (Kids). Totals right, categories swapped | Fix the payee and category on both |
| T6 | **Fuel hold.** Pending "POS 08/10 AMPOL" $150 (a pre-authorisation); the pump took $71.35, which you typed | The $150 comes in new; your $71.35 is left over | Delete your $71.35 to match today's bank balance. The hold should become $71.35 on the next import |
| T7 | **A reconciled entry got edited.** Chemist Warehouse 22 Sep, $28.95 at the bank, reconciled, later changed to $25.89 in the app | The bank line is skipped as already imported, so nothing in the import shows it. The app is $3.06 over with no clue why | Find it and put it back to $28.95. The bank-check tool (bank file with balances) may point at it |
| T8 | **Pay changed.** Typed $2,850.00 on 1 Oct; the bank paid $2,912.40 | Doesn't match. Pay counted twice (+$2,850) | Delete yours |
| T9 | **Transfer typo.** Typed a $500 transfer to savings on 5 Oct; actually $550 | The bank's $550 comes in new (as spending, not a transfer). Your $500 transfer is left over, so Savings is $50 short too | Make the bank's $550 a transfer to Savings, delete yours |
| T10 | **Overseas purchase.** Typed Etsy $45; the bank shows $44.12 plus a $1.32 international fee | Both come in new; yours is left over | Delete yours, categorise the fee |
| T11 | **Wrong month.** Rebel Sport $89.95 on 1 Oct typed as 1 **Nov** | Doesn't match (a month apart). Doubled, and sits in November | Delete yours |
| T12 | **Hire-car hold that changed.** A $250 Europcar hold ("POS 23/09…") was imported and **reconciled** on 25 Sep. The final bill was $187.40, dated 29 Sep | The final bill comes in new (more than 3 days after the hold, so not seen as the same). The hold isn't offered for removal because it's reconciled. **$250 too much spent** | Delete the $250 hold |
| T13 | **Comma in a description.** "DAN MURPHY'S, NEWTOWN" (quoted in the CSV) | Reads fine | Nothing |

Also in the file: overlap with the reconciled days (skipped as already imported), ordinary purchases you typed (matched), some you didn't (new, categorised from past choices).
