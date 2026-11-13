# ZETA order-manager simulation

Run the standalone demo:

```bash
python scripts/zeta_order_manager.py
```

This is an in-memory simulation, not a live trading service. It has no wallet,
network, or exchange SDK imports and is not wired into the market-data monitor.
Inject only local simulated cancellation callbacks.

The demo registers two fictitious resting orders:

- BTC `101`: expires after a confirmed simulated cancellation at its two-second TTL.
- ETH `102`: receives a simulated fill before its five-second TTL.

It exits after about three seconds, showing final states and zero active orders.
No real orders are created, filled, or cancelled.

## State guarantees and limits

- TTL uses monotonic time. Wall-clock timestamps are only for display.
- Decimal prices/sizes serialize as strings. Returned snapshots are immutable.
- Duplicate order IDs are rejected; terminal states cannot be overwritten.
- A cancellation is claimed under a lock to prevent concurrent duplicate calls.
  A later fill cannot be overwritten by an older cancellation response.
- Missing callbacks do not imply success. A `False` result leaves the order
  resting; a `True` result confirms a simulated cancellation.
- Timeouts, callback exceptions, invalid responses, or cancellation of an
  in-progress callback produce `CANCEL_UNKNOWN` unless a newer status exists.
  Such orders remain active and are not retried automatically. An explicit
  simulated reconciliation update is required before retrying.
- Stopping the monitor stops its background task; it does not pretend to close
  every tracked order. State is lost when the process ends.
- This does not implement partial fills, restart recovery, exchange event
  reconciliation, or live-trading safety controls.

Offline tests:

```bash
python -m unittest discover -s scripts -p 'test_zeta_order_manager.py' -v
```