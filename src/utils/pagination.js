function getPaginationParams(req) {
    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT = 50;
    let limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const offset = parseInt(req.query.offset) || 0;
    return { limit, offset };
}
module.exports = {getPaginationParams};