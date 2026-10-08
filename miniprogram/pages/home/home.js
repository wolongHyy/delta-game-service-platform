const api = require('../../utils/api')
const fmt = require('../../utils/format')

Page({
  data: { loading: true, serviceTypes: [], hot: [], banners: [], posts: [], stats: null, error: '' },
  onShow() { this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    api.call('home.bootstrap').then((data) => {
      const hot = (data.hot || []).map((x) => Object.assign({}, x, {
        priceText: fmt.money(x.price),
        initial: fmt.userInitial(x.name)
      }))
      this.setData({
        loading: false,
        serviceTypes: data.serviceTypes || [],
        hot,
        banners: data.banners || [],
        posts: (data.posts || []).map(fmt.normalizePost),
        stats: data.stats || null
      })
    }).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  openService(event) { wx.navigateTo({ url: '/pages/services/services?serviceTypeId=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  openCompanion(event) { wx.navigateTo({ url: '/pages/service-detail/service-detail?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  openPost(event) { wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  openServices() { wx.switchTab({ url: '/pages/services/services' }) },
  openOrders() { wx.navigateTo({ url: '/pages/orders/orders' }) },
  openCommunity() { wx.switchTab({ url: '/pages/community/community' }) }
})