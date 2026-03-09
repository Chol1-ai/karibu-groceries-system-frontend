const stripTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '');

const readRawBody = (req) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
        req.on('error', reject);
    });

module.exports = async (req, res) => {
    const backendBase = stripTrailingSlashes(process.env.KGL_BACKEND_URL);
    if (!backendBase) {
        return res.status(500).json({
            status: 'error',
            message: 'Missing KGL_BACKEND_URL on Vercel',
        });
    }

    const rawUrl = String(req.url || '');
    const queryStart = rawUrl.indexOf('?');
    const pathname = queryStart >= 0 ? rawUrl.slice(0, queryStart) : rawUrl;
    const query = queryStart >= 0 ? rawUrl.slice(queryStart) : '';
    const upstreamPath = pathname.replace(/^\/api\/v1\/?/, '');
    const suffix = upstreamPath ? `/${upstreamPath}` : '';
    const targetUrl = `${backendBase}/api/v1${suffix}${query}`;

    const outgoingHeaders = { ...req.headers };
    delete outgoingHeaders.host;
    delete outgoingHeaders['content-length'];
    delete outgoingHeaders.connection;
    delete outgoingHeaders['x-forwarded-host'];
    delete outgoingHeaders['x-forwarded-port'];
    delete outgoingHeaders['x-forwarded-proto'];

    const method = String(req.method || 'GET').toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';

    let body;
    if (hasBody) {
        if (Buffer.isBuffer(req.body)) body = req.body;
        else if (typeof req.body === 'string') body = req.body;
        else if (req.body && Object.keys(req.body).length > 0) body = JSON.stringify(req.body);
        else body = await readRawBody(req);
    }

    try {
        const upstream = await fetch(targetUrl, {
            method,
            headers: outgoingHeaders,
            body,
            redirect: 'manual',
        });

        res.status(upstream.status);

        upstream.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'transfer-encoding') return;
            if (key.toLowerCase() === 'content-encoding') return;
            res.setHeader(key, value);
        });

        const setCookie = upstream.headers.get('set-cookie');
        if (setCookie) res.setHeader('set-cookie', setCookie);

        if (method === 'HEAD' || upstream.status === 204) {
            return res.end();
        }

        const responseBuffer = Buffer.from(await upstream.arrayBuffer());
        return res.send(responseBuffer);
    } catch (error) {
        return res.status(502).json({
            status: 'error',
            message: 'Failed to reach backend service',
            detail: error.message,
        });
    }
};
