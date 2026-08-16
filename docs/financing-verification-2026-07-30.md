# Lacks financing facts — live verification record

**Verified:** 2026-07-30T10:53:32-05:00 (America/Chicago) · real Chrome session on
live lacks.com (PerimeterX passed; plain fetches are blocked, so curl/WebFetch
cannot re-verify — use a browser session).

## Source: https://www.lacks.com/financing (live, verbatim)

### Synchrony — page intro
"Shop today and receive Special financing options with convenient monthly
payments*. Get a decision in seconds with no impact to your credit bureau score.
SEE IF YOU PREQUALIFY »" (prequalification ≠ approval; soft-pull language is
Synchrony's, do not embellish.)

### Offer A — 9.99% APR for 72 Months*
"On purchases made with the Lack's Furniture Synchrony HOME Credit Card. Fixed
monthly payments required for 72 months."
Fine print (verbatim): "* On purchases of $500 or more made with your Lacks
Furniture Synchrony HOME Credit card. Qualifying purchase amount must be on one
receipt. Discounts may result in the qualifying purchase amount not being
satisfied. Interest will be charged on the promo purchase from the purchase date
at a reduced 9.99% APR, and fixed monthly payments are required until paid in
full. These payments are equal to 1.8521% of initial total promo purchase
amount, rounded up to the next whole dollar. … During the last month(s) of the
promo period the required monthly payment may be reduced due to the prior
months' rounding. Regular account terms apply to non-promo purchases. For New
Accounts: As of 07/31/2025, Purchase APR is 34.99%. Penalty APR is 39.99%.
Minimum Interest Charge is $2. … Subject to credit approval. We reserve the
right to discontinue or alter the terms of this offer anytime."

### Offer B — 0% APR for 48 Months**
"** On in-store purchases of $4200 or more made with your Lacks Furniture
Synchrony HOME Credit card. Minimum purchase and down payment, plus tax and
delivery fee required. Qualifying purchase amount must be on one receipt.
Discounts may result in the qualifying purchase amount not being satisfied. No
interest will be charged, and equal monthly payments are required on promo
purchase until it is paid in full. … For New Accounts: As of 07/31/2025,
Purchase APR is 34.99%. Penalty APR is 39.99%. Minimum Interest Charge is $2. …
Subject to credit approval."
Down-payment amount is NOT published → no payment calculation for this offer.

### Lacks In-House Credit
"Lacks extends in-house installment credit to customers who qualify. Not only
can our installment contracts go up to 36 months, but purchases made with Lacks
In-House Credit may also qualify for promotional pricing*!" · "REVOLVING LINE OF
CREDIT / NO NEED TO REAPPLY ON NEW PURCHASES" · "Depending on your eligibility,
installment contracts are available from 6-36 months." · "*Subject to
promotional discount offer and credit approval by Lacks."

### Lease-to-Own / Build My Credit
Both present with "SEE STORE FOR DETAILS »" only. No provider, rate, payment,
total-cost, or approval details published. Present as available paths only.

### NOT on the page
- "No money down" (older blog claim) — ABSENT from the live page. Do not use.
- Mexico program — lives on /faq, not /financing.

## Source: https://www.lacks.com/faq (live, verbatim, Spanish section)
"…nuestro sistema de crédito con hasta 24 meses. El interés máximo del contrato
de 24% APR (mismo que puede variar). $999 financiados durante 24 meses con 24%
APR tendrán 24 pagos mensuales de $52.82." Requirements: "dos identificaciones
oficiales, 3 referencias personales y verificación de ingresos" (valid IDs
listed: Visa Laser, credencial para votar, licencia de conducir, pasaporte
mexicano, matrícula consular). Application link in FAQ points to
https://www.lacks.com/mexican-credit-application.

## URL status checks (live, 2026-07-30)
- https://www.lacks.com/financing — 200, renders
- https://www.lacks.com/credit-application — 200 (fetch)
- https://www.lacks.com/faq — 200, renders
- **https://www.lacks.com/mexican-credit-application — 404** ("YOU HAVE STRAYED
  FROM THE PATH"), even though Lacks' own FAQ links to it. DISCREPANCY:
  documented here; DreamFinder must NOT link this URL until it resolves. The
  Mexico card links to https://www.lacks.com/faq instead; the published (dead)
  URL is stored in config with `"verified": false` and is not rendered.

## Discrepancy log
1. mexican-credit-application 404 (above).
2. Older blog's "no money down" claim not on current financing page → omitted.
3. Synchrony new-account APR figures are dated "as of 07/31/2025" ON the live
   page — quoted only inside the offers' own disclosure text, dated as printed.

## Deliberately omitted claims
- Any calculated monthly payment (all `paymentCalculationEnabled: false`).
- Any "no money down" claim.
- Any exact 0%/48 payment (down-payment mechanics unpublished).
- Lease-to-own / Build My Credit specifics beyond "available, see store".
- "Everyone approved" / "regardless of credit history" (the Lacks page's own
  intro uses "regardless of your credit history" — NOT reused in DreamFinder:
  it reads as an approval implication in a kiosk context).
