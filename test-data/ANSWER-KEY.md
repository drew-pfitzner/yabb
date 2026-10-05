# Reconcile test: answer key

Try the test first, then read this.

## The numbers that matter (NAB Everyday)

| | Amount |
|---|---|
| **Bank balance on 1 Oct 2026: type this into Reconcile** | **$11,644.69** |
| Last reconciled, 11 Sep 2026 | $10,596.02 |
| **Correct result: total in Zero Line** | **$11,644.69** |
| If you approve everything the app suggests and delete nothing | $11,556.29 (Zero Line $88.40 lower than the bank) |

If your test copy still has the Woolworths −$87.65 on 2 Oct, it isn't in the bank file, so delete it. Newer copies of the mock don't include it.

NAB Savings should end at $11,000.00. The 25 Sep transfer is the only thing not cleared there, and there is no bank file for savings.

## Where the traps are

The app does the right thing with these:

| | Trap | What should happen |
|---|---|---|
| C | Three identical $5.50 Cafe XO coffees on 24 Sep. You typed in two. | 2 match, 1 new |
| F | Chemist −$18.95 on 10 Sep was reconciled while still "POS …". The bank now says "V1234 …". | Shown as a description update. Approve it. It stays reconciled. |
| G | $500 transfer to savings on 25 Sep, entered as a transfer | Matches |
| H | Woolworths −$172.85 on 22 Sep, entered as a split (groceries and health) | Matches and keeps the split |
| I | Account fee −$0.85 and interest +$0.12 that nobody typed in | New, and they need categories |
| J | Thai Pothong bought 30 Sep, posted 1 Oct | Matches, dated 30 Sep |
| (no code) | Uniqlo entered a day late (20 Sep instead of 19 Sep) | Matches |
| (no code) | Home loan on 1 Oct and a few purchases nobody typed in | New |
| N | Woolworths −$87.65 on 2 Oct (older copies only), not in the bank file | Delete it |

The app gets these wrong, or needs you to catch them:

| | Trap | What the app does | What you should do |
|---|---|---|---|
| A | Two −$65.00 Ampol fills on 15 Sep at different pumps (…4471 was imported earlier, …4472 is new) | **Fixed on 3 Oct.** Now adds pump 4472 as a new transaction. (Before the fix it was wrongly called a "description update". If you imported before the fix, choose "Different, keep both".) | Nothing |
| B | Bunnings −$45.00 (26 Sep) and Coles −$45.00 (27 Sep). You typed Bunnings as −$54.00 by mistake. | **Wrong.** Matches the bank's Bunnings to your **Coles** entry, then adds the bank's Coles as new. | Unmatch, end with one cleared Bunnings −$45 and one cleared Coles −$45, and delete your −$54 entry |
| K | Woolworths −$23.65 on 19 Sep, imported earlier as pending "POS 19/09 WOOLWORTHS/KING ST & CR   NEWTOWN". The bank now writes "V1234 19/09 WOOLWORTHS/KING ST & CRNEWTOWN …". Your real NAB file does exactly this: the suburb gets glued on. | **Fixed on 3 Oct.** Now recognised as the pending line clearing, and shown as a description update. (If you imported before the fix, delete one.) | Approve the update |
| E | Officeworks −$23.10 on 29 Sep, but its description contains "12/09" | **Wrong date.** Dates it 12 Sep, so it doesn't match your 29 Sep entry. Duplicate. | Delete your entry, fix the date |
| D | Aldi −$42.60 on 30 Sep, typed in twice | One matches. The other is left uncleared. | Delete the extra |
| M | Uniqlo refund +$39.95, typed in 6 days before the bank posted it | **Missed.** The matching window is 5 days, so it's added twice. | Delete one |
| L | "Grandma birthday" −$50 paid in cash, recorded in the bank account | Never clears | Delete it, or move it to a cash account |

## To start again

In the test copy, go to Settings, then Restore from backup, and choose `mock-budget-backup.json`.
