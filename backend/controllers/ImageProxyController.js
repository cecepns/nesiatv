/* eslint-disable no-undef */
/* eslint-env node */
const axios = require('axios');

async function proxy(req, res) {
  let targetUrl = '';
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ error: 'Query parameter url is required' });
    }

    targetUrl = decodeURIComponent(rawUrl.trim());
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid url protocol' });
    }

    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
    return res.send(Buffer.from(response.data));
  } catch (err) {
    console.warn('Image proxy error:', err.message);
    const status = err.response?.status;
    return res.status(status && status >= 400 ? status : 502).json({ error: 'Upstream image proxy error', message: err.message });
  }
}

module.exports = { proxy };
