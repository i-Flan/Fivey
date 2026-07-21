import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createServer, type Server } from 'http'
import { app, BrowserWindow, shell } from 'electron'
import { getAdminToken } from './adminApi'

// معرّفات علنية (آمنة داخل الكود المفتوح — لا يوجد أي سر هنا)
const CLIENT_ID = '1527131508828147853'
const GUILD_ID = '1473807174881906832'
const BOOSTER_ROLE = '1513208396688523315'
const INVITE_URL = 'https://discord.gg/k71'

// منفذ محلي يستقبل عودة ديسكورد. لازم يطابق الـRedirect المسجّل في التطبيق.
const PORT = 53682
const REDIRECT_URI = `http://localhost:${PORT}/fivey`

export interface BoosterState {
  isBooster: boolean
  user?: string
}

function stateFile(): string {
  return join(app.getPath('userData'), 'booster.json')
}

export function getBoosterState(): BoosterState {
  try {
    const f = stateFile()
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')) as BoosterState
  } catch {
    // ignore
  }
  return { isBooster: false }
}

function saveBoosterState(state: BoosterState): void {
  try {
    writeFileSync(stateFile(), JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

// يفتح صفحة السيرفر عشان يدعمه بالبوست (زر "لا")
export function openBoostPage(): void {
  shell.openExternal(INVITE_URL)
}

export interface VerifyResult {
  success: boolean
  isBooster?: boolean
  user?: string
  error?: string
}

// صفحة تظهر في المتصفح بعد الموافقة. رمز الدخول يجي في الـfragment (#) وهذا
// لا يُرسل للسيرفر، فنقرأه بجافاسكربت ونرسله للبرنامج.
const RESULT_PAGE = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>Fivey — التحقق</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;
background:radial-gradient(circle at 50% 20%,#2a1533,#0b0b0d 70%);color:#f3f4f6;
font-family:'Segoe UI',Tahoma,Arial,sans-serif}
.card{text-align:center;padding:46px 54px;border-radius:20px;background:rgba(25,19,32,.92);
border:1px solid rgba(244,127,255,.3);box-shadow:0 24px 70px #000a,0 0 50px rgba(244,127,255,.12)}
.gem{font-size:60px;filter:drop-shadow(0 0 20px rgba(244,127,255,.75));animation:f 2.6s ease-in-out infinite}
@keyframes f{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
h1{font-size:23px;margin:18px 0 8px}
p{color:#a6abb4;font-size:14px;line-height:1.9}
.ok{color:#f47fff}
</style></head><body><div class="card">
<div class="gem">💎</div><h1 id="t">جارٍ التحقق...</h1><p id="s">لحظة من فضلك</p>
</div><script>
(async function(){
  var t=document.getElementById('t'), s=document.getElementById('s');
  var token=new URLSearchParams(location.hash.slice(1)).get('access_token');
  if(!token){t.textContent='ما وصلنا رمز الدخول';s.textContent='حاول مرة ثانية من داخل البرنامج';return;}
  try{
    var r=await fetch('/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token})});
    var d=await r.json();
    if(d.isBooster){t.textContent='تم التحقق ✅';t.className='ok';s.textContent='ارجع لبرنامج Fivey — تم تفعيل مزايا البوستر 💎';}
    else{t.textContent=d.error||'ما لقينا رتبة البوستر';s.textContent='ادعم السيرفر بالبوست وحاول مرة ثانية';}
  }catch(e){t.textContent='فشل الاتصال بالبرنامج';s.textContent='تأكد إن Fivey لا يزال مفتوحاً';}
})();
</script></body></html>`

// تحقق من رتبة البوستر — نفتح متصفح المستخدم العادي (هو مسجّل فيه أصلاً)
// فما يحتاج يكتب إيميل ولا باسورد. البرنامج ما يشوف بيانات دخوله إطلاقاً.
export function verifyBooster(parent: BrowserWindow | null): Promise<VerifyResult> {
  const authUrl =
    `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=token&scope=${encodeURIComponent('identify guilds.members.read')}`

  return new Promise<VerifyResult>((resolve) => {
    let done = false
    let server: Server | null = null

    const finish = (result: VerifyResult): void => {
      if (done) return
      done = true
      try {
        server?.close()
      } catch {
        // ignore
      }
      // نرجّع تركيز البرنامج بعد ما يخلص التحقق
      try {
        if (parent && !parent.isDestroyed()) parent.focus()
      } catch {
        // ignore
      }
      resolve(result)
    }

    // يسأل ديسكورد عن رتب العضو في السيرفر.
    // المدير (اللي عنده مفتاح الإدارة) يُفتح له مباشرة — نتعرّف على حسابه فقط
    // بدون اشتراط رتبة البوستر.
    const checkRole = async (token: string): Promise<VerifyResult> => {
      const isAdmin = !!getAdminToken()
      const auth = { Authorization: `Bearer ${token}` }

      // يجيب اسم صاحب الحساب فقط (يُستخدم للمدير أو كاحتياط)
      const identify = async (): Promise<string | undefined> => {
        try {
          const me = await fetch('https://discord.com/api/v10/users/@me', { headers: auth })
          if (!me.ok) return undefined
          return ((await me.json()) as { username?: string }).username
        } catch {
          return undefined
        }
      }

      try {
        const res = await fetch(`https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`, {
          headers: auth
        })

        if (res.ok) {
          const data = (await res.json()) as { roles?: string[]; user?: { username?: string } }
          const hasRole = Array.isArray(data.roles) && data.roles.includes(BOOSTER_ROLE)
          const isBooster = isAdmin || hasRole
          const user = data.user?.username
          if (isBooster) saveBoosterState({ isBooster: true, user })
          return { success: true, isBooster, user }
        }

        // المدير يمر حتى لو مو داخل السيرفر أو صار خطأ في قراءة الرتب
        if (isAdmin) {
          const user = await identify()
          saveBoosterState({ isBooster: true, user })
          return { success: true, isBooster: true, user }
        }

        if (res.status === 404) {
          return { success: false, error: 'أنت غير موجود في سيرفر k71 — ادخل السيرفر أولاً' }
        }
        return { success: false, error: `فشل التحقق من ديسكورد (${res.status})` }
      } catch {
        if (isAdmin) {
          const user = await identify()
          saveBoosterState({ isBooster: true, user })
          return { success: true, isBooster: true, user }
        }
        return { success: false, error: 'فشل الاتصال بديسكورد — تحقق من الإنترنت' }
      }
    }

    server = createServer((req, res) => {
      const url = req.url || '/'

      // 1) المتصفح يفتح صفحة النتيجة بعد موافقة ديسكورد
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(RESULT_PAGE)
        return
      }

      // 2) الصفحة ترسل لنا رمز الدخول الذي قرأته من الـfragment
      if (req.method === 'POST' && url.startsWith('/token')) {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
          if (body.length > 10_000) req.destroy() // حماية بسيطة
        })
        req.on('end', async () => {
          let token = ''
          try {
            token = (JSON.parse(body) as { token?: string }).token || ''
          } catch {
            // ignore
          }
          const result = token
            ? await checkRole(token)
            : { success: false, error: 'رمز الدخول غير صالح' }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ isBooster: !!result.isBooster, error: result.error }))
          // نمهل الصفحة لحظة لعرض النتيجة قبل ما نقفل السيرفر
          setTimeout(() => finish(result), 400)
        })
        return
      }

      res.writeHead(404)
      res.end()
    })

    server.on('error', () => {
      finish({ success: false, error: `تعذّر فتح المنفذ ${PORT} — اقفل أي نسخة ثانية من البرنامج وحاول` })
    })

    server.listen(PORT, '127.0.0.1', () => {
      // يفتح المتصفح الافتراضي — المستخدم مسجّل دخوله فيه أصلاً
      shell.openExternal(authUrl)
    })

    // مهلة: لو ما خلص خلال ٣ دقائق نوقف بدل ما يعلّق
    setTimeout(() => finish({ success: false, error: 'انتهت مهلة التحقق — حاول مرة ثانية' }), 3 * 60 * 1000)
  })
}
