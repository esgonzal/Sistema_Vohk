const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

const backend = path.resolve(__dirname, '..');

async function launch(entry, portVariable) {
    const child = spawn(process.execPath, [
        '--require', path.join(__dirname, 'fixtures/apiProcessGuard.js'),
        path.join(backend, entry),
    ], {
        // Intentionally start outside backend to exercise .env/path handling.
        cwd: __dirname,
        env: { ...process.env, HOST: '127.0.0.1', [portVariable]: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stop = async () => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        const ended = once(child, 'exit');
        child.kill();
        await ended;
    };
    try {
        const port = await new Promise((resolve, reject) => {
            let output = '';
            const timeout = setTimeout(() => reject(new Error(`Startup timed out: ${output}`)), 15000);
            const failed = error => { clearTimeout(timeout); reject(error); };
            child.once('error', failed);
            child.once('exit', code => failed(new Error(`Startup exited ${code}: ${output}`)));
            child.stderr.on('data', chunk => { output += chunk; });
            child.stdout.on('data', chunk => {
                output += chunk;
                const match = output.match(/Listening on .*"port":(\d+)/);
                if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
            });
        });
        return { url: `http://127.0.0.1:${port}`, stop };
    } catch (error) {
        await stop();
        throw error;
    }
}

async function request(api, route, body) {
    return fetch(api.url + route, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
    });
}

test('real API entry points preserve contracts and survive an independent VOHK restart', async t => {
    const university = await launch('server-university.js', 'UNIVERSITY_PORT');
    t.after(university.stop);
    const legacy = await launch('server-legacy.js', 'LEGACY_PORT');
    t.after(legacy.stop);
    const integrations = await launch('server-integrations.js', 'INTEGRATIONS_PORT');
    t.after(integrations.stop);
    const vohk = await launch('server-vohk.js', 'VOHK_PORT');
    t.after(vohk.stop);

    for (const [api, service] of [
        [university, 'university-api'], [legacy, 'legacy-api'],
        [integrations, 'integrations-api'], [vohk, 'vohk-api'],
    ]) {
        assert.deepEqual(await (await request(api, '/healthz')).json(), { service, status: 'ok' });
    }
    assert.equal((await request(university, '/v1/user/register', {})).status, 400);
    assert.equal((await request(vohk, '/api/auth/login', {})).status, 400);
    assert.deepEqual(await (await request(integrations, '/monday/consult', { challenge: 'test' })).json(), { challenge: 'test' });
    assert.equal((await request(legacy, '/mail/sendEkeySummary', {})).status, 400);

    // A service must not accidentally mount another service's routes.
    for (const api of [legacy, integrations, vohk]) {
        assert.equal((await request(api, '/v1/user/register', {})).status, 404);
    }
    for (const api of [university, legacy, integrations]) {
        assert.equal((await request(api, '/api/auth/login', {})).status, 404);
    }
    for (const api of [university, legacy, vohk]) {
        assert.equal((await request(api, '/monday/consult', { challenge: 'test' })).status, 404);
    }

    // Missing auth rejects a WebSocket upgrade without contacting an intercom.
    const http = require('http');
    const upgradeStatus = await new Promise((resolve, reject) => {
        const req = http.get(vohk.url + '/api/intercom-talk?deviceId=test', {
            headers: { Connection: 'Upgrade', Upgrade: 'websocket',
                'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' },
        }, res => { res.resume(); resolve(res.statusCode); });
        req.on('error', reject);
        req.setTimeout(5000, () => req.destroy(new Error('Upgrade timed out')));
    });
    assert.equal(upgradeStatus, 401);

    await vohk.stop();
    assert.equal((await request(university, '/v1/user/register', {})).status, 400);
    assert.equal((await request(integrations, '/healthz')).status, 200);
    const restarted = await launch('server-vohk.js', 'VOHK_PORT');
    t.after(restarted.stop);
    assert.equal((await request(restarted, '/healthz')).status, 200);
    assert.equal((await request(university, '/healthz')).status, 200);
});
