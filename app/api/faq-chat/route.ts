import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { FAQ_DATA } from '@/data/faqs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

interface RequestBody {
  question: string
  history?: ChatMessage[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_MESSAGE =
  'Mình chưa tìm thấy thông tin chính xác cho câu hỏi này. Bạn vui lòng liên hệ BTC để được hỗ trợ nhé! 💙'

const MAX_QUESTION_LENGTH = 500
const TOP_N_FAQ_ITEMS = 5
const MATCH_THRESHOLD = 1 // minimum score to include an item

// ---------------------------------------------------------------------------
// Vietnamese diacritic normaliser (lightweight, no external dep)
// ---------------------------------------------------------------------------

const DIACRITIC_MAP: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
  ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
  è: 'e', é: 'e', ê: 'e', ề: 'e', ế: 'e', ệ: 'e',
  ể: 'e', ễ: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e',
  ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ơ: 'o', ớ: 'o', ợ: 'o', ờ: 'o', ở: 'o', ỡ: 'o',
  ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o', ọ: 'o', ỏ: 'o',
  ù: 'u', ú: 'u', ư: 'u', ứ: 'u', ự: 'u', ừ: 'u', ử: 'u', ữ: 'u',
  ủ: 'u', ũ: 'u', ụ: 'u',
  ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y',
  đ: 'd',
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .split('')
    .map((c) => DIACRITIC_MAP[c] ?? c)
    .join('')
    .split(/[\s,.\-:;?!()[\]"'/\\]+/)
    .filter((t) => t.length > 1)
}

// ---------------------------------------------------------------------------
// Keyword matching — returns top N FAQ items by overlap score
// ---------------------------------------------------------------------------

function findRelevantFaqItems(question: string) {
  const queryTokens = normalize(question)
  if (queryTokens.length === 0) return []

  const scored = FAQ_DATA.flatMap((category) =>
    category.items.map((item) => {
      const qTokens = normalize(item.question)
      const aTokens = normalize(item.answer)

      let score = 0
      for (const qt of queryTokens) {
        if (qTokens.includes(qt)) score += 2 // question match weighs more
        if (aTokens.includes(qt)) score += 1
      }

      return { item, score }
    })
  )

  return scored
    .filter(({ score }) => score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N_FAQ_ITEMS)
    .map(({ item }) => item)
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate body
    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ answer: FALLBACK_MESSAGE }, { status: 400 })
    }

    const { question, history = [] } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ answer: FALLBACK_MESSAGE }, { status: 400 })
    }

    const trimmedQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH)
    if (trimmedQuestion.length === 0) {
      return NextResponse.json({ answer: FALLBACK_MESSAGE }, { status: 400 })
    }

    // 2. Keyword match FAQ items
    const relevantItems = findRelevantFaqItems(trimmedQuestion)

    // Short-circuit: no matches → return fallback immediately, skip Gemini
    if (relevantItems.length === 0) {
      return NextResponse.json({ answer: FALLBACK_MESSAGE })
    }

    const faqContext = relevantItems
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join('\n\n')

    // 3. Build system instruction
    const systemInstruction = `Bạn là trợ lý hỏi đáp chính thức của cuộc thi Gen D Arena 2026.
Bạn CHỈ được phép trả lời dựa trên nội dung FAQ được cung cấp bên dưới.
Không được bịa thêm thông tin, số liệu, mốc thời gian hoặc điều kiện ngoài context.
Nếu câu hỏi không có trong context, trả lời đúng câu này (không thêm, không bớt):
"Mình chưa tìm thấy thông tin chính xác cho câu hỏi này. Bạn vui lòng liên hệ BTC để được hỗ trợ nhé! 💙"
Trả lời ngắn gọn, thân thiện, dùng tiếng Việt.
Không sử dụng markdown header (##, ###). Có thể dùng gạch đầu dòng (-) nếu cần liệt kê.

--- FAQ CONTEXT ---
${faqContext}
--- KẾT THÚC FAQ CONTEXT ---`

    // 4. Call Gemini Flash
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('[faq-chat] GEMINI_API_KEY not set — using FAQ match fallback')
      return NextResponse.json({
        answer: relevantItems[0].answer,
      })
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction,
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.2,
        },
      })

      // Build prior conversation history for multi-turn context (max 10 turns = 20 msgs)
      const priorHistory = history.slice(-20).map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }))

      const chat = model.startChat({ history: priorHistory })
      const result = await chat.sendMessage(trimmedQuestion)
      const answer = result.response.text().trim()

      if (!answer) {
        return NextResponse.json({ answer: relevantItems[0].answer })
      }

      return NextResponse.json({ answer })
    } catch (geminiErr) {
      // Gemini unavailable (quota exceeded, network error, etc.)
      // Gracefully degrade: return the best FAQ match we already found.
      const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
      console.warn('[faq-chat] Gemini unavailable, using FAQ match:', errMsg.slice(0, 120))
      return NextResponse.json({ answer: relevantItems[0].answer })
    }
  } catch (err) {
    // Outer safety net — unexpected errors before/after Gemini call.
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[faq-chat] Unexpected error:', errMsg)
    return NextResponse.json({ answer: FALLBACK_MESSAGE })
  }
}
