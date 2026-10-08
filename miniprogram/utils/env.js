const CLOUD_ENV_ID = 'void-prod-d7gncmu1ua9c18208'
function getCloudEnvId() {
  try { return String(wx.getStorageSync('void_cloud_env') || CLOUD_ENV_ID || '').trim() } catch (error) { return CLOUD_ENV_ID }
}
function setCloudEnvId(envId) {
  const value = String(envId || '').trim()
  if (!value) return
  wx.setStorageSync('void_cloud_env', value)
}
module.exports = { CLOUD_ENV_ID, getCloudEnvId, setCloudEnvId }
