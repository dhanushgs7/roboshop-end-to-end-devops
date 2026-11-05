'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const urls = {
  cart: process.env.CART_URL || 'http://localhost:18080',
  catalogue: process.env.CATALOGUE_URL || 'http://localhost:18081',
  user: process.env.USER_URL || 'http://localhost:18082',
  shipping: process.env.SHIPPING_URL || 'http://localhost:18083',
  payment: process.env.PAYMENT_URL || 'http://localhost:18084',
};

const cartId = `ci-smoke-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
let checkoutUserId;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  const raw = await response.text();
  let body = raw;
  try { body = JSON.parse(raw); } catch { /* Plain-text response */ }
  return { status: response.status, body, raw };
}

async function waitFor(description, fn, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`${description} did not become ready within ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ''}`);
}

async function check(name, fn) {
  await fn();
  console.log(`PASS  ${name}`);
}

async function main() {
  try {
    await check('Catalogue health and MongoDB connectivity', async () => {
      await waitFor('Catalogue health', async () => {
        const r = await request(`${urls.catalogue}/health`);
        return r.status === 200 && r.body.mongo === true;
      });
    });

    await check('User health and MongoDB connectivity', async () => {
      await waitFor('User health', async () => {
        const r = await request(`${urls.user}/health`);
        return r.status === 200 && r.body.mongo === true;
      });
    });

    await check('Cart health and Redis connectivity', async () => {
      await waitFor('Cart health', async () => {
        const r = await request(`${urls.cart}/health`);
        return r.status === 200 && r.body.redis === true;
      });
    });

    await check('Shipping health endpoint', async () => {
      const r = await request(`${urls.shipping}/health`);
      assert.equal(r.status, 200);
      assert.equal(r.body, 'OK');
    });

    await check('Payment health endpoint', async () => {
      const r = await request(`${urls.payment}/health`);
      assert.equal(r.status, 200);
      assert.equal(r.body, 'OK');
    });

    let product;
    await check('Catalogue returns seeded products', async () => {
      const r = await request(`${urls.catalogue}/products`);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body) && r.body.length > 0, 'Catalogue has no seeded products');
      product = r.body[0];
      assert.ok(product.sku && product.name);
    });

    await check('Cart adds a real catalogue product and persists it in Redis', async () => {
      const added = await request(
        `${urls.cart}/add/${encodeURIComponent(cartId)}/${encodeURIComponent(product.sku)}/2`
      );
      assert.equal(added.status, 200, added.raw);
      assert.ok(added.body.items.some(item =>
        item.sku === product.sku && item.qty === 2 &&
        item.name === product.name && item.price === product.price
      ), 'Cart line does not match catalogue product data');

      const persisted = await request(`${urls.cart}/cart/${encodeURIComponent(cartId)}`);
      assert.equal(persisted.status, 200);
      assert.ok(persisted.body.items.some(item => item.sku === product.sku && item.qty === 2));
    });

    await check('Shipping service adds the SHIP line to the cart', async () => {
      const confirmed = await request(
        `${urls.shipping}/confirm/${encodeURIComponent(cartId)}`,
        { method: 'POST', body: JSON.stringify({ distance: 100, cost: 5, location: 'CI Smoke Test' }) }
      );
      assert.equal(confirmed.status, 200, confirmed.raw);

      const cart = await request(`${urls.cart}/cart/${encodeURIComponent(cartId)}`);
      assert.equal(cart.status, 200);
      assert.ok(cart.body.items.some(item => item.sku === 'SHIP'), 'Shipping line was not persisted');
    });

    await check('Payment rejects an invalid cart before calling the payment gateway', async () => {
      const invalidId = `${cartId}-invalid`;
      const r = await request(
        `${urls.payment}/pay/${encodeURIComponent(invalidId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            total: 25,
            tax: 5,
            items: [{ sku: 'TEST-SKU', qty: 1, price: 25, subtotal: 25 }],
          }),
        }
      );
      assert.equal(r.status, 400);
      assert.match(String(r.body), /cart not valid/i);
    });

    await check('Cart and Payment expose Prometheus metrics', async () => {
      const [cartMetrics, paymentMetrics] = await Promise.all([
        request(`${urls.cart}/metrics`),
        request(`${urls.payment}/metrics`),
      ]);
      assert.equal(cartMetrics.status, 200);
      assert.match(cartMetrics.raw, /items_added/);
      assert.equal(paymentMetrics.status, 200);
      assert.match(paymentMetrics.raw, /sold_count/);
    });

    if (process.env.RUN_FULL_CHECKOUT === 'true') {
      const username = `ci-checkout-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      checkoutUserId = username;
      const password = crypto.randomBytes(16).toString('hex');
      await check('Registered-user checkout creates order history and clears the cart', async () => {
        const registered = await request(`${urls.user}/register`, {
          method: 'POST',
          body: JSON.stringify({ name: username, password, email: `${username}@example.invalid` }),
        });
        assert.equal(registered.status, 200, registered.raw);

        const login = await request(`${urls.user}/login`, {
          method: 'POST',
          body: JSON.stringify({ name: username, password }),
        });
        assert.equal(login.status, 200, login.raw);

        const added = await request(
          `${urls.cart}/add/${encodeURIComponent(username)}/${encodeURIComponent(product.sku)}/1`
        );
        assert.equal(added.status, 200, added.raw);

        const shipping = await request(
          `${urls.shipping}/confirm/${encodeURIComponent(username)}`,
          { method: 'POST', body: JSON.stringify({ distance: 100, cost: 5, location: 'CI Checkout Test' }) }
        );
        assert.equal(shipping.status, 200, shipping.raw);

        const cart = await request(`${urls.cart}/cart/${encodeURIComponent(username)}`);
        assert.equal(cart.status, 200);

        const paid = await request(`${urls.payment}/pay/${encodeURIComponent(username)}`, {
          method: 'POST',
          body: JSON.stringify(cart.body),
        });
        assert.equal(paid.status, 200, paid.raw);
        assert.ok(paid.body.orderid, 'Payment response did not contain an order ID');

        const clearedCart = await request(`${urls.cart}/cart/${encodeURIComponent(username)}`);
        assert.equal(clearedCart.status, 404, 'Cart was not deleted after payment');

        const history = await request(`${urls.user}/history/${encodeURIComponent(username)}`);
        assert.equal(history.status, 200, history.raw);
        assert.ok(history.body.history.some(order => order.orderid === paid.body.orderid), 'Order was not saved in user history');
      });
    }

    console.log('\nAll enabled RoboShop integration tests passed.');
  } finally {
    for (const id of [cartId, checkoutUserId].filter(Boolean)) {
      try {
        const cleanup = await request(`${urls.cart}/cart/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (![200, 404].includes(cleanup.status)) {
          console.warn(`WARN  cart cleanup for ${id} returned HTTP ${cleanup.status}`);
        }
      } catch (error) {
        console.warn(`WARN  cart cleanup for ${id} failed: ${error.message}`);
      }
    }
  }
}

main().catch(error => {
  console.error('\nIntegration smoke tests failed:', error);
  process.exitCode = 1;
});
