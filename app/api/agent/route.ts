import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Prisma Client
const neon = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL });
const adapter = new PrismaNeon(neon);
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const { message, agentId, toolCalls } = await request.json();

    // Get or create agent
    let agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      agent = await prisma.agent.create({
        data: { id: agentId, name: `Agent-${agentId}` },
      });
    }

    // Get recent memory
    const recentMemory = await prisma.memory.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Format context from memory
    const context = recentMemory.map(m => m.content).join('\n');

    // Call OpenAI with context and tool calling capabilities
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an AI agent with access to previous context and tool-calling capabilities. 
                   Previous context:\n${context}\n\nRespond to the user's message.`
        },
        { role: "user", content: message }
      ],
      tools: toolCalls || [],
    });

    // Store the interaction in memory
    await prisma.memory.create({
      data: {
        content: `User: ${message}\nAssistant: ${completion.choices[0].message.content}`,
        type: 'conversation',
        agentId,
        metadata: { toolCalls: completion.choices[0].message.tool_calls || [] }
      }
    });

    return NextResponse.json({
      response: completion.choices[0].message.content,
      toolCalls: completion.choices[0].message.tool_calls || []
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 