import json
import os
import stat
import subprocess
import sys
import pytest
from decimal import Decimal
from pathlib import Path
from typing import Tuple, List, Dict

from order_tracker import (
    OrderTracker,
    TransactionalOrderManager,
    OrderLifecycleState,
    JournalCorruptError,
    ReconciliationError,
    parse_cloid,
    get_canonical_cloid_key,
)


# ==============================================================================
# HARNESS & FIXTURES (STRICT TEARDOWN)
# ==============================================================================
@pytest.fixture
def managed_paths(tmp_path: Path) -> Tuple[str, str]:
    """Provides isolated path strings for temporary journal and lock files."""
    journal_path = str(tmp_path / "orders.jsonl")
    lock_path = str(tmp_path / "orders.lock")
    return journal_path, lock_path


@pytest.fixture
def manager_factory(managed_paths: Tuple[str, str]):
    """
    Factory fixture yielding active TransactionalOrderManager instances.
    Guarantees lock cleanup without swallowing exceptions.
    """
    journal_path, lock_path = managed_paths
    managers: List[TransactionalOrderManager] = []

    def _create_manager() -> TransactionalOrderManager:
        mgr = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
        managers.append(mgr)
        return mgr

    yield _create_manager

    for mgr in managers:
        if not mgr.is_closed:
            mgr.close()


def make_tracker(
    cloid_str: str = "12345678-1234-1234-1234-123456789abc",
    total_size: str = "1.0",
    baseline_cum_sz: str = "0",
    unabsorbed_ws_fills: Dict[str, str] = None,
    processed_trade_ledger: Dict[str, str] = None,
    snapshot_covered_trade_ids: List[str] = None,
    last_applied_sequence_id: int = 1,
    is_active: bool = True,
    state: OrderLifecycleState = OrderLifecycleState.OPEN,
) -> OrderTracker:
    cloid_obj = parse_cloid(cloid_str)
    return OrderTracker(
        cloid_obj=cloid_obj,
        total_size=Decimal(total_size),
        baseline_cum_sz=Decimal(baseline_cum_sz),
        unabsorbed_ws_fills={k: Decimal(v) for k, v in (unabsorbed_ws_fills or {}).items()},
        processed_trade_ledger={k: Decimal(v) for k, v in (processed_trade_ledger or {}).items()},
        snapshot_covered_trade_ids=set(snapshot_covered_trade_ids or []),
        last_applied_sequence_id=last_applied_sequence_id,
        is_active=is_active,
        state=state,
    )


# ==============================================================================
# 1. MULTI-RESTART REPLAY SEQUENCE
# ==============================================================================
def test_snapshot_trade_multi_restart_replay_idempotency(manager_factory, managed_paths):
    """
    Tests: Snapshot-covered trade -> Late WS Fill -> Restart 1 -> Re-apply Fill -> Restart 2 -> Replay.
    Verifies that a late fill persisted after restart remains idempotent across multiple cold restarts.
    """
    journal_path, _ = managed_paths
    cloid_str = "12345678-1234-1234-1234-123456789abc"
    raw_key = get_canonical_cloid_key(cloid_str)

    # Phase 1: Initialize & Apply REST Snapshot covering trade_A at 0.4
    mgr1 = manager_factory()
    mgr1.registry[raw_key] = make_tracker(cloid_str=cloid_str, total_size="1.0")
    mgr1.commit_transactional_update(raw_key, lambda t: None)
    mgr1.commit_transactional_update(
        raw_key,
        lambda t: t.apply_rest_snapshot(
            snapshot_cum_sz=Decimal("0.4"),
            snapshot_sequence_id=10,
            snapshot_trade_ids={"trade_A"},
            is_still_open=True,
        ),
    )
    assert mgr1.registry[raw_key].cum_filled_sz == Decimal("0.4")
    mgr1.close()

    # Phase 2: First Restart -> Apply WS Execution for trade_A (0.4 qty)
    mgr2 = manager_factory()
    mgr2.recover_from_journal()
    mgr2.commit_transactional_update(
        raw_key,
        lambda t: t.apply_ws_execution("trade_A", Decimal("0.4"))
    )
    assert mgr2.registry[raw_key].cum_filled_sz == Decimal("0.4")
    mgr2.close()

    # Phase 3: Second Restart -> Replay duplicate execution event for trade_A
    mgr3 = manager_factory()
    mgr3.recover_from_journal()
    assert mgr3.registry[raw_key].cum_filled_sz == Decimal("0.4")
    assert mgr3.registry[raw_key].processed_trade_ledger["trade_A"] == Decimal("0.4")

    # Re-apply same WS fill
    mgr3.commit_transactional_update(
        raw_key,
        lambda t: t.apply_ws_execution("trade_A", Decimal("0.4"))
    )

    # Quantity MUST remain 0.4 without duplication
    assert mgr3.registry[raw_key].cum_filled_sz == Decimal("0.4")


# ==============================================================================
# 2. CONTRADICTION & LEDGER INTEGRITY
# ==============================================================================
def test_snapshot_baseline_contradicts_known_execution_quantity(manager_factory):
    """
    Tests Blocker 1: Baseline snapshot reports 0.4 covering trade_A, but a subsequent
    WS event reports trade_A filled 0.8. Must raise ReconciliationError.
    """
    mgr = manager_factory()
    cloid_str = "12345678-1234-1234-1234-123456789abc"
    raw_key = get_canonical_cloid_key(cloid_str)

    mgr.registry[raw_key] = make_tracker(cloid_str=cloid_str, total_size="1.0")
    mgr.commit_transactional_update(
        raw_key,
        lambda t: t.apply_rest_snapshot(
            snapshot_cum_sz=Decimal("0.4"),
            snapshot_sequence_id=10,
            snapshot_trade_ids={"trade_A"},
            is_still_open=True,
        ),
    )

    with pytest.raises(ReconciliationError, match="(?i)contradict|mismatch|fill size"):
        mgr.commit_transactional_update(
            raw_key,
            lambda t: t.apply_ws_execution("trade_A", Decimal("0.8"))
        )


def test_unabsorbed_fill_missing_from_ledger_raises_journal_corrupt(managed_paths):
    """Recovery must fail if an unabsorbed fill is missing from processed_trade_ledger."""
    journal_path, lock_path = managed_paths
    tracker = make_tracker(
        unabsorbed_ws_fills={"trade_B": "0.5"},
        processed_trade_ledger={},  # Invariant breach
    )
    
    with open(journal_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(tracker.to_dict()) + "\n")

    mgr = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    try:
        with pytest.raises(JournalCorruptError, match="Invariant violation.*missing from ledger"):
            mgr.recover_from_journal()
    finally:
        mgr.close()


# ==============================================================================
# 3. STRICT VALIDATION & GENUINE MID-FILE CORRUPTION
# ==============================================================================
def test_genuine_mid_file_corrupt_json_raises_fatal(managed_paths):
    """A malformed JSON line with subsequent valid records raises a fatal JournalCorruptError."""
    journal_path, lock_path = managed_paths
    t1 = make_tracker(cloid_str="11111111-1111-1111-1111-111111111111")
    t2 = make_tracker(cloid_str="22222222-2222-2222-2222-222222222222")

    with open(journal_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(t1.to_dict()) + "\n")
        f.write('{"raw_key": "corrupt_mid_file_json" \n')  # Corrupt mid-file
        f.write(json.dumps(t2.to_dict()) + "\n")          # Trailing valid line proves non-torn tail

    mgr = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    try:
        with pytest.raises(JournalCorruptError, match="Fatal mid-file JSON corruption"):
            mgr.recover_from_journal()
    finally:
        mgr.close()


def test_invalid_boolean_type_raises_journal_corrupt(managed_paths):
    """Strict type checking rejects non-boolean types in boolean fields."""
    journal_path, lock_path = managed_paths
    raw_dict = make_tracker().to_dict()
    raw_dict["is_active"] = "true"

    with open(journal_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(raw_dict) + "\n")

    mgr = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    try:
        with pytest.raises(JournalCorruptError, match="is_active must be a strict boolean"):
            mgr.recover_from_journal()
    finally:
        mgr.close()


# ==============================================================================
# 4. CRASH DURABILITY, QUARANTINE INTEGRITY & DIRECTORY FSYNC
# ==============================================================================
def test_quarantine_integrity_and_parent_directory_fsync(managed_paths, monkeypatch):
    """
    Verifies that journal repair:
    1. Preserves full original journal contents in the quarantine artifact.
    2. Issues fsync on the EXACT parent directory descriptor AFTER atomic os.replace succeeds.
    3. Restores valid head state and supports live appends & cold recovery.
    """
    journal_path, lock_path = managed_paths
    parent_dir = Path(journal_path).parent.resolve()

    valid_tracker = make_tracker(cloid_str="11111111-1111-1111-1111-111111111111")
    corrupt_tail_bytes = b'{"raw_key": "0x11111111", "total_size": "INCOMPLETE_JSON_TAIL'
    valid_json_bytes = json.dumps(valid_tracker.to_dict()).encode("utf-8") + b"\n"

    full_original_bytes = valid_json_bytes + corrupt_tail_bytes

    with open(journal_path, "wb") as f:
        f.write(full_original_bytes)

    fsync_calls = []
    original_fsync = os.fsync
    original_replace = os.replace

    replace_occurred = False

    def spy_replace(src, dst):
        nonlocal replace_occurred
        res = original_replace(src, dst)
        replace_occurred = True  # Set ONLY after successful completion
        return res

    def spy_fsync(fd):
        try:
            st = os.fstat(fd)
            if stat.S_ISDIR(st.st_mode):
                fd_path = Path(f"/proc/self/fd/{fd}").resolve() if sys.platform.startswith("linux") else parent_dir
                fsync_calls.append({
                    "is_parent_dir": (fd_path == parent_dir),
                    "after_replace": replace_occurred
                })
        except Exception:
            pass
        return original_fsync(fd)

    monkeypatch.setattr(os, "replace", spy_replace)
    monkeypatch.setattr(os, "fsync", spy_fsync)

    mgr1 = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    try:
        mgr1.recover_from_journal()

        # 1. Assert parent directory fsync happened AFTER atomic replacement
        parent_syncs_after_replace = [
            call for call in fsync_calls if call["is_parent_dir"] and call["after_replace"]
        ]
        assert len(parent_syncs_after_replace) >= 1, "Parent directory fsync missing post-replace"

        # 2. Verify quarantine contains full original journal
        quarantine_files = list(parent_dir.glob("*.quarantine.*"))
        assert len(quarantine_files) == 1
        assert quarantine_files[0].read_bytes() == full_original_bytes

        # 3. Assert valid state recovered
        assert valid_tracker.raw_key in mgr1.registry

        # 4. Live append on repaired file
        cloid_str_2 = "22222222-2222-2222-2222-222222222222"
        raw_key_2 = get_canonical_cloid_key(cloid_str_2)
        mgr1.registry[raw_key_2] = make_tracker(cloid_str=cloid_str_2)
        mgr1.commit_transactional_update(raw_key_2, lambda t: None)
    finally:
        mgr1.close()

    # 5. Cold restart recovery check
    mgr2 = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    try:
        mgr2.recover_from_journal()
        assert valid_tracker.raw_key in mgr2.registry
        assert get_canonical_cloid_key("22222222-2222-2222-2222-222222222222") in mgr2.registry
    finally:
        mgr2.close()


# ==============================================================================
# 5. FAIL-CLOSED STATE GATING & THREE STORAGE DISK OUTCOMES
# ==============================================================================
def test_failed_recovery_closes_manager_and_blocks_writes(managed_paths):
    """Tests that recovery failure marks manager closed, clears memory, and cleans up locks."""
    journal_path, lock_path = managed_paths
    
    with open(journal_path, "w", encoding="utf-8") as f:
        f.write('{"raw_key": "CORRUPT_HEAD" \n')

    mgr = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    try:
        with pytest.raises(JournalCorruptError):
            mgr.recover_from_journal()

        assert mgr.is_closed
        assert len(mgr.registry) == 0

        raw_key = get_canonical_cloid_key("12345678-1234-1234-1234-123456789abc")
        with pytest.raises(RuntimeError, match="Order manager is closed"):
            mgr.commit_transactional_update(raw_key, lambda t: None)
    finally:
        if not mgr.is_closed:
            mgr.close()


def test_injected_fsync_failure_halts_engine(managed_paths, monkeypatch):
    """
    Injects an IO error on fsync to confirm exception wrapper contract,
    in-memory rollback, storage_halted setting, and write rejection.
    """
    journal_path, lock_path = managed_paths
    mgr1 = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    
    cloid_str = "12345678-1234-1234-1234-123456789abc"
    raw_key = get_canonical_cloid_key(cloid_str)

    try:
        # Commit baseline state
        mgr1.registry[raw_key] = make_tracker(cloid_str=cloid_str, total_size="1.0")
        mgr1.commit_transactional_update(raw_key, lambda t: None)

        def bad_fsync(fd):
            raise OSError("Injected Disk Failure")

        monkeypatch.setattr(os, "fsync", bad_fsync)

        # 1. Assert exception contract
        with pytest.raises(RuntimeError, match="(?i)Disk persistence failed! Engine halted") as exc_info:
            mgr1.commit_transactional_update(
                raw_key,
                lambda t: t.apply_ws_execution("trade_UNCERTAIN", Decimal("0.5"))
            )
        
        err_cause = exc_info.value.__cause__ or exc_info.value.__context__
        assert isinstance(err_cause, OSError)

        # 2. Assert in-memory rollback & strict storage_halted flag
        assert mgr1.registry[raw_key].cum_filled_sz == Decimal("0")
        assert "trade_UNCERTAIN" not in mgr1.registry[raw_key].processed_trade_ledger
        assert mgr1.storage_halted is True

        # 3. Assert subsequent writes blocked
        with pytest.raises(RuntimeError, match="(?i)Engine halted: disk persistence failed previously"):
            mgr1.commit_transactional_update(raw_key, lambda t: None)
    finally:
        mgr1.close()
        monkeypatch.undo()


@pytest.mark.parametrize("disk_outcome", ["lost_record", "complete_record", "torn_record"])
def test_uncertain_write_recovery_disk_outcomes(managed_paths, disk_outcome):
    """
    Verifies that cold restart recovery state is validated BEFORE replaying the execution,
    and then converges cleanly to 0.5 total fill across all 3 disk outcomes.
    """
    journal_path, lock_path = managed_paths
    cloid_str = "12345678-1234-1234-1234-123456789abc"
    raw_key = get_canonical_cloid_key(cloid_str)

    # Prepare baseline tracker
    baseline_tracker = make_tracker(cloid_str=cloid_str, total_size="1.0")
    valid_baseline_bytes = json.dumps(baseline_tracker.to_dict()).encode("utf-8") + b"\n"

    # Prepare candidate updated tracker
    updated_tracker = make_tracker(cloid_str=cloid_str, total_size="1.0")
    updated_tracker.apply_ws_execution("trade_UNCERTAIN", Decimal("0.5"))
    candidate_bytes = json.dumps(updated_tracker.to_dict()).encode("utf-8") + b"\n"

    # Write scenario-specific journal bytes
    with open(journal_path, "wb") as f:
        f.write(valid_baseline_bytes)
        if disk_outcome == "complete_record":
            f.write(candidate_bytes)
        elif disk_outcome == "torn_record":
            f.write(candidate_bytes[:25])  # Incomplete line tail

    # Perform cold recovery
    mgr = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)
    try:
        mgr.recover_from_journal()
        
        # PRE-REPLAY RECOVERY ASSERTIONS: Prove state parsed from disk prior to event replay
        recovered = mgr.registry[raw_key]
        expected_sz = Decimal("0.5") if disk_outcome == "complete_record" else Decimal("0")
        
        assert recovered.cum_filled_sz == expected_sz
        assert ("trade_UNCERTAIN" in recovered.processed_trade_ledger) == (
            disk_outcome == "complete_record"
        )

        # Replay execution event
        mgr.commit_transactional_update(
            raw_key,
            lambda t: t.apply_ws_execution("trade_UNCERTAIN", Decimal("0.5"))
        )

        # Post-replay accounting convergence
        tracker = mgr.registry[raw_key]
        assert tracker.cum_filled_sz == Decimal("0.5")
        assert tracker.processed_trade_ledger["trade_UNCERTAIN"] == Decimal("0.5")
    finally:
        mgr.close()


# ==============================================================================
# 6. SUBPROCESS LOCK ISOLATION & CLOSED GUARDS
# ==============================================================================
def test_process_lock_isolation_across_subprocess(managed_paths):
    """Verifies file-level lock contention (fcntl.flock) across true OS subprocess boundaries."""
    journal_path, lock_path = managed_paths
    mgr = TransactionalOrderManager(journal_path=journal_path, lock_path=lock_path)

    sub_script = f"""
import sys
from order_tracker import TransactionalOrderManager

try:
    mgr2 = TransactionalOrderManager(journal_path=r"{journal_path}", lock_path=r"{lock_path}")
    sys.exit(0)
except RuntimeError as e:
    if "lock held" in str(e) or "Engine startup blocked" in str(e):
        sys.exit(42)
    sys.exit(1)
"""

    try:
        proc = subprocess.run(
            [sys.executable, "-c", sub_script],
            capture_output=True,
            text=True,
            timeout=5,
        )
        assert proc.returncode == 42, f"Subprocess lock check failed: {proc.stderr}"
    finally:
        mgr.close()


def test_closed_manager_blocks_writes_and_recovery(manager_factory):
    """Ensures a closed manager instance explicitly rejects operations."""
    mgr = manager_factory()
    cloid_str = "12345678-1234-1234-1234-123456789abc"
    raw_key = get_canonical_cloid_key(cloid_str)
    
    mgr.registry[raw_key] = make_tracker(cloid_str=cloid_str)
    mgr.close()

    assert mgr.is_closed

    with pytest.raises(RuntimeError, match="Order manager is closed"):
        mgr.commit_transactional_update(raw_key, lambda t: None)

    with pytest.raises(RuntimeError, match="Cannot recover using a closed manager instance"):
        mgr.recover_from_journal()