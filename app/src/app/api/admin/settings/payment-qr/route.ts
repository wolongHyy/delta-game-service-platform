import { NextResponse } from 'next/server'
import { getSettings, setSetting } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'
import { saveUploadFile, uploadUrl } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

// 管理员上传收款码图片；图片保存到 UPLOAD_DIR，数据库只保存访问路径。
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '请选择收款码图片' }, { status: 400 })
    }
    const channel = String(form.get('channel') || 'wechat')
    if (!['wechat', 'alipay'].includes(channel)) {
      return NextResponse.json({ error: '收款码类型不正确' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = saveUploadFile(buffer, file.name)
    const settingKey = channel === 'alipay' ? 'paymentQrAlipayUrl' : 'paymentQrWechatUrl'
    setSetting(settingKey, uploadUrl(filename))
    await auditAdminAction(request, 'settings.payment_qr', '', { channel, filename })
    return NextResponse.json(getSettings())
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '收款码上传失败' }, { status: 400 })
  }
}
