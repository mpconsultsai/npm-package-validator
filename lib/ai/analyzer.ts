import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import type { PackageAnalysisResult } from '../types/package-data';

/**
 * AI-generated package analysis and recommendations
 */
export interface AIPackageAnalysis {
  summary: string;
  recommendation: 'recommended' | 'use-with-caution' | 'not-recommended';
  strengths: string[];
  concerns: string[];
  overallScore: number; // 0-100
  securityRating: 'excellent' | 'good' | 'fair' | 'poor';
  qualityRating: 'excellent' | 'good' | 'fair' | 'poor';
  maintenanceRating: 'excellent' | 'good' | 'fair' | 'poor';
  reasoning: string;
  model?: string; // e.g. "Gemini 2.5 Flash", "Llama 3.3 70B (Groq)"
}

/**
 * Initialize Gemini AI model
 */
function getAIModel(modelName: string = 'gemini-2.5-flash') {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use Gemini 2.5 Flash by default, fallback to Flash-Lite for higher rate limits
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Initialize Groq AI client (fallback option)
 */
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  return new Groq({ apiKey });
}

/**
 * Create a prompt for package analysis
 */
function createAnalysisPrompt(data: PackageAnalysisResult): string {
  const { packageName, npm, downloads, github, security, readme } = data;

  let prompt = `Analyse this npm package and provide a detailed assessment:\n\n`;
  
  // Package basics
  prompt += `Package: ${packageName}\n`;
  prompt += `Version: ${npm?.version || 'Unknown'}\n`;
  prompt += `License: ${npm?.license || 'Unknown'}\n`;
  prompt += `Description: ${npm?.description || 'No description'}\n`;
  prompt += `npm URL: https://www.npmjs.com/package/${packageName}\n`;
  
  // Add publish date and maintenance info
  if (npm?.time && npm.version) {
    const lastPublished = npm.time[npm.version];
    if (lastPublished) {
      const publishDate = new Date(lastPublished);
      const now = Date.now();
      const daysSincePublish = Math.floor((now - publishDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only include if the date is valid (not in the future)
      if (daysSincePublish >= 0) {
        prompt += `Days Since Last Publish: ${daysSincePublish} days ago\n`;
      } else {
        prompt += `Package recently published (within the last day)\n`;
      }
    }
  }
  prompt += `\n`;

  // Downloads
  if (downloads) {
    prompt += `Downloads (last month): ${downloads.downloads.toLocaleString()}\n\n`;
  }

  // GitHub stats
  if (github) {
    prompt += `GitHub Statistics:\n`;
    prompt += `- Stars: ${github.stars.toLocaleString()}\n`;
    prompt += `- Forks: ${github.forks.toLocaleString()}\n`;
    prompt += `- Open Issues: ${github.open_issues.toLocaleString()}\n`;
    
    const commitDate = new Date(github.pushed_at);
    const now = Date.now();
    const daysSinceCommit = Math.floor((now - commitDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only include if the date is valid (not in the future)
    if (daysSinceCommit >= 0) {
      prompt += `- Days Since Last Commit: ${daysSinceCommit} days ago\n`;
    } else {
      prompt += `- Recently committed (within the last day)\n`;
    }
    
    prompt += `- Language: ${github.language || 'Unknown'}\n\n`;
  }

  // Security vulnerabilities
  if (security) {
    prompt += `Security Assessment:\n`;
    prompt += `- Total Vulnerabilities: ${security.totalCount}\n`;
    prompt += `- Critical: ${security.critical}\n`;
    prompt += `- High: ${security.high}\n`;
    prompt += `- Moderate: ${security.moderate}\n`;
    prompt += `- Low: ${security.low}\n\n`;
  }

  // README content (first 3000 chars - most important section)
  if (readme) {
    prompt += `README Content (first 3000 characters):\n`;
    prompt += `${readme}\n\n`;
    prompt += `⚠️ CRITICAL: Check the README above for:\n`;
    prompt += `- Deprecation notices (e.g., "no longer maintained", "deprecated", "unmaintained")\n`;
    prompt += `- Migration warnings (e.g., "please use X instead", "consider switching to Y")\n`;
    prompt += `- Abandonment notices (e.g., "this project is archived", "not actively developed")\n`;
    prompt += `- Security warnings or end-of-life announcements\n`;
    prompt += `If ANY of these are present, the package MUST be rated as "not-recommended" or "use-with-caution" at best!\n\n`;
  }

  prompt += `IMPORTANT MAINTENANCE GUIDELINES:\n`;
  prompt += `- If "Days Since Last Publish" > 365 days (1 year), the package is likely UNMAINTAINED\n`;
  prompt += `- If "Days Since Last Publish" > 180 days (6 months), consider it STALE and rate maintenance as "fair" or "poor"\n`;
  prompt += `- If "Days Since Last Commit" > 180 days AND "Days Since Last Publish" > 180 days, it's likely ABANDONED\n`;
  prompt += `- High open issues count (>100) combined with no recent updates is a RED FLAG\n`;
  prompt += `- UNMAINTAINED packages should be "not-recommended" or "use-with-caution" at best\n\n`;
  
  prompt += `Based on this data, provide:\n`;
  prompt += `1. A brief summary (2-3 sentences) - MUST mention if package appears unmaintained/stale\n`;
  prompt += `2. Overall recommendation: "recommended", "use-with-caution", or "not-recommended"\n`;
  prompt += `3. Key strengths (array of 3-5 strings)\n`;
  prompt += `4. Any concerns (array of 2-4 strings, or ["None"] if no concerns) - MUST flag lack of maintenance if applicable\n`;
  prompt += `5. Overall score (0-100) - Deduct significant points for unmaintained packages\n`;
  prompt += `6. Security rating: "excellent", "good", "fair", or "poor"\n`;
  prompt += `7. Quality rating: "excellent", "good", "fair", or "poor"\n`;
  prompt += `8. Maintenance rating: "excellent", "good", "fair", or "poor" - Base this on actual dates, not just the score\n`;
  prompt += `9. Reasoning for your recommendation (2-3 sentences) - Explain maintenance concerns if present\n\n`;
  prompt += `Respond ONLY with valid JSON in this exact format:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "string",\n`;
  prompt += `  "recommendation": "recommended|use-with-caution|not-recommended",\n`;
  prompt += `  "strengths": ["string1", "string2", "string3"],\n`;
  prompt += `  "concerns": ["string1", "string2"],\n`;
  prompt += `  "overallScore": number,\n`;
  prompt += `  "securityRating": "excellent|good|fair|poor",\n`;
  prompt += `  "qualityRating": "excellent|good|fair|poor",\n`;
  prompt += `  "maintenanceRating": "excellent|good|fair|poor",\n`;
  prompt += `  "reasoning": "string"\n`;
  prompt += `}\n\n`;
  prompt += `Do not include any text outside the JSON object.`;

  return prompt;
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(response: string): AIPackageAnalysis {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON from the response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    let jsonString = jsonMatch[0];
    
    // Clean up common JSON issues from AI responses
    // Fix trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,(\s*[\]}])/g, '$1');
    // Remove invalid characters (non-ASCII punctuation that might slip in)
    jsonString = jsonString.replace(/[^\x00-\x7F]/g, '');
    
    const parsed = JSON.parse(jsonString);
    
    // Ensure arrays are properly formatted
    const strengths = Array.isArray(parsed.strengths) 
      ? parsed.strengths.filter((s: any) => s && typeof s === 'string')
      : (parsed.strengths && typeof parsed.strengths === 'string' 
        ? [parsed.strengths] 
        : []);
    
    const concerns = Array.isArray(parsed.concerns) 
      ? parsed.concerns.filter((c: any) => c && typeof c === 'string')
      : (parsed.concerns && typeof parsed.concerns === 'string' 
        ? [parsed.concerns] 
        : []);

    return {
      summary: parsed.summary || '',
      recommendation: parsed.recommendation || 'use-with-caution',
      strengths: strengths.length > 0 ? strengths : ['Unable to identify specific strengths from data'],
      concerns: concerns.length > 0 ? concerns : ['Unable to identify specific concerns from data'],
      overallScore: Number(parsed.overallScore) || 50,
      securityRating: parsed.securityRating || 'fair',
      qualityRating: parsed.qualityRating || 'fair',
      maintenanceRating: parsed.maintenanceRating || 'fair',
      reasoning: parsed.reasoning || parsed.summary || 'Analysis based on package metrics',
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Response was:', response);
    // Return a safe default
    return {
      summary: 'Unable to generate AI analysis at this time.',
      recommendation: 'use-with-caution',
      strengths: ['Package data available for manual review'],
      concerns: ['AI analysis temporarily unavailable'],
      overallScore: 50,
      securityRating: 'fair',
      qualityRating: 'fair',
      maintenanceRating: 'fair',
      reasoning: 'Please review the package metrics manually.',
    };
  }
}

/**
 * Analyze a package using AI with automatic fallback to Flash-Lite on rate limit
 */
export async function analyzePackageWithAI(
  data: PackageAnalysisResult
): Promise<AIPackageAnalysis> {
  const prompt = createAnalysisPrompt(data);

  const systemPrompt = 'You are an expert software engineer specialising in npm package evaluation. ' +
    'You analyse packages based on security, quality, maintenance, and popularity metrics. ' +
    'Provide honest, balanced assessments that help developers make informed decisions. ' +
    'Always respond in valid JSON format.';

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  // Try Gemini 2.5 Flash first
  try {
    console.log('Attempting analysis with Gemini 2.5 Flash...');
    const model = getAIModel('gemini-2.5-flash');
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();
    
    const aiAnalysis = parseAIResponse(text);
    aiAnalysis.model = 'Gemini 2.5 Flash';
    console.log('✓ Analysis completed with Gemini 2.5 Flash');
    return aiAnalysis;
  } catch (error: any) {
    // Check if it's a rate limit error (429)
    const isRateLimitError = error.message?.includes('429') || 
                             error.message?.includes('quota') || 
                             error.message?.includes('rate limit');
    
    if (isRateLimitError) {
      console.warn('⚠ Rate limit hit on Flash, falling back to Flash-Lite...');
      
      // Fallback to Gemini 2.5 Flash-Lite
      try {
        const fallbackModel = getAIModel('gemini-2.5-flash-lite');
        const result = await fallbackModel.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();
        
        const aiAnalysis = parseAIResponse(text);
        aiAnalysis.model = 'Gemini 2.5 Flash Lite';
        console.log('✓ Analysis completed with Gemini 2.5 Flash-Lite');
        return aiAnalysis;
      } catch (flashLiteError: any) {
        const isFlashLiteRateLimit = flashLiteError.message?.includes('429') || 
                                      flashLiteError.message?.includes('quota') || 
                                      flashLiteError.message?.includes('rate limit');
        
        if (isFlashLiteRateLimit) {
          console.warn('⚠ Flash-Lite also rate limited, falling back to Groq...');
          
          // Final fallback to Groq (14,400 requests/day)
          try {
            const groqClient = getGroqClient();
            const chatCompletion = await groqClient.chat.completions.create({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
              ],
              model: 'llama-3.3-70b-versatile', // Groq's best free production model (updated from 3.1)
              temperature: 0.7,
              max_tokens: 2048,
            });
            
            const text = chatCompletion.choices[0]?.message?.content || '';
            const aiAnalysis = parseAIResponse(text);
            aiAnalysis.model = 'Llama 3.3 70B (Groq)';
            console.log('✓ Analysis completed with Groq (Llama 3.3 70B)');
            return aiAnalysis;
          } catch (groqError: any) {
            console.error('Groq also failed:', groqError);
            throw new Error(`Failed to analyze package with AI (all providers): ${groqError.message}`);
          }
        } else {
          console.error('Flash-Lite failed (non-rate-limit):', flashLiteError);
          throw new Error(`Failed to analyze package with AI: ${flashLiteError.message}`);
        }
      }
    } else {
      // Non-rate-limit error, throw immediately
      console.error('AI analysis failed:', error);
      throw new Error(`Failed to analyze package with AI: ${error.message}`);
    }
  }
}

/**
 * Generate a quick summary for a package with fallback
 */
export async function generatePackageSummary(
  packageName: string,
  version: string,
  license: string,
  npmUrl: string,
  score: number
): Promise<string> {
  const prompt = `Package: ${packageName}
Version: ${version}
License: ${license}
URL: ${npmUrl}
Quality Score: ${score}/100

Generate a single concise sentence (max 20 words) summarizing if this package is good to use.`;

  // Try Flash first, fallback to Flash-Lite
  try {
    const model = getAIModel('gemini-2.5-flash');
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    const isRateLimitError = error.message?.includes('429') || 
                             error.message?.includes('quota') || 
                             error.message?.includes('rate limit');
    
    if (isRateLimitError) {
      try {
        const fallbackModel = getAIModel('gemini-2.5-flash-lite');
        const result = await fallbackModel.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (flashLiteError: any) {
        const isFlashLiteRateLimit = flashLiteError.message?.includes('429') || 
                                      flashLiteError.message?.includes('quota') || 
                                      flashLiteError.message?.includes('rate limit');
        
        if (isFlashLiteRateLimit) {
          try {
            const groqClient = getGroqClient();
            const chatCompletion = await groqClient.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: 'llama-3.3-70b-versatile',
              temperature: 0.7,
              max_tokens: 100,
            });
            return chatCompletion.choices[0]?.message?.content || `${packageName} v${version} - Quality score: ${score}/100`;
          } catch (groqError) {
            return `${packageName} v${version} - Quality score: ${score}/100`;
          }
        }
        return `${packageName} v${version} - Quality score: ${score}/100`;
      }
    }
    return `${packageName} v${version} - Quality score: ${score}/100`;
  }
}
