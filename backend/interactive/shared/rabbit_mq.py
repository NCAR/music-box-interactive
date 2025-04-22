import logging
import json
import os
import pika

logger = logging.getLogger(__name__)

# Global RabbitMQ connection
connection = None

# fallback to defaults
RABBIT_HOST = os.getenv("RABBIT_MQ_HOST", "localhost")
RABBIT_PORT = int(os.getenv("RABBIT_MQ_PORT", "5672"))
RABBIT_USER = os.getenv("RABBIT_MQ_USER", "guest")
RABBIT_PASSWORD = os.getenv("RABBIT_MQ_PASSWORD", "guest")


class RabbitConfig:
    def __init__(self, exchange='musicbox_interactive',
                 host=RABBIT_HOST,
                 port=RABBIT_PORT,
                 user=RABBIT_USER,
                 password=RABBIT_PASSWORD):
        if not exchange:
            raise ValueError(f"An exchange must be specified.")
        if not host:
            raise ValueError(f"You must specify a host.")
        if not port:
            raise ValueError(f"You must specify a port.")
        if not password:
            raise ValueError(f"You must specify a password.")
        if not user:
            raise ValueError(f"You must specify a user.")

        self.exchange = exchange
        self.host = host
        self.port = port
        self.user = user
        self.password = password


class ConsumerConfig:
    def __init__(self, route_keys=None, callback=None):
        if not route_keys:
            raise ValueError(f"At least one route key must be supplied.")
        if not callback:
            raise ValueError(
                f"A callback must be supplied when consuming from a message queue.")
        self.route_keys = route_keys
        self.callback = callback


def publish_message(route_key, message, rabbit_config=RabbitConfig()):
    """
    Publishes a message on a queue
    """
    if not route_key:
        raise ValueError("You must supply a route key.")
    if not message:
        raise ValueError("Message must at least be an empty dict.")

    # create connection parameters
    credentials = pika.PlainCredentials(
        rabbit_config.user, rabbit_config.password)
    connParam = pika.ConnectionParameters(
        rabbit_config.host, rabbit_config.port, credentials=credentials)

    # setup a connection
    with pika.BlockingConnection(connParam) as connection:
        # start a channel and declare an exchange
        channel = connection.channel()
        channel.exchange_declare(
            rabbit_config.exchange, exchange_type='direct')

        # publish
        channel.basic_publish(exchange=rabbit_config.exchange,
                              routing_key=route_key,
                              body=json.dumps(message))


def consume(consumer_configs, rabbit_config=RabbitConfig()):
    """
    Setup a consumer for a queue. The queue and callback must be supplied
    """
    global connection

    # create connection parameters
    credentials = pika.PlainCredentials(
        rabbit_config.user, rabbit_config.password)
    connParam = pika.ConnectionParameters(
        rabbit_config.host, rabbit_config.port, credentials=credentials)

    # setup a connection
    connection = pika.BlockingConnection(connParam)

    # start a channel and declare an exchange
    channel = connection.channel()
    channel.exchange_declare(
        rabbit_config.exchange, exchange_type='direct')

    # set prefetch count to 1 to ensure that only one message is processed at a time
    channel.basic_qos(prefetch_count=1)

    # loop through each consumer and generate a queue with a random name
    for consumer in consumer_configs:
        # bind the route keys to the queue
        for key in consumer.route_keys:
            result = channel.queue_declare(queue=key)
            queue_name = result.method.queue
            logger.info(f"Binding {key} to {queue_name} on {rabbit_config.exchange}")
            channel.queue_bind(
                exchange=rabbit_config.exchange,
                queue=queue_name,
                routing_key=key)

        # setup a callback for this queue
        channel.basic_consume(queue=queue_name,
                              on_message_callback=consumer.callback,
                              auto_ack=False)

    route_keys = [
        key for consumer in consumer_configs for key in consumer.route_keys]
    logger.info(f"Consuming for keys: {', '.join(route_keys)}")
    try:
        # start consuming on all queues
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()


def acknowledge_and_pause_consumer(ch, method):
    """
    Acknowledges the current message and pauses the consumer
    """
    global connection
    ch.basic_qos(prefetch_count=0)
    ch.basic_ack(delivery_tag=method.delivery_tag)
    connection.close()
    connection = None


def rabbit_is_available():
    """
    Determine if rabbit mq is accepting connections
    """
    try:
        credentials = pika.PlainCredentials(RABBIT_USER, RABBIT_PASSWORD)
        connParam = pika.ConnectionParameters(
            RABBIT_HOST, RABBIT_PORT, credentials=credentials)
        with pika.BlockingConnection(connParam) as connection:
            return connection.is_open
    except pika.exceptions.AMQPConnectionError as e:
        logger.exception(f"Failed to connect to RabbitMQ: {e}")
        return False
