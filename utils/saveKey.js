function generateSaveKey() {
  // 4 Blöcke à 4 Zeichen, z.B. A1B2-C3D4-E5F6-G7H8
  return Array(4)
    .fill(0)
    .map(() => Math.random().toString(36).substr(2, 4).toUpperCase())
    .join('-');
}

module.exports = { generateSaveKey };