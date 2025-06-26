const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/proxy?url=...
router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.instagram.com/',
      }
    });
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    response.data.pipe(res);
  } catch (err) {
    res.status(500).send('Proxy error');
  }
});

module.exports = router; 