import unittest
from unittest.mock import Mock, patch

from payment import app, countItems


class PaymentServiceTests(unittest.TestCase):
    def setUp(self):
        import payment
        payment.sold_count = 0
        self.client = app.test_client()
        self.cart = {
            "total": 120,
            "tax": 20,
            "items": [
                {"sku": "SKU-1", "qty": 2, "price": 50, "subtotal": 100},
                {"sku": "SHIP", "qty": 1, "price": 20, "subtotal": 20},
            ],
        }

    def test_health_returns_ok(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_data(as_text=True), "OK")

    def test_count_items_excludes_shipping(self):
        self.assertEqual(countItems(self.cart["items"]), 2)

    def test_metrics_exposes_order_counter(self):
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("roboshop_payment_orders_published_total 0", response.get_data(as_text=True))

    @patch("payment.publisher")
    @patch("payment.requests.delete")
    @patch("payment.requests.get")
    def test_anonymous_payment_publishes_and_deletes_cart(self, mock_get, mock_delete, mock_publisher):
        mock_get.side_effect = [Mock(status_code=404), Mock(status_code=200)]
        mock_delete.return_value = Mock(status_code=200)

        response = self.client.post("/pay/anonymous-123", json=self.cart)

        self.assertEqual(response.status_code, 200)
        self.assertIn("orderid", response.get_json())
        mock_publisher.publish.assert_called_once()
        self.assertIn("roboshop_payment_orders_published_total 1", self.client.get("/metrics").get_data(as_text=True))
        mock_delete.assert_called_once()

    @patch("payment.publisher")
    @patch("payment.requests.delete")
    @patch("payment.requests.post")
    @patch("payment.requests.get")
    def test_registered_payment_updates_history(self, mock_get, mock_post, mock_delete, mock_publisher):
        mock_get.side_effect = [Mock(status_code=200), Mock(status_code=200)]
        mock_post.return_value = Mock(status_code=200)
        mock_delete.return_value = Mock(status_code=200)

        response = self.client.post("/pay/alice", json=self.cart)

        self.assertEqual(response.status_code, 200)
        mock_post.assert_called_once()
        mock_publisher.publish.assert_called_once()
        mock_delete.assert_called_once()

    @patch("payment.requests.get")
    def test_payment_rejects_cart_without_shipping(self, mock_get):
        mock_get.return_value = Mock(status_code=404)
        cart = {"total": 100, "items": [{"sku": "SKU-1", "qty": 1}]}

        response = self.client.post("/pay/anonymous-123", json=cart)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_data(as_text=True), "cart not valid")

    @patch("payment.requests.get")
    def test_payment_rejects_zero_total(self, mock_get):
        mock_get.return_value = Mock(status_code=404)
        cart = {"total": 0, "items": [{"sku": "SHIP", "qty": 1}]}

        response = self.client.post("/pay/anonymous-123", json=cart)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_data(as_text=True), "cart not valid")

    @patch("payment.requests.get")
    def test_payment_gateway_failure_does_not_publish(self, mock_get):
        mock_get.side_effect = [Mock(status_code=404), Mock(status_code=502)]

        with patch("payment.publisher") as mock_publisher:
            response = self.client.post("/pay/anonymous-123", json=self.cart)

        self.assertEqual(response.status_code, 502)
        mock_publisher.publish.assert_not_called()


if __name__ == "__main__":
    unittest.main()
