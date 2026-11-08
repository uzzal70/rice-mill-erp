# Production Recovery Calculation

## Status
Calculation and batch display implemented; independently configurable warning threshold and report export remain open.

## Formula and classification
- Total output KG = sum of every output quantity.
- Process loss KG = input KG − total output KG. Negative process loss is rejected.
- Head rice recovery % = rice outputs not classified `BROKEN` ÷ input KG × 100.
- Total rice recovery % = all rice outputs, including broken rice, ÷ input KG × 100.
- By-product recovery % = outputs with item kind `BY_PRODUCT` ÷ input KG × 100.
- Other outputs are included in total output/mass balance but are not classified as rice or by-product recovery.
- Calculations use decimal arithmetic and stored percentage precision. No fixed recovery percentage is assumed.

## Standard comparison
- The paddy item's configured `standardRecovery` is snapshotted onto the batch and compared with actual total rice recovery. A lower value produces `belowStandardRecovery` warning.
- A separate configurable threshold and effective-dated recovery policy are not implemented.

## Workflow and inventory
- Recovery is calculated on draft creation and returned on list/action responses. The approved batch snapshots outputs; posting atomically issues input paddy and receives outputs.
- Recovery calculation itself does not post a journal or alter quantities beyond the parent production workflow.

## Implementation and verification
- Implemented in `production.calculations.ts` and production service; displayed in the production UI with warning state.
- Existing calculation tests cover output total, loss and recovery values; tests were not run during this turn.
