/* Jest stub for bundled audio assets (.wav/.mp3/.m4a). Metro returns a numeric
 * module id for these at runtime; tests only need a stable placeholder so the
 * sound registry can be imported and its gating logic exercised off-device. */
module.exports = 1;
