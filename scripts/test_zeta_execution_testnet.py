"""Offline tests: all wallet construction and exchange access are mocked."""

import unittest
from unittest.mock import Mock, patch

import zeta_execution_testnet as zeta


class TestTestnetExecution(unittest.TestCase):
    def setUp(self):
        wallet_patch = patch.object(zeta.eth_account.Account, "from_key")
        exchange_patch = patch.object(zeta, "Exchange")
        self.wallet = wallet_patch.start()
        self.exchange_class = exchange_patch.start()
        self.addCleanup(wallet_patch.stop)
        self.addCleanup(exchange_patch.stop)
        self.exchange = self.exchange_class.return_value
        self.exchange.base_url = zeta.TESTNET_URL
        self.exchange.order.return_value = {
            "status": "ok",
            "response": {"data": {"statuses": [{"resting": {"oid": 123}}]}},
        }

    def engine(self):
        # Deliberately invalid text: no actual wallet key is used.
        return zeta.ZetaExecutionEngine("mock-key")

    def test_constructor_is_pinned_to_testnet(self):
        self.engine()
        self.exchange_class.assert_called_once_with(
            self.wallet.return_value, zeta.TESTNET_URL, timeout=15
        )

    def test_preview_does_not_read_secrets_or_connect(self):
        with patch.object(zeta.os, "getenv") as getenv:
            self.assertEqual(zeta.main([]), 0)
            getenv.assert_not_called()
        self.exchange_class.assert_not_called()
        self.wallet.assert_not_called()

    def test_missing_testnet_key_does_not_use_mainnet_key(self):
        with patch.object(zeta.os, "getenv", return_value=None) as getenv:
            self.assertEqual(zeta.main(["--submit-testnet-order"]), 1)
            getenv.assert_called_once_with("HYPERLIQUID_TESTNET_PRIVATE_KEY")
        self.exchange_class.assert_not_called()

    def test_explicit_submission_uses_alo(self):
        with patch.object(zeta.os, "getenv", return_value="mock-key"):
            self.assertEqual(zeta.main(["--submit-testnet-order"]), 0)
        self.exchange.order.assert_called_once_with(
            name="BTC", is_buy=True, sz=0.001, limit_px=30000.0,
            order_type={"limit": {"tif": "Alo"}}, reduce_only=False,
        )

    def test_mainnet_endpoint_is_blocked(self):
        engine = self.engine()
        self.exchange.base_url = zeta.constants.MAINNET_API_URL
        with self.assertRaises(RuntimeError):
            engine.place_maker_limit_order("BTC", True, 0.001, 30000)
        self.exchange.order.assert_not_called()

    def test_sdk_endpoint_change_is_blocked(self):
        with patch.object(zeta.constants, "TESTNET_API_URL", "https://example.invalid"):
            with self.assertRaises(RuntimeError):
                self.engine()
        self.exchange_class.assert_not_called()

    def test_invalid_values_are_blocked(self):
        engine = self.engine()
        for value in (0, -1, float("nan"), float("inf"), True, "1"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    engine.place_maker_limit_order("BTC", True, value, 30000)
                with self.assertRaises(ValueError):
                    engine.place_maker_limit_order("BTC", True, 0.001, value)
        self.exchange.order.assert_not_called()

    def test_rejections_and_malformed_responses_fail(self):
        for response in (
            {"status": "err"},
            {"status": "ok", "response": {"data": {"statuses": [{"error": "rejected"}]}}},
            {"status": "ok", "response": {"data": {"statuses": []}}},
            {"status": "ok", "response": None},
        ):
            with self.subTest(response=response):
                with self.assertRaises(RuntimeError):
                    zeta.ZetaExecutionEngine._parse_execution_response(response)

    def test_transport_failure_does_not_retry(self):
        self.exchange.order.side_effect = TimeoutError("mock timeout")
        with patch.object(zeta.os, "getenv", return_value="mock-key"):
            self.assertEqual(zeta.main(["--submit-testnet-order"]), 1)
        self.exchange.order.assert_called_once()


if __name__ == "__main__":
    unittest.main()