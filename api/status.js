const L = require('./_lib');
module.exports = L.handler(async (req, res) => {
  const acct = await L.getJ('srimaa:acct');
  L.send(res, 200, { setup: !!acct, needCode: !!L.env('SETUP_CODE') });
});
