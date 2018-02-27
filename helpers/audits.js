async function recordAction(req, action, table, data) {
  await req.db.audits.create({
    email: req.session.email,
    action,
    table,
    data
  });
}
module.exports = {
  recordAction
};
