// Vercel serverless function: /api/diary
'use strict';

const { handle } = require('../lib/handler');

module.exports = async (req, res) => {
  const out = await handle({ method: req.method, query: req.query, body: req.body });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(out.status).send(JSON.stringify(out.body));
};
