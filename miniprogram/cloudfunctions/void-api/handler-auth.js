const core = require('./lib-core')

function publicUser (user, admin) {
  const item = user || {}
  return {
    openid: item.openid || item._id || '',
    nickname: item.nickname || '',
    avatarUrl: item.avatarUrl || '',
    phone: item.phone || '',
    level: Number(item.level || 1),
    isAdmin: !!admin,
    createdAt: item.createdAt || ''
  }
}

async function session (ctx) {
  const user = await core.ensureUser(ctx.openid)
  const admin = await core.isAdmin(ctx.openid)
  if (!!user.isAdmin !== !!admin) {
    try { await core.updateDoc(core.C.users, ctx.openid, { isAdmin: !!admin }) } catch (error) {}
  }
  return { openid: ctx.openid, user: publicUser(user, admin), admin: admin }
}

async function updateProfile (ctx) {
  const nickname = core.requireText(ctx.payload.nickname, 2, '昵称').slice(0, 20)
  const avatarUrl = String(ctx.payload.avatarUrl || '').slice(0, 512)
  await core.ensureUser(ctx.openid)
  await core.updateDoc(core.C.users, ctx.openid, {
    nickname: nickname,
    avatarUrl: avatarUrl,
    updatedAt: core.nowLocal()
  })
  const user = await core.getDoc(core.C.users, ctx.openid)
  const admin = await core.isAdmin(ctx.openid)
  return { user: publicUser(user, admin) }
}

async function bindPhone (ctx) {
  const code = String(ctx.payload.code || '').trim()
  if (!code) throw new Error('缺少手机号授权 code')
  await core.ensureUser(ctx.openid)
  let phone = ''
  try {
    const res = await core.cloud.openapi.phonenumber.getPhoneNumber({ code: code })
    phone = String((res && res.phoneInfo && res.phoneInfo.phoneNumber) || '')
  } catch (error) {
    const msg = String((error && error.errMsg) || (error && error.message) || '')
    if (msg.indexOf('permission') >= 0 || msg.indexOf('api') >= 0) {
      throw new Error('当前小程序主体或云函数尚未开通手机号快速验证能力')
    }
    throw new Error('手机号解析失败，请重试')
  }
  if (!phone) throw new Error('未取到手机号，请重新授权')
  await core.updateDoc(core.C.users, ctx.openid, { phone: phone, updatedAt: core.nowLocal() })
  return { phone: phone }
}

module.exports = {
  session: session,
  updateProfile: updateProfile,
  bindPhone: bindPhone
}