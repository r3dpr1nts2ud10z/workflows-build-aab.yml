"""Testnet-only ZETA maker orders. Running without a flag submits nothing."""

import argparse
import logging
import math
import os
import sys

import eth_account
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants


TESTNET_URL = "https://api.hyperliquid-testnet.xyz"
KEY_ENV = "HYPERLIQUID_TESTNET_PRIVATE_KEY"
LOGGER = logging.getLogger(__name__)


class ZetaExecutionEngine:
    """Signs orders for a dedicated testnet wallet; no endpoint override."""

    def __init__(self, private_key: str):
        if constants.TESTNET_API_URL != TESTNET_URL:
            raise RuntimeError("SDK testnet endpoint changed; refusing to connect.")
        if not private_key:
            raise ValueError(f"Missing {KEY_ENV}. Use a dedicated testnet wallet.")
        try:
            self.account = eth_account.Account.from_key(
                private_key if private_key.startswith("0x") else f"0x{private_key}"
            )
        except Exception:
            raise ValueError("Invalid testnet private key.") from None
        # Exchange creates its own Info client; a second Info client is unnecessary.
        self.exchange = Exchange(self.account, TESTNET_URL, timeout=15)

    def place_maker_limit_order(
        self,
        coin: str,
        is_buy: bool,
        sz: float,
        limit_price: float,
        reduce_only: bool = False,
    ) -> dict:
        if self.exchange.base_url != TESTNET_URL:
            raise RuntimeError("Non-testnet endpoint blocked before order submission.")
        if not isinstance(coin, str) or not coin.strip():
            raise ValueError("Asset must be a non-empty string.")
        if not isinstance(is_buy, bool) or not isinstance(reduce_only, bool):
            raise ValueError("Side and reduce_only must be booleans.")
        for label, value in (("Size", sz), ("Limit price", limit_price)):
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(f"{label} must be numeric.")
            if not math.isfinite(value) or value <= 0:
                raise ValueError(f"{label} must be finite and positive.")
        LOGGER.info(
            "TESTNET order | %s | %s | size=%s | price=%s | post-only",
            coin, "BUY" if is_buy else "SELL", sz, limit_price,
        )
        result = self.exchange.order(
            name=coin,
            is_buy=is_buy,
            sz=sz,
            limit_px=limit_price,
            order_type={"limit": {"tif": "Alo"}},
            reduce_only=reduce_only,
        )
        self._parse_execution_response(result)
        return result

    @staticmethod
    def _parse_execution_response(response: dict):
        if not isinstance(response, dict) or response.get("status") != "ok":
            raise RuntimeError("Testnet API rejected the request.")
        body = response.get("response")
        data = body.get("data") if isinstance(body, dict) else None
        statuses = data.get("statuses") if isinstance(data, dict) else None
        if not isinstance(statuses, list) or not statuses:
            raise RuntimeError("Testnet response has no order status.")
        for status in statuses:
            if not isinstance(status, dict):
                raise RuntimeError("Unrecognized testnet order status.")
            if "error" in status:
                raise RuntimeError("Testnet rejected the order; check funds and order constraints.")
            if "resting" in status:
                LOGGER.info("TESTNET order resting: %s", status["resting"])
            elif "filled" in status:
                LOGGER.info("TESTNET order filled: %s", status["filled"])
            else:
                raise RuntimeError("Unrecognized testnet order status.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--submit-testnet-order", action="store_true",
        help="Submit the demo order to TESTNET (it may fill or remain open).",
    )
    args = parser.parse_args(argv)
    # Safe default: no key read, client initialization, or network requests.
    if not args.submit_testnet_order:
        print("Preview only — no connection or order submitted.")
        print(f"Endpoint: {TESTNET_URL}")
        print("Demo: BUY 0.001 BTC at $30,000, post-only (ALO).")
        print("A resting order can fill later; acceptance is not guaranteed.")
        print(f"To submit, configure {KEY_ENV} for a dedicated testnet wallet")
        print("and run with --submit-testnet-order. Never use a funded mainnet key.")
        return 0
    try:
        key = os.getenv(KEY_ENV)
        if not key:
            LOGGER.error("Missing %s; no order submitted.", KEY_ENV)
            return 1
        engine = ZetaExecutionEngine(key)
        engine.place_maker_limit_order("BTC", True, 0.001, 30000.0)
        return 0
    except Exception as error:
        # Do not echo SDK exceptions: they may contain request details.
        LOGGER.error(
            "Testnet submission failed (%s). Check the testnet account before retrying; "
            "a network failure does not prove the order was rejected.",
            type(error).__name__,
        )
        return 1


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    sys.exit(main())