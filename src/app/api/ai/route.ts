import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client with better error handling for missing API key
const openaiApiKey = process.env.OPENAI_API_KEY;
const modelName = process.env.MODEL_NAME || 'gpt-4o';

// Create a safety check for the API key
if (!openaiApiKey) {
  console.error('Missing OpenAI API key in environment variables');
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey || '',  // Provide empty string as fallback to prevent undefined error
});

export async function POST(request: Request) {
  try {
    // Get messages from request body
    const { messages } = await request.json();

    // Log environment variables (excluding sensitive values)
    console.log('Environment check:', { 
      modelNameExists: !!modelName,
      apiKeyExists: !!openaiApiKey,
      nodeEnv: process.env.NODE_ENV
    });

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request body. Messages array is required.' },
        { status: 400 }
      );
    }

    // Check if this might be a notes generation request by examining the system message
    const isNotesGeneration = messages.some(msg => 
      msg.role === 'system' && 
      msg.content.includes('generate structured notes')
    );

    console.log('Processing request:', {
      messageCount: messages.length,
      isNotesGeneration,
      model: modelName
    });

    // Generate AI response with appropriate parameters
    const response = await openai.chat.completions.create({
      model: modelName,
      messages,
      temperature: isNotesGeneration ? 0.5 : 0.7, // Lower temperature for more structured output on notes
      max_tokens: isNotesGeneration ? 2500 : 1000, // Allow more tokens for detailed notes
    });

    console.log('OpenAI response received:', {
      responseLength: response.choices[0].message.content?.length || 0,
      model: response.model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens
    });

    // Return response
    return NextResponse.json({
      message: response.choices[0].message.content,
    });
  } catch (error: any) {
    console.error('Error generating AI response:', error?.message || error);
    
    // Check for specific OpenAI errors
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Authentication error with OpenAI API' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error generating AI response: ' + (error?.message || 'Unknown error') },
      { status: 500 }
    );
  }
} 