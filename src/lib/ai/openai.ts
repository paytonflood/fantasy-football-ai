// src/lib/ai/openai.ts
import OpenAI from 'openai'

const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    export async function generateTradeAnalysis(
        tradeData: any,
        useGPT4: boolean = false // Start with GPT-3.5-turbo
    ) {
    const model = useGPT4 ? 'gpt-4' : 'gpt-3.5-turbo'

    const response = await openai.chat.completions.create({
    model,
    messages: [
        {
            role: 'system',
            content: 'You are a fantasy football expert...'
        },
        {
            role: 'user',
            content: `Analyze this trade: ${JSON.stringify(tradeData)}`
        }
    ],
        max_tokens: 500, // Limit tokens to control costs
        temperature: 0.7,
    })

    return response.choices[0].message.content
}