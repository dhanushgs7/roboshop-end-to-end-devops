'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, toPublicUser } = require('../password-utils');

test('hashPassword stores a salted scrypt hash rather than the raw password', async () => {
  const password = 'correct-horse-battery-staple';
  const stored = await hashPassword(password);

  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.notEqual(stored, password);
  assert.equal((await verifyPassword(password, stored)).valid, true);
});

test('each password hash uses a unique salt', async () => {
  const first = await hashPassword('same-password');
  const second = await hashPassword('same-password');

  assert.notEqual(first, second);
  assert.notEqual(first.split('$')[1], second.split('$')[1]);
});

test('verifyPassword rejects an incorrect password', async () => {
  const stored = await hashPassword('correct-password');
  const result = await verifyPassword('incorrect-password', stored);

  assert.deepEqual(result, { valid: false, needsRehash: false });
});

test('legacy plaintext passwords are accepted only for migration on successful login', async () => {
  assert.deepEqual(await verifyPassword('legacy-password', 'legacy-password'), {
    valid: true,
    needsRehash: true,
  });
  assert.deepEqual(await verifyPassword('wrong-password', 'legacy-password'), {
    valid: false,
    needsRehash: true,
  });
});

test('malformed scrypt values are rejected', async () => {
  assert.deepEqual(await verifyPassword('password', 'scrypt$bad$salt'), {
    valid: false,
    needsRehash: false,
  });
});

test('toPublicUser never includes password or unrelated internal fields', () => {
  const user = {
    _id: 'user-id',
    name: 'alice',
    email: 'alice@example.com',
    password: 'scrypt$secret',
    internalFlag: true,
  };

  assert.deepEqual(toPublicUser(user), {
    _id: 'user-id',
    name: 'alice',
    email: 'alice@example.com',
  });
});
