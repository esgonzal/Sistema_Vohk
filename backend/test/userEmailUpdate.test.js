const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const userRepository = require('../repositories/userRepository');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === '../vohk_app/emailService') return {};
    return originalLoad.call(this, request, parent, isMain);
};
const userService = require('../services/vohk_app/userService');
Module._load = originalLoad;

const originalRepository = {
    findById: userRepository.findById,
    findByEmail: userRepository.findByEmail,
    findByUsername: userRepository.findByUsername,
    updateEmail: userRepository.updateEmail,
};

test.afterEach(() => {
    Object.assign(userRepository, originalRepository);
});

test('email-derived username follows a self-service email change', async () => {
    const calls = [];
    userRepository.findById = async () => ({
        user_id: 'user-1',
        username: 'old@example.com',
        email: 'OLD@example.com',
    });
    userRepository.findByEmail = async () => null;
    userRepository.findByUsername = async () => null;
    userRepository.updateEmail = async (userId, email) => {
        calls.push({ userId, email });
        return { user_id: userId, username: email, email };
    };

    const updated = await userService.updateEmail('user-1', ' New@Example.com ');

    assert.deepEqual(calls, [{ userId: 'user-1', email: 'new@example.com' }]);
    assert.equal(updated.username, 'new@example.com');
});

test('custom username remains unchanged when email changes', async () => {
    userRepository.findById = async () => ({
        user_id: 'user-1',
        username: 'esgonzal',
        email: 'old@example.com',
    });
    userRepository.findByEmail = async () => null;
    userRepository.findByUsername = async () => {
        throw new Error('custom usernames must not be replaced or checked against the new email');
    };
    userRepository.updateEmail = async (userId, email) => ({
        user_id: userId,
        username: 'esgonzal',
        email,
    });

    const updated = await userService.updateEmail('user-1', 'new@example.com');

    assert.equal(updated.username, 'esgonzal');
    assert.equal(updated.email, 'new@example.com');
});

test('email and derived username collisions are rejected', async t => {
    await t.test('duplicate email', async () => {
        userRepository.findById = async () => ({ user_id: 'user-1', username: 'old@example.com', email: 'old@example.com' });
        userRepository.findByEmail = async () => ({ user_id: 'user-2' });
        await assert.rejects(
            userService.updateEmail('user-1', 'used@example.com'),
            error => error.status === 409 && error.message === 'Email is already in use',
        );
    });

    await t.test('duplicate derived username', async () => {
        userRepository.findById = async () => ({ user_id: 'user-1', username: 'old@example.com', email: 'old@example.com' });
        userRepository.findByEmail = async () => null;
        userRepository.findByUsername = async () => ({ user_id: 'user-2' });
        await assert.rejects(
            userService.updateEmail('user-1', 'taken-username@example.com'),
            error => error.status === 409 && error.message === 'Username is already in use',
        );
    });
});
