const { PassThrough, Readable } = require('stream');
const condominiumRepository = require('../../repositories/condominiumRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
const deviceRepository = require('../../repositories/deviceRepository');

const SAMPLE_RATE = 8000;
const TALK_CHANNEL = 1;

function httpError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function getAuthorizedIntercom(deviceId, user) {
    const intercom = await deviceRepository.findIntercomByDeviceId(deviceId);
    if (!intercom || !intercom.condominium_id) {
        throw httpError('Intercom not found', 404);
    }

    if (user.role === 'admin') {
        const condominium = await condominiumRepository.findByIdAndAdmin(intercom.condominium_id, user.userId);
        if (!condominium) throw httpError('Forbidden', 403);
    } else if (user.role === 'resident') {
        const unit = await residentUnitRepository.findByUserAndCondominium(user.userId, intercom.condominium_id);
        if (!unit) throw httpError('Forbidden', 403);
    } else {
        throw httpError('Forbidden', 403);
    }

    return intercom;
}

function normalizeCodec(channelXml) {
    const match = channelXml.match(/<audioCompressionType>\s*([^<]+)\s*<\/audioCompressionType>/i);
    const value = (match?.[1] || '').trim().toLowerCase();
    if (value.includes('711') && (value.includes('ulaw') || value.includes('mulaw') || value.includes('mu-law'))) {
        return 'mulaw';
    }
    if (value.includes('711') && (value.includes('alaw') || value.includes('a-law'))) {
        return 'alaw';
    }
    throw new Error(`Unsupported intercom talk codec: ${match?.[1] || 'unknown'}. Configure channel 1 for G.711ulaw or G.711alaw.`);
}

function pcm16ToMuLaw(sample) {
    const BIAS = 0x84;
    const CLIP = 32635;
    let sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    sample = Math.min(sample, CLIP) + BIAS;
    let exponent = Math.floor(Math.log2(sample)) - 7;
    exponent = Math.max(0, Math.min(7, exponent));
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

function muLawToPcm16(value) {
    const BIAS = 0x84;
    value = (~value) & 0xff;
    const sign = value & 0x80;
    const exponent = (value >> 4) & 0x07;
    const mantissa = value & 0x0f;
    let sample = ((mantissa << 3) + BIAS) << exponent;
    sample -= BIAS;
    return sign !== 0 ? -sample : sample;
}

function pcm16ToALaw(sample) {
    let pcm = sample >> 3;
    const mask = pcm >= 0 ? 0xd5 : 0x55;
    if (pcm < 0) pcm = -pcm - 1;

    const segmentEnds = [0x1f, 0x3f, 0x7f, 0xff, 0x1ff, 0x3ff, 0x7ff, 0xfff];
    let segment = 0;
    while (segment < segmentEnds.length && pcm > segmentEnds[segment]) segment += 1;
    if (segment >= 8) return 0x7f ^ mask;

    let value = segment << 4;
    value |= segment < 2 ? (pcm >> 1) & 0x0f : (pcm >> segment) & 0x0f;
    return value ^ mask;
}

function aLawToPcm16(value) {
    value ^= 0x55;
    let sample = (value & 0x0f) << 4;
    const segment = (value & 0x70) >> 4;
    if (segment === 0) {
        sample += 8;
    } else if (segment === 1) {
        sample += 0x108;
    } else {
        sample += 0x108;
        sample <<= segment - 1;
    }
    return (value & 0x80) !== 0 ? sample : -sample;
}

function encodePcm16(pcm, codec) {
    const samples = Math.floor(pcm.length / 2);
    const encoded = Buffer.allocUnsafe(samples);
    for (let index = 0; index < samples; index += 1) {
        const sample = pcm.readInt16LE(index * 2);
        encoded[index] = codec === 'mulaw' ? pcm16ToMuLaw(sample) : pcm16ToALaw(sample);
    }
    return encoded;
}

function decodeG711(encoded, codec) {
    const pcm = Buffer.allocUnsafe(encoded.length * 2);
    for (let index = 0; index < encoded.length; index += 1) {
        const sample = codec === 'mulaw' ? muLawToPcm16(encoded[index]) : aLawToPcm16(encoded[index]);
        pcm.writeInt16LE(sample, index * 2);
    }
    return pcm;
}

async function createDigestClient(intercom) {
    const DigestFetch = (await import('digest-fetch')).default;
    return new DigestFetch(intercom.username, intercom.password_encrypted);
}

async function checkedFetch(client, url, options, operation) {
    const response = await client.fetch(url, options);
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`${operation} failed (${response.status})${detail ? `: ${detail}` : ''}`);
    }
    return response;
}

function nodeReadable(body) {
    if (!body) throw new Error('Intercom returned an empty audio stream');
    if (typeof body.on === 'function') return body;
    return Readable.fromWeb(body);
}

class HikvisionTalkSession {
    constructor(intercom, onAudio, onError) {
        this.intercom = intercom;
        this.onAudio = onAudio;
        this.onError = onError;
        this.codec = null;
        this.upload = null;
        this.download = null;
        this.controlClient = null;
        this.closed = false;
    }

    get baseUrl() {
        return `http://${this.intercom.ip_address}:${this.intercom.port}/ISAPI/System/TwoWayAudio/channels/${TALK_CHANNEL}`;
    }

    async warmClient(client) {
        const response = await checkedFetch(
            client,
            `http://${this.intercom.ip_address}:${this.intercom.port}/ISAPI/System/TwoWayAudio/channels`,
            { method: 'GET' },
            'Reading two-way audio capabilities'
        );
        return response.text();
    }

    async start() {
        if (this.closed) throw new Error('Talk session was cancelled');
        this.controlClient = await createDigestClient(this.intercom);
        const channelXml = await this.warmClient(this.controlClient);
        if (this.closed) throw new Error('Talk session was cancelled');
        this.codec = normalizeCodec(channelXml);

        await checkedFetch(this.controlClient, `${this.baseUrl}/open`, { method: 'PUT' }, 'Opening two-way audio');
        if (this.closed) throw new Error('Talk session was cancelled');

        try {
            const [downloadClient, uploadClient] = await Promise.all([
                createDigestClient(this.intercom),
                createDigestClient(this.intercom),
            ]);
            await Promise.all([this.warmClient(downloadClient), this.warmClient(uploadClient)]);
            if (this.closed) throw new Error('Talk session was cancelled');

            const downloadResponse = await checkedFetch(
                downloadClient,
                `${this.baseUrl}/audioData`,
                { method: 'GET', headers: { Accept: 'application/octet-stream' } },
                'Starting intercom audio download'
            );
            if (this.closed) throw new Error('Talk session was cancelled');
            this.download = nodeReadable(downloadResponse.body);
            this.download.on('data', (chunk) => {
                if (!this.closed && chunk.length > 0) this.onAudio(decodeG711(Buffer.from(chunk), this.codec));
            });
            this.download.on('error', (error) => this.fail(error));
            this.download.on('end', () => {
                if (!this.closed) this.fail(new Error('Intercom audio stream ended'));
            });

            this.upload = new PassThrough({ highWaterMark: 32 * 1024 });
            this.uploadRequest = checkedFetch(
                uploadClient,
                `${this.baseUrl}/audioData`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: this.upload,
                    duplex: 'half',
                },
                'Starting intercom audio upload'
            ).catch((error) => this.fail(error));
        } catch (error) {
            await this.close();
            throw error;
        }

        return { codec: this.codec, sampleRate: SAMPLE_RATE };
    }

    writePcm(pcm) {
        if (this.closed || !this.upload || !Buffer.isBuffer(pcm) || pcm.length < 2) return;
        if (this.upload.writableLength > 256 * 1024) return;
        const evenLength = pcm.length - (pcm.length % 2);
        this.upload.write(encodePcm16(pcm.subarray(0, evenLength), this.codec));
    }

    fail(error) {
        if (!this.closed) this.onError(error);
    }

    async close() {
        if (this.closed) return;
        this.closed = true;
        this.upload?.end();
        this.download?.destroy();
        if (this.controlClient) {
            await this.controlClient.fetch(`${this.baseUrl}/close`, { method: 'PUT' }).catch(() => null);
        }
    }
}

module.exports = { getAuthorizedIntercom, HikvisionTalkSession, SAMPLE_RATE };
