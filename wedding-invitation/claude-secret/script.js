const form = document.querySelector('#command-form')
// SHA-256 signatures; plaintext answers are not stored in the client list.
const ANSWER_SIGNATURES = [
  {
    "length": 5,
    "hash": "202bd009f816aa8a69e24c98a91ac0740899df316c88d06bad37f5db032de33f"
  },
  {
    "length": 3,
    "hash": "55f0124bb79f5c53d868ca45bbb0f4d04da15eea4fb29c6b95087fe8801bf0a3"
  },
  {
    "length": 4,
    "hash": "36ab771eba23f49d7ae43af88c601f3de8fccb201250906a4085444ae765f2db"
  },
  {
    "length": 4,
    "hash": "bc10b57514d76124b4120a34db2224067fed660b09408ade0b14b582946ff2fc"
  },
  {
    "length": 6,
    "hash": "fb2d03d5eebc0c8f1d7ba96d4d0a7fe0a66e1655b15037ea67426ba3640f3167"
  },
  {
    "length": 7,
    "hash": "f65990e696bf64c8f2d594f2698041af686f77b1aeb24596e8578a324d013d7b"
  },
  {
    "length": 4,
    "hash": "a0af9f865bf637e6736817f4ce552e4cdf7b8c36ea75bc254c1d1f0af744b5bf"
  },
  {
    "length": 9,
    "hash": "31d4b91fd1b1e58699515292e0c441d1d240e51a100ead045d69d441414b1350"
  },
  {
    "length": 7,
    "hash": "985e112b5f606a79c4add1f787dd559733a86a0ea2fdfbc21ed8398f8a52b7ed"
  },
  {
    "length": 2,
    "hash": "12af0de3e7607d296d020b8f11d1cd1473e7496942c757072802338e85c7787a"
  },
  {
    "length": 2,
    "hash": "c868abcfb2ca9ebd6a62836c2d023749bdeca69e4c147136066413878717dd60"
  },
  {
    "length": 4,
    "hash": "dca1f57643af68bc5e537b142fa9c427ae06860571cd7251111d03f837da517f"
  },
  {
    "length": 2,
    "hash": "7261890fd0f9afb3af5ee5146d1f24e34a7e39c4bc4c310512c80bfbf4061997"
  },
  {
    "length": 2,
    "hash": "f5fe88ee08735ae259265495a93c8de2b0eacfecf0cd90b5821479be3199fa8c"
  }
]
function normalizeAnswer(value) {
  return value.toLowerCase().replace(/\s+/gu, '')
}
async function isCorrectAnswer(value) {
  const characters = Array.from(normalizeAnswer(value))
  const lengths = [...new Set(ANSWER_SIGNATURES.map((entry) => entry.length))]
  const candidates = new Set()
  for (const length of lengths) {
    for (let start = 0; start + length <= characters.length; start++) {
      candidates.add(characters.slice(start, start + length).join(''))
    }
  }
  const expected = new Set(ANSWER_SIGNATURES.map((entry) => entry.hash))
  const encoder = new TextEncoder()
  // Bound concurrency even for long input.
  const values = [...candidates]
  for (let offset = 0; offset < values.length; offset += 32) {
    const digests = await Promise.all(values.slice(offset, offset + 32).map(async (candidate) => {
      const digest = await crypto.subtle.digest('SHA-256', encoder.encode(candidate))
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    }))
    if (digests.some((digest) => expected.has(digest))) return true
  }
  return false
}
const input = document.querySelector('#command')
const transcript = document.querySelector('#transcript')
const terminal = document.querySelector('.terminal')
const activity = document.querySelector('.activity')
const status = document.querySelector('#status')
const elapsed = document.querySelector('#elapsed')
const send = document.querySelector('#send')
const gate = document.querySelector('#gate-message')
const progress = document.querySelector('#boot-progress')
const container = document.querySelector('.container')
const usageModel = document.querySelector('.usage-model')
const initialUsageModel = usageModel.textContent
const usagePercentages = document.querySelectorAll('.usage-percent')
const today = new Date()
const month = String(today.getMonth() + 1).padStart(2, '0')
const day = String(today.getDate()).padStart(2, '0')
document.querySelector('#model-label').textContent = `Opus ${month}.${day} · Claude Max`
function updateUsageClock() {
  if (container.classList.contains('usage-filling')) return
  const now = new Date()
  const hour = now.getHours() % 12 || 12
  const minute = String(now.getMinutes()).padStart(2, '0')
  document.querySelector('#usage-clock').textContent = `${hour}h ${minute}m`
}
updateUsageClock()
setInterval(updateUsageClock, 1000)
let timers = []
let phase = 'booting'
let failedAttempts = 0
const failureHints = [
  'The key has already passed through this terminal.',
  'Look beyond the commands. Read what they found.',
  'A name, a place, a fragment. One may open the door.'
]
// Encoded presentation data keeps clues out of a quick source scan.
const BOOT_DATA = 'W1sicHJvbXB0Iiwi4p2vIiwiY2xhdWRlIC0tcmVzdW1lIGNsYXNzaWZpZWQtc2Vzc2lvbiAtLWRlY3J5cHQiXSxbImFuc3dlciIsIuKXjyIsIlNlc3Npb24gcmVjb3ZlcmVkLiBUcmFjaW5nIHRoZSBoaWRkZW4gcm91dGXigKYiXSxbInRvb2wiLCLil48iLCJCYXNoIGZpbmQgLi92YXVsdCAtdHlwZSBmXG4/IEI2MTIgZW5jcnlwdGVkIGZyYWdtZW50cyBkaXNjb3ZlcmVkIl0sWyJzdHJlYW0iLCLigLoiLCJba2VybmVsXSBwZW50YWNvcmUgZW5naW5lIGluaXRpYWxpemVkXG5bbWVtXSBhbGxvY2F0aW5nIDB4N0ZGMDNBID8gMjA0OCBLQlxuW3NjYW5dIHNlY3RvciAwMDEgLyA2MTIgPyBzaWduYXR1cmUgZm91bmQiXSxbImNvZGUiLCIrIiwiY29uc3QgdmF1bHQgPSBhd2FpdCBjb25uZWN0KHtcbiAgYWdlbnQ6IFwiY3VyaW91ZFwiLFxuICBrZXk6IGRlcml2ZUtleShzZXNzaW9uLmZpbmdlcnByaW50KSxcbiAgbW9kZTogXCJ1bmxvY2tcIlxufSk7Il0sWyJ0b29sIiwi4pePIiwiUmVhZCBwcm9maWxlcy9vcGVyYXRvci5jb25maWcudHNcbj8gU0hBLTI1NjogYTdmOWMyMWU4YjAzZDY0ZiJdLFsic3RyZWFtIiwi4oC6IiwiW2RlY3J5cHRdIOKWiOKWiOKWkeKWkeKWkeKWkeKWkeKWkeKWkeKWkSAyMCVcbltkZWNyeXB0XSDilojilojilojilojilojilpHilpHilpHilpHilpEgNTAlXG5bZGVjcnlwdF0g4paI4paI4paI4paI4paI4paI4paI4paI4paR4paRIDgwJSJdLFsiY29kZSIsIisiLCJjb25zdCBwYXRoID0gcmVzb2x2ZU5leHREb29yKCk7XG5mb3IgKGNvbnN0IHNoYXJkIG9mIHZhdWx0LmZyYWdtZW50cykge1xuICBjb25zdCBwYXlsb2FkID0gZGVjb2RlKHNoYXJkKTtcbiAgYXdhaXQgdmVyaWZ5KHBheWxvYWQuY2hlY2tzdW0pO1xuICBwYXRoLmFwcGVuZChwYXlsb2FkLmNvb3JkaW5hdGVzKTtcbn0iXSxbInN0cmVhbSIsIuKAuiIsIjB4MDAxQSAgN0YgNDUgNEMgNDYgMDIgMDEgMDEgMDBcbjB4MDAyQiAgQTkgM0MgRjAgOEUgNzEgRDIgMDYgQjRcbjB4MDAzQyAgNEIgNDUgNTkgNUYgNDYgNEYgNTUgNEUiXSxbInRvb2wiLCLil48iLCJVcGRhdGUgc2VjdXJpdHkvZ2F0ZXdheS50c1xu4pSUICs0OCBsaW5lcyDCtyBhY2Nlc3MgcHJvdG9jb2wgcmVjb25zdHJ1Y3RlZCJdLFsiY29kZSIsIisiLCItIGFjY2VzczogXCJsb2NrZWRcIlxuKyBhY2Nlc3M6IFwiYXdhaXRpbmdfY29tbWFuZFwiXG4rIGRlc3RpbmF0aW9uOiByZXNvbHZlKFwibmV4dF9kb29yXCIpXG4rIGF1dGhvcml6ZTogKGNvbW1hbmQpID0+IGNvbW1hbmQubGVuZ3RoID4gMCJdLFsic3RyZWFtIiwi4oC6IiwiW3ZlcmlmeV0gZ2F0ZXdheSBwb3J0OiAxMTAxIC4uLi4gUEFTU0VEXG5bdmVyaWZ5XSBjaGVja3BvaW50ICMxMTQwIC4uLi4uIFBBU1NFRFxuW3ZlcmlmeV0gYnVpbGRfaWQ6IDI2MTEwMSAuLi4uLi4gT05MSU5FIl0sWyJ0b29sIiwi4pePIiwiQmFzaCBjb21waWxlIC0tdGFyZ2V0IGdhdGV3YXlcbuKUlCDinJMgMzIgbW9kdWxlcyBsaW5rZWQgaW4gNDE4bXMiXSxbInN0cmVhbSIsIuKAuiIsIltkZWNyeXB0XSDilojilojilojilojilojilojilojilojilojiloggMTAwJVxuW3N5c3RlbV0gaGlkZGVuIGRvb3IgbG9jYXRlZFxuW3Byb2ZpbGVdIG9wZXJhdG9yOiBMaWxseVxuW3JvdXRlXSByZWdpb246IGdhbmdzZW9cbltzeXN0ZW1dIHRyYW5zZmVycmluZyBjb250cm9sIHRvIG9wZXJhdG9y4oCmIl1d'
const stages = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(BOOT_DATA), (character) => character.charCodeAt(0))))
function scrollToLatest() {
  terminal.scrollTop = terminal.scrollHeight
}
function appendLine(kind, marker, message) {
  const line = document.createElement('div')
  line.className = kind
  const icon = document.createElement('b')
  icon.textContent = marker
  const text = document.createElement(kind === 'code' || kind === 'stream' ? 'pre' : 'p')
  text.textContent = message
  line.append(icon, text)
  transcript.append(line)
  scrollToLatest()
}
function later(callback, delay) {
  timers.push(setTimeout(callback, delay))
}
function playOpening() {
  timers.forEach(clearTimeout)
  timers = []
  phase = 'booting'
  failedAttempts = 0
  document.querySelector('#reset').disabled = false
  container.classList.remove('denied')
  container.classList.remove('granted', 'revealing', 'invited', 'usage-filling', 'time-replaced')
  document.querySelector('#session-label').textContent = 'LOCKED'
  document.querySelector('.usage-time-original').style.clipPath = ''
  const replacement = document.querySelector('.usage-time-replacement')
  replacement.hidden = true
  replacement.textContent = ''
  document.querySelector('.usage-primary').style.removeProperty('--usage-fill')
  document.querySelector('.usage-secondary').style.removeProperty('--usage-fill')
  document.querySelector('.token-usage').classList.remove('reveal-flash-a', 'reveal-flash-b')
  updateUsageClock()
  usageModel.textContent = initialUsageModel
  usagePercentages[0].textContent = '11%'
  usagePercentages[1].textContent = '1%'
  document.querySelector('#usage-duration').textContent = '11h 40m'
  document.querySelector('.token-usage').setAttribute('aria-label', 'Simulated token usage')
  gate.querySelector('span').textContent = 'ACCESS READY'
  gate.querySelector('p').textContent = 'Enter it to unlock the next door.'
  transcript.replaceChildren()
  input.value = ''
  input.disabled = true
  send.disabled = true
  gate.hidden = true
  container.classList.remove('unlocked')
  container.classList.add('processing')
  activity.classList.add('running')
  status.textContent = 'Decrypting the unknown…'
  input.placeholder = 'Establishing connection…'
  elapsed.textContent = '0%'
  progress.style.width = '0%'
  stages.forEach(([kind, marker, message], index) => {
    later(() => {
      appendLine(kind, marker, message)
      const percentage = Math.round((index + 1) / stages.length * 100)
      progress.style.width = `${percentage}%`
      elapsed.textContent = `${percentage}%`
      status.textContent = index < 5 ? 'Tracing encrypted fragments…' : index < 10 ? 'Reconstructing access key…' : 'Opening the gateway…'
    }, 200 + index * 400)
  })
  later(() => {
    phase = 'ready'
    input.disabled = false
    send.disabled = false
    input.placeholder = 'Enter the hidden key…'
    gate.hidden = false
    container.classList.add('unlocked')
    container.classList.remove('processing')
    activity.classList.remove('running')
    status.textContent = 'ACCESS READY · Awaiting your command'
    elapsed.textContent = '✓'
    scrollToLatest()
    timers = []
  }, 6000)
}
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (phase !== 'ready') return
  if (!input.value.trim()) {
    input.focus()
    return
  }
  const command = input.value.trim().slice(0, input.maxLength)
  phase = 'verifying'
  container.classList.remove('denied')
  container.classList.add('processing')
  input.disabled = true
  send.disabled = true
  document.querySelector('#reset').disabled = true
  gate.hidden = true
  activity.classList.add('running')
  appendLine('prompt', '❯', command)
  input.value = ''
  input.placeholder = 'Verifying your command…'
  status.textContent = 'Analyzing command signature…'
  elapsed.textContent = '0%'
  progress.style.width = '0%'
  let matched
  try {
    matched = await isCorrectAnswer(command)
  } catch {
    phase = 'ready'
    container.classList.remove('processing')
    activity.classList.remove('running')
    input.disabled = false
    send.disabled = false
    document.querySelector('#reset').disabled = false
    input.value = command
    input.placeholder = 'Try again…'
    gate.hidden = false
    status.textContent = 'Verification unavailable · Please retry on HTTPS or localhost'
    return
  }
  later(() => {
    appendLine('tool', '●', 'Read operator.command\n└ Command received. Checking the access sequence…')
    progress.style.width = '30%'
    elapsed.textContent = '30%'
    status.textContent = 'Comparing access codes…'
  }, 650)
  if (!matched) {
    failedAttempts += 1
    const attempt = failedAttempts
    const recovering = attempt === 3
    later(() => {
      container.classList.add('denied')
      appendLine('warning', '!', '[verify] CODE MISMATCH\n[security] Unknown command signature detected.')
      appendLine('warning', '!', `[gateway] ACCESS DENIED · Attempt ${attempt} / 3\n[lock] Route sealed. Authorization required.`)
      progress.style.width = '100%'
      elapsed.textContent = '✕'
      status.textContent = `ACCESS DENIED · Attempt ${attempt} / 3`
    }, 1600)
    later(() => {
      appendLine('tool', '?', `[hint] ${failureHints[attempt - 1]}\n↑ Scroll back through the trace.`)
      if (recovering) {
        appendLine('stream', '›', '[recovery] Recovery mode activated.\n[security] Renewing the access sequence…')
        container.classList.remove('denied')
        progress.style.width = '0%'
        status.textContent = 'Recovery mode activated…'
        elapsed.textContent = '↻'
      }
      scrollToLatest()
    }, 3000)
    later(() => {
      phase = 'ready'
      container.classList.remove('processing')
      activity.classList.remove('running')
      input.disabled = false
      send.disabled = false
      document.querySelector('#reset').disabled = false
      input.placeholder = 'Enter the hidden key…'
      gate.querySelector('span').textContent = recovering ? 'RECOVERY READY' : `ACCESS DENIED · ${attempt} / 3`
      gate.querySelector('p').textContent = recovering
        ? 'Recovery mode activated · Retry available'
        : failureHints[attempt - 1]
      gate.hidden = false
      status.textContent = recovering ? 'Recovery mode activated · Retry available' : `ACCESS DENIED · Attempt ${attempt} / 3`
      if (recovering) {
        failedAttempts = 0
        appendLine('tool', '●', '[recovery] Access sequence renewed. Retry available.')
        elapsed.textContent = '✓'
      }
      timers = []
      scrollToLatest()
    }, recovering ? 4200 : 3000)
    return
  }
  later(() => {
    container.classList.add('granted')
    document.querySelector('#session-label').textContent = 'INVITED'
    appendLine('code', '+', 'const match = verify(command.signature);\n// expected: GATEWAY_ACCESS\n// received: GATEWAY_ACCESS\nreturn { matched: true, access: "granted" };')
    appendLine('stream', '›', '[verify] CODE MATCHED\n[auth] operator confirmed · ACCESS GRANTED')
    progress.style.width = '75%'
    elapsed.textContent = '75%'
    status.textContent = 'Code matched · Invitation unlocked'
    scrollToLatest()
  }, 1600)
  later(() => {
    container.classList.add('revealing')
    appendLine('success-card', '✓', '당신을 초대합니다.\n소중한 날, 함께해 주세요.')
    progress.style.width = '100%'
    elapsed.textContent = '✓'
    status.textContent = '숨겨진 초대가 도착했습니다'
    input.placeholder = '당신을 초대합니다…'
  }, 2200)
  const usage = document.querySelector('.token-usage')
  const bars = document.querySelectorAll('.usage-bar')
  for (let step = 0; step <= 30; step++) {
    later(() => {
      container.classList.remove('revealing')
      container.classList.add('usage-filling')
      ;[11, 1].forEach((start, index) => {
        const percent = Math.round(start + (100 - start) * step / 30)
        usagePercentages[index].textContent = `${percent}%`
        bars[index].style.setProperty('--usage-fill', `${percent}%`)
      })
    }, 3000 + step * 40)
  }
  later(() => {
    container.classList.add('invited')
    usageModel.textContent = '[ 일 시 | 장 소 ]'
    usagePercentages[0].textContent = '11월'
    usage.classList.add('reveal-flash-a')
  }, 4500)
  later(() => {
    usagePercentages[1].textContent = '1일'
    usage.classList.remove('reveal-flash-a')
    usage.classList.add('reveal-flash-b')
  }, 4800)
  const invitationText = Array.from('11시 40분 AW컨벤션 안산')
  for (let step = 1; step <= invitationText.length; step++) {
    later(() => {
      const replacement = document.querySelector('.usage-time-replacement')
      replacement.hidden = false
      replacement.textContent = invitationText.slice(0, step).join('')
      const range = document.createRange()
      range.selectNodeContents(replacement)
      const width = range.getBoundingClientRect().width
      document.querySelector('.usage-time-original').style.clipPath = `inset(0 0 0 ${width}px)`
      if (step === invitationText.length) {
        container.classList.add('time-replaced')
        activity.classList.remove('running')
        status.textContent = '초대장을 펼치는 중…'
        usage.setAttribute('aria-label', '초대 일시: 11월 1일 오전 11시 40분, 장소: AW컨벤션 안산')
      }
    }, 5100 + (step - 1) * 110)
  }
  later(() => {
    window.location.assign('https://ohchung.com/card/n0shjf')
  }, 8000)
})
document.querySelector('#reset').addEventListener('click', playOpening)
playOpening()
