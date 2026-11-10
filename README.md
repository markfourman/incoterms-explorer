# Incoterms Explorer v2

**Who pays for each part of the trip, where the risk changes hands, and what the buyer really ends up paying.**

**[Try it](https://markfourman.github.io/incoterms-explorer/)** on your phone or computer. No sign-up, nothing to install.

![Picking an Incoterm and watching where risk and cost change hands](assets/screenshot-desktop.png)

![Incoterms Explorer on a phone](assets/screenshot-phone.png)

## What's new in v2

Built from my notes on a second Incoterms review class (SCM930 Transportation, Seneca Polytechnic):

- **Class examples.** The two worked examples from class with the class's own numbers: Simone in Santos selling to Molly in Brampton (Maersk to Halifax, then CN rail), and the reverse trip.
- **Write it the ICC way.** Each term is shown with its named place and version, like "FOB Port of Santos, Incoterms® 2020". E and F terms name a place on the origin side, C and D terms on the destination side.
- **Who books the main trip.** Whoever pays for the main carriage calls the freight forwarder: the buyer under E and F terms, the seller under C and D.
- **Insurance, required or implied.** Only CIF and CIP make insurance compulsory; otherwise whoever carries the risk usually insures.
- **The C-term gap.** A striped stretch on the trip where the buyer carries the risk but the seller pays the bill.
- **New notes:** why DDP is rare, what "unloading" means, and why the buyer's total barely changes between terms when the seller adds no margin.
- Four new quiz questions.

## How to play

1. **Pick a route.** Start with a class example, or build your own: choose where the exporter (seller) and importer (buyer) are. Two Canadian cities make a domestic move with no ocean and no customs.
2. **Pick the cargo** (build-your-own mode): laptops in a container, a 90-tonne power transformer that's too big for a container, or 25,000 tonnes of loose raw sugar.
3. **Slide from EXW to DDP.** Watch the risk handoff and the "seller pays to here" point move along the trip, and see the seller's price, the buyer's extra costs and the total change.

## What it teaches

- All 11 Incoterms® 2020 rules. FAS, FOB, CFR and CIF are for sea and inland waterway only, so they switch off on a domestic route.
- Risk point vs cost point, and why only the C-terms have two critical points.
- Right term, right cargo: sea-only terms suit bulk and oversized cargo; containers are better on FCA, CPT or CIP.
- Common mistakes: "FOB" used for containers when FCA fits better, and EXW where the seller loads anyway.
- Sellers pass costs on: whatever the seller arranges shows up in its price, with a margin you can adjust.
- Changes in 2020: DAT became DPU, and CIP now needs higher insurance cover than CIF.

## How it's built

Plain HTML, CSS and JavaScript, with no frameworks. The rules live in `js/model.js`, separate from the screen code in `js/app.js`. `node tests/model-test.js` checks 502 combinations of route, cargo and Incoterm, including both class examples.

## Notes

Costs are simplified, illustrative estimates for learning; the class examples use the numbers from class and leave out duties. Incoterms® is a registered trademark of the International Chamber of Commerce. This project isn't affiliated with the ICC or Seneca Polytechnic.

## About

Made by [Mark Fourmanovskis](https://www.linkedin.com/in/mark-fourmanovskis/), Supply Chain Management student at Seneca Polytechnic. More projects: [Cargo Voyage](https://markfourman.github.io/cargo-voyage/) and [Supply Chain Workbook](https://markfourman.github.io/supply-chain-workbook).

MIT License.
