import json
import unittest
from unittest.mock import Mock, patch

from rabbitmq import Publisher


class PublisherTests(unittest.TestCase):
    @patch("rabbitmq.pika.BlockingConnection")
    def test_connect_declares_durable_exchange_queue_and_binding(self, blocking_connection):
        logger = Mock()
        connection = Mock()
        channel = Mock()
        connection.channel.return_value = channel
        blocking_connection.return_value = connection

        publisher = Publisher(logger)
        publisher._connect()

        channel.exchange_declare.assert_called_once_with(
            exchange="robot-shop", exchange_type="direct", durable=True
        )
        channel.queue_declare.assert_called_once_with(queue="orders", durable=True)
        channel.queue_bind.assert_called_once_with(
            queue="orders", exchange="robot-shop", routing_key="orders"
        )

    def test_publish_marks_order_message_as_persistent(self):
        publisher = Publisher(Mock())
        publisher._conn = Mock(is_closed=False)
        publisher._channel = Mock(is_closed=False)

        order = {"orderid": "order-123", "user": "alice", "cart": {"items": []}}
        publisher.publish(order, {"trace-id": "trace-1"})

        call = publisher._channel.basic_publish.call_args
        self.assertEqual(call.kwargs["exchange"], "robot-shop")
        self.assertEqual(call.kwargs["routing_key"], "orders")
        self.assertEqual(call.kwargs["properties"].delivery_mode, 2)
        self.assertEqual(json.loads(call.kwargs["body"]), order)


if __name__ == "__main__":
    unittest.main()
