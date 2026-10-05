# Reconcile test 2: answer key

Try the test first, then read this.

## The setup

- **Last bank import and reconcile:** 11 Sep 2026. Nothing has been imported since.
- **Typed by hand since then:** about two thirds of the purchases, plus the trap entries below.
- **Bank file:** `NAB-Everyday-test-2.qif`. It covers 6 Sep to 2 Oct. It overlaps the already-reconciled days, and the last day has a pending "POS" line, the same as your real NAB file.

## The numbers that matter

| | Amount |
|---|---|
| **Bank balance to type into Reconcile** (available balance on 2 Oct, including the pending purchase) | **$14,476.24** |
| Last reconciled, 11 Sep | $13,548.51 |
| NAB Everyday in the app before importing | $11,733.94 |
| **Correct NAB Everyday total once everything is fixed** | **$14,476.24** |
| If you approve everything and delete nothing | $13,642.54 (Zero Line is $833.70 under) |
| **NAB Savings, correct** | **$11,000.00** (the app shows $10,938.80 because of trap W) |

The $833.70 is made up of the nine typed entries that are left over plus the $200 hotel hold (P2). Fixing those leaves it exact.

## The app handles these on its own

| | Trap | What you'll see | Do |
|---|---|---|---|
| Overlap | The file starts 6 Sep, inside the period you already reconciled | Already-imported rows are marked "Already imported" and skipped | Nothing |
| F | Chemist $18.95: imported while pending ("POS 10/09…"), now cleared ("V1234 10/09…") | Description update (↻) | Approve |
| K | Woolworths $23.65: "POS 11/09 WOOLWORTHS/KING ST & CR   NEWTOWN" cleared as "…& CRNEWTOWN" (the suburb glued on, as in your real NAB file) | Description update (↻) | Approve |
| **P1 (new)** | Charcoal Chicken: **$80.00 pending, reconciled, cleared at $88.00 with a tip** | Description update (↻) showing "The amount changed by $8.00" | Approve. The total moves $8.00 |
| A | Two Ampol $65.00 fills on 15 Sep at pumps 4471 and 4472. You typed one | One matches your entry, the other comes in new. Not flagged as a double once approved | Approve both |
| C | Three Cafe XO $5.50 coffees on 24 Sep. You typed two | 2 match, 1 new | Approve all three |
| G | $500 transfer to savings on 25 Sep, typed as a transfer | Matches | Approve |
| H | Woolworths $172.85 on 22 Sep, typed as a split | Matches and keeps the split | Approve |
| I | Account fee $0.85 and interest $0.12 | New | Categorise |
| J | Thai Pothong bought 30 Sep, posted 1 Oct | Matches, dated 30 Sep | Approve |
| **U (new)** | Woolworths $64.35 on 2 Oct is still **pending** in the file. You typed it | Matches the pending line. Next import it will come back as a description update | Approve |
| **R (new)** | JB Hi-Fi $59.99: charged, **reversed (+$59.99), then charged again**. You typed it once | Your entry matches one charge; the reversal and the second charge come in new | Keep all three. Overall that's $59.99 once. **Don't delete the second charge as a "double"** |
| (no code) | Bills and purchases you never typed (pay on 17 Sep, AAMI, Aussie Broadband, some shopping) | New | Categorise and approve |

## Traps where the app gets it wrong or needs you

| | Trap | What the app does | What you should do |
|---|---|---|---|
| **P2 (new)** | **$200 hotel hold** (Quest Apartments, "POS 09/09…") was imported and reconciled while pending. The hotel released it, so it **never appears again** | **Fixed on 3 Oct:** the import preview now lists it under "No longer in the bank file", ticked to be removed. Before the fix, it stayed and made Zero Line $200 under | Leave it ticked and import. If you imported before the fix, close the reconcile bar (×), search "Quest" and delete it |
| **X (new)** | Target $20 and Kmart $20, same day (21 Sep), both typed by you | **Crossed.** The bank's Kmart line is matched to your Target entry and the bank's Target line to your Kmart entry. The totals are right but the payees, categories and notes are swapped | Split both with the broken chain, then match each to the right one (or fix the payee and category) |
| B | Bunnings $45 (26 Sep) and Coles $45 (27 Sep). You typed Bunnings as $54 by mistake | **Wrong match.** The bank's Bunnings is matched to your Coles entry, and the bank's Coles comes in new | Split them, delete your $54 Bunnings, and delete your Coles once the bank's Coles is categorised |
| **S (new)** | Petbarn $35 typed as **money in** (+$35) | Doesn't match. The bank's −$35 comes in new and your +$35 is left over | Delete your +$35 |
| **Y (new)** | Mitre 10 $38.70 typed with the **wrong year (2025)** | Doesn't match (a year apart). The bank's comes in new; yours sits in Sept 2025 | Delete yours. It still counts in the account total |
| **O (new)** | Origin Energy $412.60 typed on the due date (20 Sep); the bank took it **7 days later** | Doesn't match (the window is 5 days). Doubled | Delete yours |
| M | Uniqlo refund +$39.95 typed 6 days before the bank | Doesn't match. Doubled | Delete yours |
| E | Officeworks $23.10 on 29 Sep, but the description contains "12/09" | Dated **12 Sep** from the description, so it doesn't match your 29 Sep entry. Doubled | Delete yours, and fix the bank row's date if you like |
| D | Aldi $42.60 typed twice | One matches, the other is left over | Delete the extra |
| **W (new)** | Coles $61.20 typed into **NAB Savings** instead of Everyday | Everyday gets the bank's Coles as new. **Savings is silently $61.20 short** | Delete it from Savings, or move it to Everyday and delete the new one |
| L | "Grandma birthday" $50 paid in cash, recorded in the bank account | Never matches | Delete it, or move it to a cash account |
| N | Woolworths $87.65 typed today (3 Oct), not in the file yet | Never matches | Delete it (or leave it for the next import, but then reconcile won't balance today) |

## To start again

In the test copy, go to Settings → Restore from backup and choose `mock-budget-2-backup.json`.
