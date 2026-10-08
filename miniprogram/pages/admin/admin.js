const api = require('../../utils/api')
const fmt = require('../../utils/format')

Page({
  data: {
    tab: 'orders',
    orders: [],
    applications: [],
    posts: [],
    fighterNames: [],
    fighterIds: [],
    stats: null,
    loading: true,
    error: ''
  },
  onLoad() { this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    Promise.all([
      api.call('admin.dashboard'),
      api.call('admin.fighters.list', {}, { silent: true }).catch(() => [])
    ]).then(([data, fighters]) => {
      const list = fighters || []
      this.setData({
        loading: false,
        stats: data.stats || null,
        orders: (data.orders || []).map(fmt.normalizeOrder),
        applications: data.applications || [],
        posts: data.posts || [],
        fighterNames: list.map((x) => String(x.gameName || '操作手') + (x.rank ? ' · ' + x.rank : '')),
        fighterIds: list.map((x) => x.id)
      })
    }).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  tab(event) { this.setData({ tab: event.currentTarget.dataset.tab || 'orders' }) },
  orderAction(event) {
    const id = event.currentTarget.dataset.id
    const action = event.currentTarget.dataset.action
    api.call('admin.orders.' + action, { id }).then(() => this.load()).catch(api.toastError)
  },
  setStatus(event) {
    const id = event.currentTarget.dataset.id
    const status = event.currentTarget.dataset.status
    api.call('admin.orders.status', { id, status }).then(() => this.load()).catch(api.toastError)
  },
  assign(event) {
    const id = event.currentTarget.dataset.id
    const index = Number(event.detail.value || 0)
    const fighterId = (this.data.fighterIds || [])[index]
    if (!fighterId) { wx.showToast({ title: '请先通过打手入驻审核', icon: 'none' }); return }
    api.call('admin.orders.assign', { id, fighterId }).then(() => {
      wx.showToast({ title: '已派单', icon: 'success' })
      this.load()
    }).catch(api.toastError)
  },
  applicationAction(event) {
    const id = event.currentTarget.dataset.id
    const status = event.currentTarget.dataset.status
    api.call('admin.fighter.review', { id, status }).then(() => this.load()).catch(api.toastError)
  },
  postAction(event) {
    const ds = event.currentTarget.dataset
    const flags = {}
    if (ds.featured !== undefined) flags.featured = ds.featured === '1'
    if (ds.knowledge !== undefined) flags.knowledge = ds.knowledge === '1'
    api.call('admin.community.review', { id: ds.id, status: ds.status, flags }).then(() => this.load()).catch(api.toastError)
  }
})