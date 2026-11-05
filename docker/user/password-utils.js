'use strict';

const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const HASH_PREFIX = 'scrypt$';

function constantTimeStringEqual(left, right) {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('password must be a non-empty string');
  }

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `${HASH_PREFIX}${salt.toString('hex')}$${Buffer.from(derivedKey).toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
  if (typeof password !== 'string' || typeof storedPassword !== 'string') {
    return { valid: false, needsRehash: false };
  }

  // Existing project accounts used plaintext passwords. Accept them once so a
  // successful login can transparently migrate the stored value to scrypt.
  if (!storedPassword.startsWith(HASH_PREFIX)) {
    return {
      valid: constantTimeStringEqual(password, storedPassword),
      needsRehash: true,
    };
  }

  const parts = storedPassword.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt' ||
      !/^[0-9a-f]+$/i.test(parts[1]) || !/^[0-9a-f]+$/i.test(parts[2])) {
    return { valid: false, needsRehash: false };
  }

  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) {
    return { valid: false, needsRehash: false };
  }

  const actual = Buffer.from(await scryptAsync(password, salt, KEY_LENGTH));
  return {
    valid: timingSafeEqual(actual, expected),
    needsRehash: false,
  };
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
  };
}

module.exports = { hashPassword, verifyPassword, toPublicUser };
