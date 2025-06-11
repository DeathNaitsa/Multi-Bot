 const { createHash } = require('crypto');
 function computeSn(id) {
  // 1) alter MD5-Hash
  const md5 = createHash('md5').update(id).digest('hex');
  // 2) HMAC-SHA256 über das Ergebnis
  return md5
}
module.exports = {computeSn}