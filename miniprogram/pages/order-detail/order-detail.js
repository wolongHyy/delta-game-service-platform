const api = require('../../utils/api')
const fmt = require('../../utils/format')

const HINTS = {
  unpaid: '请按下方收款码完成付款，然后回到本页提交付款备注，管理员核对到账后进入接单池。',
  payment_review: '付款凭证已提交，等待管理员核对到账。如备注填写有误可以重新提交。',
  pending: '已确认到账，订单正在接单池等待操作手接单。',
  assigned: '操作手已接单，即将开始服务，请保持游戏在线。',
  in_progress: '服务进行中。结束后操作手会提交完工申请，由管理员确认。',
  completion_pending: '操作手已申请完工，等待管理员确认，确认后订单完成。',
  completed: '订单已完成。若来源是社区帖子，帖子会同步展示脱敏成交凭证。',
  cancelled: '订单已取消。如需重新下单，请回到服务页。'
}

Page({
  data: {
    order: null,
    events: [],
    loading: true,
    error: '',
    payOpen: false,
    paymentMethod: '微信转账',
    paymentNote: '',
    submitting: false,
    timeline: [],
    hint: '',
    payment: null
  },
  onLoad(options) { this.id = options.id || '' },
  onShow() { this.load() },
  load() {
    if (!this.id) { this.setData({ loading: false, error: '缺少订单编号' }); return }
    this.setData({ loading: true, error: '' })
    Promise.all([
      api.call('orders.get', { id: this.id }),
      api.call('payment.config', {}, { silent: true }).catch(() => null)
    ]).then(([data, payment]) => {
      const order = fmt.normalizeOrder(data.order || data)
      const events = data.events || []
      this.setData({
        loading: false,
        order,
        events,
        timeline: this.buildTimeline(order, events),
        hint: HINTS[order.status] || '',
        payment: payment || null
      })
    }).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  buildTimeline(order, events) {
    const steps = [
      ['unpaid', '订单创建'],
      ['payment_review', '上传付款凭证'],
      ['pending', '管理员确认到账'],
      ['assigned', '打手接单'],
      ['in_progress', '服务进行中'],
      ['completion_pending', '提交完工凭证'],
      ['completed', '订单完成']
    ]
    const reached = {}
    events.forEach((event) => { reached[event.toStatus] = true })
    reached[order.status] = true
    if (order.status === 'cancelled') reached.cancelled = true
    return steps.map((step) => ({ status: step[0], label: step[1], done: !!reached[step[0]], current: order.status === step[0] }))
  },
  togglePay() { this.setData({ payOpen: !this.data.payOpen }) },
  onField(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value || '' }) },
  previewQr() {
    const url = this.data.payment && this.data.payment.qrUrl
    if (!url) { wx.showToast({ title: '管理员尚未上传收款码，请联系客服', icon: 'none' }); return }
    wx.previewImage({ urls: [url], current: url })
  },
  submitPay() {
    const note = String(this.data.paymentNote || '').trim()
    if (note.length < 2) { wx.showToast({ title: '请填写付款备注或后四位', icon: 'none' }); return }
    this.setData({ submitting: true })
    api.call('orders.pay', { id: this.id, method: this.data.paymentMethod, note })
      .then(() => {
        this.setData({ submitting: false, payOpen: false })
        wx.showToast({ title: '已提交核销', icon: 'success' })
        this.load()
      })
      .catch((error) => { this.setData({ submitting: false }); api.toastError(error) })
  },
  cancel() {
    wx.showModal({
      title: '取消订单',
      content: '确定取消这笔订单吗？取消后不可恢复。',
      confirmColor: '#FF4B57',
      success: (res) => {
        if (!res.confirm) return
        api.call('orders.cancel', { id: this.id }).then(() => this.load()).catch(api.toastError)
      }
    })
  },
  openPost() { if (this.data.order && this.data.order.sourcePostId) wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + encodeURIComponent(this.data.order.sourcePostId) }) }
})