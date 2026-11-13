import fcntl
import json
import os
import re
import shutil
import time
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from enum import Enum, auto
from typing import Dict, Optional, Set
from hyperliquid.utils.types import Cloid


# ---------------------------------------------------------------------------
# Domain Exceptions
# ---------------------------------------------------------------------------
class ReconciliationError(Exception):
    """Raised when conflicting trade execution or sequence data is detected."""
    pass


class JournalCorruptError(Exception):
    """Raised when invalid/corrupt journal entries or state invariants are encountered."""
    pass


# ---------------------------------------------------------------------------
# Canonical CLOID Parsing
# ---------------------------------------------------------------------------
def parse_cloid(cloid_input: str) -> Cloid:
    if not isinstance(cloid_input, str):
        raise TypeError("CLOID must be a string")

    value = cloid_input.lower()
    if value.startswith("0x"):
        value = value[2:]

    valid = re.fullmatch(
        r"(?:[0-9a-f]{32}|"
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
        r"[0-9a-f]{4}-[0-9a-f]{12})",
        value,
    )
    if valid is None:
        raise ValueError("CLOID must contain exactly 128 bits of hexadecimal data")

    return Cloid.from_str("0x" + value.replace("-", ""))


def get_canonical_cloid_key(cloid_input: str) -> str:
    return parse_cloid(cloid_input).to_raw()


# ---------------------------------------------------------------------------
# Order Lifecycle States
# ---------------------------------------------------------------------------
class OrderLifecycleState(Enum):
    PENDING_SUBMIT = auto()
    OPEN = auto()
    PARTIALLY_FILLED = auto()
    FILLED = auto()
    CANCELLED = auto()
    REJECTED = auto()
    UNKNOWN = auto()


TERMINAL_STATES = {
    OrderLifecycleState.FILLED,
    OrderLifecycleState.CANCELLED,
    OrderLifecycleState.REJECTED,
}


# ---------------------------------------------------------------------------
# Robust Order Tracker
# ---------------------------------------------------------------------------
@dataclass
class OrderTracker:
    cloid_obj: Cloid
    total_size: Decimal
    raw_key: str = field(init=False)
    oid: Optional[int] = None
    baseline_cum_sz: Decimal = Decimal("0")
    unabsorbed_ws_fills: Dict[str, Decimal] = field(default_factory=dict)
    processed_trade_ledger: Dict[str, Decimal] = field(default_factory=dict)
    snapshot_covered_trade_ids: Set[str] = field(default_factory=set)
    last_applied_sequence_id: int = 0
    is_active: bool = True
    state: OrderLifecycleState = OrderLifecycleState.PENDING_SUBMIT

    def __post_init__(self):
        validated_cloid = parse_cloid(self.cloid_obj.to_raw())
        self.raw_key = validated_cloid.to_raw()

        if not isinstance(self.total_size, Decimal):
            self.total_size = Decimal(str(self.total_size))

        if not self.total_size.is_finite() or self.total_size <= Decimal("0"):
            raise ValueError(f"Total size must be finite and > 0, got {self.total_size}")

        if not isinstance(self.baseline_cum_sz, Decimal):
            self.baseline_cum_sz = Decimal(str(self.baseline_cum_sz))

        if not self.baseline_cum_sz.is_finite() or self.baseline_cum_sz < Decimal("0"):
            raise ValueError(f"Baseline fill size must be finite and >= 0, got {self.baseline_cum_sz}")

        # Validate unabsorbed WS fills
        clean_unabsorbed = {}
        for tid, qty in self.unabsorbed_ws_fills.items():
            d_qty = Decimal(str(qty)) if not isinstance(qty, Decimal) else qty
            if not d_qty.is_finite() or d_qty <= Decimal("0"):
                raise ValueError(f"Invalid quantity for unabsorbed trade {tid}: {qty}")
            clean_unabsorbed[str(tid)] = d_qty
        self.unabsorbed_ws_fills = clean_unabsorbed

        # Validate verified trade ledger (positive quantities ONLY)
        clean_ledger = {}
        for tid, qty in self.processed_trade_ledger.items():
            d_qty = Decimal(str(qty)) if not isinstance(qty, Decimal) else qty
            if not d_qty.is_finite() or d_qty <= Decimal("0"):
                raise ValueError(f"Invalid quantity in trade ledger for {tid}: {qty}")
            clean_ledger[str(tid)] = d_qty
        self.processed_trade_ledger = clean_ledger

        self.snapshot_covered_trade_ids = {str(tid) for tid in self.snapshot_covered_trade_ids}

        if self.cum_filled_sz > self.total_size:
            raise ValueError(
                f"Inconsistent state: cum_filled_sz ({self.cum_filled_sz}) > total ({self.total_size})"
            )

    @property
    def cum_filled_sz(self) -> Decimal:
        """Calculates effective filled quantity: baseline + unabsorbed WS fills."""
        return self.baseline_cum_sz + sum(self.unabsorbed_ws_fills.values(), Decimal("0"))

    def copy(self) -> "OrderTracker":
        return OrderTracker(
            cloid_obj=parse_cloid(self.raw_key),
            total_size=self.total_size,
            oid=self.oid,
            baseline_cum_sz=self.baseline_cum_sz,
            unabsorbed_ws_fills=dict(self.unabsorbed_ws_fills),
            processed_trade_ledger=dict(self.processed_trade_ledger),
            snapshot_covered_trade_ids=set(self.snapshot_covered_trade_ids),
            last_applied_sequence_id=self.last_applied_sequence_id,
            is_active=self.is_active,
            state=self.state,
        )

    def apply_ws_execution(self, trade_id: str, fill_sz: Decimal | str) -> bool:
        # 1. Inline validation & type normalization
        if not isinstance(trade_id, str) or not trade_id.strip():
            raise ValueError("trade_id must be a non-empty string")

        if not isinstance(fill_sz, Decimal):
            fill_sz = Decimal(str(fill_sz))

        if not fill_sz.is_finite() or fill_sz <= Decimal("0"):
            raise ValueError(f"fill_sz must be a finite positive Decimal: {fill_sz}")

        # 2. Known execution: Reject quantity contradictions, no-op exact duplicates
        if trade_id in self.processed_trade_ledger:
            existing_sz = self.processed_trade_ledger[trade_id]
            if existing_sz != fill_sz:
                raise ReconciliationError(
                    f"WS execution fill size contradiction for trade '{trade_id}': "
                    f"known={existing_sz}, incoming={fill_sz}"
                )
            return False

        # 3. First-time execution covered by REST snapshot: Verify against aggregate baseline
        if trade_id in self.snapshot_covered_trade_ids:
            known_covered_total = sum(
                (
                    qty
                    for tid, qty in self.processed_trade_ledger.items()
                    if tid in self.snapshot_covered_trade_ids
                ),
                Decimal("0"),
            )

            if known_covered_total + fill_sz > self.baseline_cum_sz:
                raise ReconciliationError(
                    f"Snapshot fill size contradiction for trade '{trade_id}': "
                    f"known covered total ({known_covered_total}) plus incoming fill ({fill_sz}) "
                    f"exceeds baseline ({self.baseline_cum_sz})"
                )

            self.processed_trade_ledger[trade_id] = fill_sz
            return False

        # 4. Uncovered execution: Validate before position mutation
        potential_total = self.cum_filled_sz + fill_sz
        if potential_total > self.total_size:
            raise ValueError(
                f"Overfill detected: {potential_total} exceeds "
                f"order size {self.total_size}"
            )

        self.processed_trade_ledger[trade_id] = fill_sz
        self.unabsorbed_ws_fills[trade_id] = fill_sz
        self._reevaluate_lifecycle()
        return True

    def apply_rest_snapshot(
        self,
        snapshot_cum_sz: Decimal,
        snapshot_sequence_id: int,
        oid: Optional[int] = None,
        snapshot_trade_ids: Optional[Set[str]] = None,
        is_still_open: Optional[bool] = None,
    ):
        if not isinstance(snapshot_cum_sz, Decimal):
            snapshot_cum_sz = Decimal(str(snapshot_cum_sz))

        if not snapshot_cum_sz.is_finite() or snapshot_cum_sz < Decimal("0"):
            raise ValueError(f"Invalid snapshot fill size: {snapshot_cum_sz}")

        if snapshot_cum_sz > self.total_size:
            raise ValueError(f"Snapshot fill size {snapshot_cum_sz} exceeds total size {self.total_size}")

        if snapshot_sequence_id <= self.last_applied_sequence_id:
            return  # Ignore stale or out-of-order snapshots

        self.last_applied_sequence_id = snapshot_sequence_id

        if oid is not None:
            self.oid = oid

        # Record snapshot-covered IDs without polluting quantity ledger
        if snapshot_trade_ids:
            for tid in snapshot_trade_ids:
                tid_str = str(tid)
                self.snapshot_covered_trade_ids.add(tid_str)
                # Absorb from WS unabsorbed queue if present
                self.unabsorbed_ws_fills.pop(tid_str, None)

        if snapshot_cum_sz > self.baseline_cum_sz:
            self.baseline_cum_sz = snapshot_cum_sz

        if self.cum_filled_sz > self.total_size:
            raise ReconciliationError(
                f"Post-snapshot reconciliation failed: calculated total {self.cum_filled_sz} > total size {self.total_size}"
            )

        if self.state not in TERMINAL_STATES and is_still_open is not None:
            self.is_active = is_still_open

        self._reevaluate_lifecycle()

    def _reevaluate_lifecycle(self):
        if self.state in TERMINAL_STATES:
            return

        if self.cum_filled_sz >= self.total_size:
            self.state = OrderLifecycleState.FILLED
            self.is_active = False
        elif self.cum_filled_sz > Decimal("0"):
            self.state = OrderLifecycleState.PARTIALLY_FILLED
        elif self.is_active:
            self.state = OrderLifecycleState.OPEN

    def to_dict(self) -> dict:
        return {
            "raw_key": self.raw_key,
            "oid": self.oid,
            "total_size": str(self.total_size),
            "baseline_cum_sz": str(self.baseline_cum_sz),
            "unabsorbed_ws_fills": {k: str(v) for k, v in sorted(self.unabsorbed_ws_fills.items())},
            "processed_trade_ledger": {k: str(v) for k, v in sorted(self.processed_trade_ledger.items())},
            "snapshot_covered_trade_ids": sorted(list(self.snapshot_covered_trade_ids)),
            "last_applied_sequence_id": self.last_applied_sequence_id,
            "is_active": self.is_active,
            "state": self.state.name,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "OrderTracker":
        cloid_obj = parse_cloid(data["raw_key"])

        state_str = data.get("state")
        if state_str not in OrderLifecycleState.__members__:
            raise JournalCorruptError(f"Invalid lifecycle state in journal: {state_str}")
        state_enum = OrderLifecycleState[state_str]

        # Strict Boolean validation
        is_active_raw = data.get("is_active")
        if type(is_active_raw) is not bool:
            raise JournalCorruptError(f"is_active must be a strict boolean, got: {type(is_active_raw)}")

        try:
            unabsorbed = {
                k: Decimal(str(v)) for k, v in data.get("unabsorbed_ws_fills", {}).items()
            }
            ledger = {
                k: Decimal(str(v)) for k, v in data.get("processed_trade_ledger", {}).items()
            }
            covered_ids = set(data.get("snapshot_covered_trade_ids", []))

            tracker = cls(
                cloid_obj=cloid_obj,
                total_size=Decimal(data["total_size"]),
                oid=data.get("oid"),
                baseline_cum_sz=Decimal(data.get("baseline_cum_sz", "0")),
                unabsorbed_ws_fills=unabsorbed,
                processed_trade_ledger=ledger,
                snapshot_covered_trade_ids=covered_ids,
                last_applied_sequence_id=int(data.get("last_applied_sequence_id", 0)),
                is_active=is_active_raw,
                state=state_enum,
            )
        except (ValueError, InvalidOperation) as err:
            raise JournalCorruptError(f"Invalid numeric quantity or state in journal record: {err}")

        # Strict Cross-Field Invariant Validations
        for tid, qty in tracker.unabsorbed_ws_fills.items():
            if tid not in tracker.processed_trade_ledger:
                raise JournalCorruptError(f"Invariant violation: unabsorbed trade {tid} missing from ledger")
            if tracker.processed_trade_ledger[tid] != qty:
                raise JournalCorruptError(
                    f"Invariant violation: trade {tid} quantity mismatch between unabsorbed ({qty}) and ledger ({tracker.processed_trade_ledger[tid]})"
                )

        if tracker.state == OrderLifecycleState.FILLED and tracker.cum_filled_sz < tracker.total_size:
            raise JournalCorruptError(
                f"Inconsistent journal: state is FILLED but cum_filled_sz ({tracker.cum_filled_sz}) < total ({tracker.total_size})"
            )

        return tracker


# ---------------------------------------------------------------------------
# Lifetime Process Locking & Atomic Journal Engine
# ---------------------------------------------------------------------------
class SingleWriterLock:
    def __init__(self, lock_path: str):
        self.lock_path = lock_path
        self._lock_fd = None

    def acquire(self):
        self._lock_fd = open(self.lock_path, "w")
        try:
            fcntl.flock(self._lock_fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise RuntimeError(f"Engine startup blocked: lock held at {self.lock_path}")

    def release(self):
        if self._lock_fd:
            try:
                fcntl.flock(self._lock_fd.fileno(), fcntl.LOCK_UN)
            except OSError:
                pass
            self._lock_fd.close()
            self._lock_fd = None


class TransactionalOrderManager:
    def __init__(self, journal_path: str, lock_path: str):
        self.journal_path = journal_path
        self.writer_lock = SingleWriterLock(lock_path)
        self.writer_lock.acquire()
        self.registry: Dict[str, OrderTracker] = {}
        self.storage_halted = False
        self.is_closed = False

    def close(self):
        self.is_closed = True
        self.writer_lock.release()

    def recover_from_journal(self) -> None:
        # 1. Precise error guards matching existing test contracts
        if self.is_closed:
            raise RuntimeError("Cannot recover using a closed manager instance.")

        if self.storage_halted:
            raise RuntimeError("Cannot recover using a halted manager instance.")

        if not os.path.exists(self.journal_path):
            self.registry = {}
            return

        staging_registry: Dict[str, OrderTracker] = {}
        needs_delimiter_fix = False
        repaired_tail = False

        try:
            with open(self.journal_path, "rb") as f:
                raw_bytes = f.read()

            if not raw_bytes:
                self.registry = {}
                return

            raw_lines = raw_bytes.splitlines(keepends=True)
            valid_bytes_count = 0

            for i, line_bytes in enumerate(raw_lines):
                is_last_line = (i == len(raw_lines) - 1)
                has_newline = line_bytes.endswith(b"\n") or line_bytes.endswith(b"\r\n")

                # Strict UTF-8 decoding; invalid bytes trigger outer failure handler
                line_str = line_bytes.decode("utf-8").strip()
                if not line_str:
                    valid_bytes_count += len(line_bytes)
                    continue

                try:
                    record_dict = json.loads(line_str)
                    tracker = OrderTracker.from_dict(record_dict)
                    staging_registry[tracker.raw_key] = tracker
                    valid_bytes_count += len(line_bytes)

                    # Valid final line lacking a trailing newline delimiter
                    if is_last_line and not has_newline:
                        needs_delimiter_fix = True

                except json.JSONDecodeError as err:
                    # Torn tail write: ONLY eligible if it is the last line AND lacks a trailing newline
                    if is_last_line and not has_newline:
                        self._quarantine_and_repair(valid_bytes_count, append_newline=False)
                        repaired_tail = True
                        break

                    # Complete line with trailing newline or mid-file corruption -> Fail Closed
                    raise JournalCorruptError(f"Fatal mid-file JSON corruption: {err}") from err

            # Perform delimiter repair only if the healthy final line lacks a newline
            if needs_delimiter_fix and not repaired_tail:
                self._quarantine_and_repair(valid_bytes_count, append_newline=True)

            # 2. Publish registry ONLY after all parsing and disk repair/fsync operations succeed
            self.registry = staging_registry

        except Exception:
            # 3. Restored failure-triggered shutdown
            self.registry.clear()
            self.close()  # Releases locks and sets is_closed flag
            raise

    def _quarantine_and_repair(self, valid_bytes_count: int, append_newline: bool = False) -> None:
        """
        Quarantines the live journal using exclusive creation, rewrites strictly up to
        the validated byte boundary into a new exclusively-created temp file, and
        atomically replaces the live journal followed by parent-directory fsync.

        Raises FileNotFoundError or OSError if the live journal vanishes or writes fail,
        propagating to the caller's failure handler.
        """
        # 1. Exclusive quarantine file creation with retry loop on collision
        if os.path.getsize(self.journal_path) > 0:
            quarantine_path = None
            for attempt in range(10):
                candidate = f"{self.journal_path}.quarantine.{time.time_ns()}_{os.getpid()}_{attempt}"
                try:
                    # Exclusive creation mode: fails with FileExistsError if path exists
                    fd = os.open(candidate, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    try:
                        # Wrapped dst first so fd is safely closed if opening src raises
                        with os.fdopen(fd, "wb") as dst, open(self.journal_path, "rb") as src:
                            shutil.copyfileobj(src, dst)
                            dst.flush()
                            os.fsync(dst.fileno())
                        quarantine_path = candidate
                        break
                    except Exception:
                        # Clean up partial quarantine on copy error before re-raising
                        if os.path.exists(candidate):
                            try:
                                os.remove(candidate)
                            except OSError:
                                pass
                        raise
                except FileExistsError:
                    continue

            if quarantine_path is None:
                raise OSError("Failed to create a unique quarantine file after maximum retries")

        # 2. Exclusive temporary file creation for repaired journal contents
        temp_journal_path = None
        for attempt in range(10):
            candidate = f"{self.journal_path}.tmp.{time.time_ns()}_{os.getpid()}_{attempt}"
            try:
                fd = os.open(candidate, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                try:
                    with os.fdopen(fd, "wb") as dst:
                        if valid_bytes_count > 0:
                            with open(self.journal_path, "rb") as src:
                                prefix = src.read(valid_bytes_count)
                                if len(prefix) != valid_bytes_count:
                                    raise OSError("Journal shortened during repair")
                                dst.write(prefix)

                        if append_newline:
                            dst.write(b"\n")

                        dst.flush()
                        os.fsync(dst.fileno())
                    temp_journal_path = candidate
                    break
                except Exception:
                    if os.path.exists(candidate):
                        try:
                            os.remove(candidate)
                        except OSError:
                            pass
                    raise
            except FileExistsError:
                continue

        if temp_journal_path is None:
            raise OSError("Failed to create a unique temporary repair file after maximum retries")

        # 3. Atomic replacement of live journal
        os.replace(temp_journal_path, self.journal_path)

        # 4. Fsync parent directory for durable directory entry persistence
        parent_dir = os.path.dirname(os.path.abspath(self.journal_path))
        dir_fd = os.open(parent_dir, os.O_RDONLY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)

    def commit_transactional_update(self, raw_key: str, update_fn) -> bool:
        if self.is_closed:
            raise RuntimeError("Operation rejected: Order manager is closed.")

        if self.storage_halted:
            raise RuntimeError("Engine halted: disk persistence failed previously.")

        existing = self.registry.get(raw_key)
        if not existing:
            raise KeyError(f"Order key {raw_key} not found in engine registry")

        candidate = existing.copy()
        update_fn(candidate)

        try:
            payload = json.dumps(candidate.to_dict()) + "\n"
            with open(self.journal_path, "a", encoding="utf-8") as f:
                f.write(payload)
                f.flush()
                os.fsync(f.fileno())
        except Exception as e:
            self.storage_halted = True
            raise RuntimeError(f"Disk persistence failed! Engine halted: {e}")

        self.registry[raw_key] = candidate
        return True