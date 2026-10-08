const core = require('./lib/core')
const setup = require('./handlers/setup')
const auth = require('./handlers/auth')
const customer = require('./handlers/customer')
const orders = require('./handlers/orders')
const community = require('./handlers/community')
const fighter = require('./handlers/fighter')
const admin = require('./handlers/admin')

const ROUTES = {
  setup: setup.setup,

  'auth.session': auth.session,
  'auth.updateProfile': auth.updateProfile,
  'auth.bindPhone': auth.bindPhone,

  'home.bootstrap': customer.bootstrap,
  'services.types': customer.types,
  'companions.list': customer.companionList,
  'companions.get': customer.companionGet,
  'messages.list': customer.messages,
  'ai.ask': customer.aiAsk,
  'profile.me': customer.profileMe,
  'payment.config': customer.paymentConfig,

  'orders.create': orders.create,
  'orders.list': orders.list,
  'orders.get': orders.get,
  'orders.pay': orders.pay,
  'orders.cancel': orders.cancel,

  'community.list': community.list,
  'community.detail': community.detail,
  'community.create': community.create,
  'community.like': community.like,
  'community.favorite': community.favorite,
  'community.follow': community.follow,
  'community.comment': community.comment,
  'community.evidence': community.evidence,
  'community.notifications.list': community.notificationsList,
  'community.notifications.readAll': community.notificationsReadAll,

  'fighter.dashboard': fighter.dashboard,
  'fighter.apply': fighter.apply,
  'fighter.claim': fighter.claim,
  'fighter.start': fighter.start,
  'fighter.complete': fighter.complete,

  'admin.dashboard': admin.dashboard,
  'admin.orders.pay': admin.confirmPay,
  'admin.orders.reject': admin.rejectPay,
  'admin.orders.status': admin.setStatus,
  'admin.fighter.review': admin.reviewFighter,
  'admin.fighters.list': admin.listFighters,
  'admin.orders.assign': admin.assignOrder,
  'admin.community.review': admin.reviewCommunity
}

function describe (error) {
  const message = String((error && error.message) || (error && error.errMsg) || error || '云函数执行失败')
  const code = String((error && error.errCode) || (error && error.code) || 'HANDLER_ERROR')
  return { message: message, code: code }
}

exports.main = async function (event, context) {
  const started = Date.now()
  const wxContext = core.cloud.getWXContext()
  const openid = String(wxContext.OPENID || '')

  const input = event || {}
  const action = String(input.action || '').trim()
  const payload = Object.assign({}, input)
  delete payload.action

  if (!action) return core.fail('缺少 action 参数', 'NO_ACTION')
  const handler = ROUTES[action]
  if (!handler) return core.fail('未知的 action：' + action, 'UNKNOWN_ACTION')
  if (!openid) return core.fail('未获取到微信身份 OpenID，请在微信开发者工具或真机中调用', 'NO_OPENID')

  const ctx = {
    openid: openid,
    unionid: String(wxContext.UNIONID || ''),
    appid: String(wxContext.APPID || ''),
    payload: payload,
    event: input,
    wxContext: wxContext
  }

  try {
    const data = await handler(ctx)
    const result = core.ok(data === undefined ? null : data)
    result.action = action
    result.cost = Date.now() - started
    return result
  } catch (error) {
    const info = describe(error)
    console.error('[void-api]', action, info.code, info.message)
    const result = core.fail(info.message, info.code)
    result.action = action
    result.cost = Date.now() - started
    return result
  }
}