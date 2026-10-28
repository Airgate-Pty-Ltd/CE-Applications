# Needs from Brian — COPQ Quantifier

## Before publishing:
1. **Benchmark ranges:** The tool uses published Feigenbaum/Juran PAF benchmarks. Verify these match what you've observed in aerospace/medical device practice (the 3–8% aerospace range may need tightening based on your experience).
2. **Pricing decision:** $99 vs. $149 one-time; bundle strategy with MRA and 8D tool.
3. **MRA integration:** Confirm the JSON export format matches what MRA expects when the integration endpoint is built. Note this in the MRA roadmap.
4. **IATF 16949 clause reference:** IATF has specific COQ requirements. If you want to call out IATF explicitly (in addition to AS9100/ISO 9001), add the IATF clause number to the reference section.

## Optional enhancements:
- Add a "Period" selector (monthly / quarterly / annual) that normalizes inputs
- Add trend input (prior period values) to show direction
- Add a "Reduction target" field that calculates potential savings from a 10% failure reduction
