const connections = new Map();
const addConnection = (userId, response) => {
  const key = String(userId);
  if (!connections.has(key)) connections.set(key, new Set());
  connections.get(key).add(response);
  return () => {
    const group = connections.get(key);
    if (!group) return;
    group.delete(response);
    if (!group.size) connections.delete(key);
  };
};
const forceLogout = (userId) => {
  const group = connections.get(String(userId));
  if (!group) return;
  for (const response of group) {
    response.write(`event: logout\ndata: ${JSON.stringify({ reason: "Account deactivated" })}\n\n`);
    response.end();
  }
  connections.delete(String(userId));
};
module.exports = { addConnection, forceLogout };
