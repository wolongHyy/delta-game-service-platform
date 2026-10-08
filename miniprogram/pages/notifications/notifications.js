const api = require('../../utils/api')
Page({
  data: { items: [], loading: true, error: '' },
  onShow() { this.load() },
  load() { this.setData({ loading: true }); api.call('community.notifications.list').then((data) => this.setData({ loading: false, items: data.items || [] })).catch((error) => this.setData({ loading: false, error: error.message })) },
  markAll() { api.call('community.notifications.readAll').then(() => this.load()).catch(api.toastError) },
  open(event) { const postId = event.currentTarget.dataset.post; if (postId) wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + encodeURIComponent(postId) }) }
})
