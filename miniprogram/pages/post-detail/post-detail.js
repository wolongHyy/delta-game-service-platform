const api = require('../../utils/api')
const fmt = require('../../utils/format')

Page({
  data: { post: null, comments: [], evidence: [], commentText: '', loading: true, error: '', submitting: false },
  onLoad(options) { this.id = options.id || ''; this.load() },
  load() {
    if (!this.id) { this.setData({ loading: false, error: '缺少帖子编号' }); return }
    this.setData({ loading: true, error: '' })
    api.call('community.detail', { id: this.id }).then((data) => {
      this.setData({
        loading: false,
        post: fmt.normalizePost(data.post),
        comments: data.comments || [],
        evidence: (data.post && data.post.evidence) || []
      })
    }).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  toggleLike() { api.call('community.like', { id: this.id }).then(() => this.load()).catch(api.toastError) },
  toggleFavorite() { api.call('community.favorite', { id: this.id }).then(() => this.load()).catch(api.toastError) },
  toggleFollow() {
    if (!this.data.post) return
    api.call('community.follow', { userId: this.data.post.authorId, following: !this.data.post.followingAuthor })
      .then(() => this.load())
      .catch(api.toastError)
  },
  onComment(event) { this.setData({ commentText: event.detail.value || '' }) },
  submitComment() {
    const content = String(this.data.commentText || '').trim()
    if (content.length < 2) { wx.showToast({ title: '评论至少 2 个字', icon: 'none' }); return }
    this.setData({ submitting: true })
    api.call('community.comment', { id: this.id, content })
      .then(() => { this.setData({ commentText: '', submitting: false }); this.load() })
      .catch((error) => { this.setData({ submitting: false }); api.toastError(error) })
  },
  previewImage(event) {
    const current = event.currentTarget.dataset.src
    const urls = (this.data.post && this.data.post.images) || []
    if (!current) return
    wx.previewImage({ urls: urls.length ? urls : [current], current })
  },
  orderService() {
    const post = this.data.post
    if (!post || !post.serviceId) { wx.showToast({ title: '该帖子未关联服务', icon: 'none' }); return }
    wx.navigateTo({ url: '/pages/order-create/order-create?companionId=' + encodeURIComponent(post.serviceId) + '&sourcePostId=' + encodeURIComponent(post.id) })
  }
})