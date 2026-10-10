# Lumen support routing guide (internal)

Every ticket goes to exactly one team and gets one priority.

## Teams

- **Account security.** Sign-ins the customer doesn't recognise, password reset emails they didn't ask for,
  two-factor problems, anything that sounds like a taken-over account.
- **Billing.** Charges, refunds, invoices and receipts, VAT, cards that were declined. Payment error codes that
  start with `PAY-4` are the customer's card or bank and belong here.
- **Technical.** Bugs, sync, export, outages. Payment error codes that start with `PAY-5` are our payment
  provider or our own checkout failing: those are Technical, not Billing, even though they happen at checkout.
- **Sales.** Quotes, seat changes, plan upgrades for teams, procurement paperwork.
- **Trust and safety.** Abuse, harassment, copyright and legal complaints about content.
- **Product feedback.** Feature requests with nothing broken.

## Priority

- **P1, within 1 hour.** Any Account security ticket where someone else may be in the account, and any problem
  that stops a whole team from working.
- **P2, within 4 hours.** The customer can't pay or can't sign in, or money was taken that shouldn't have been.
- **P3, within 1 business day.** Everything else.

If a ticket has a screenshot, read it before routing: the error code is usually only in the picture.
