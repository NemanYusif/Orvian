import { GoogleGenAI, Type } from '@google/genai';
import { ServerDB, ChatMessage } from '../server-db.js';

export interface StructuredResponse {
  title: string;
  planSteps: string[];
  todayTask: string;
  recommendation: string;
  suggestedTasks: Array<{
    title: string;
    description: string;
    date: string;
  }>;
}

export const aiMentorService = {
  /**
   * Generates a highly personalized, structured coaching response using Gemini.
   * Leverages memory of previous conversations, task completion rates, interests, and habits.
   */
  async generateCoachingResponse(
    userId: string,
    userName: string,
    message: string,
    isAz: boolean
  ): Promise<{ text: string; suggestedTasks: any[] }> {
    // 1. Gather task metrics for progress tracking and habit identification (AI Memory System)
    const tasks = ServerDB.getTasks(userId);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const missed = tasks.filter((t) => t.status === 'missed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const completedRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Analyze task topics to identify active interests/habits
    const topics = tasks.map(t => t.title.toLowerCase());
    const codingCount = topics.filter(t => t.includes('code') || t.includes('react') || t.includes('javascript') || t.includes('proqram') || t.includes('html') || t.includes('api')).length;
    const fitnessCount = topics.filter(t => t.includes('idman') || t.includes('qaç') || t.includes('fitness') || t.includes('sağlam') || t.includes('gym') || t.includes('workout')).length;
    const readingCount = topics.filter(t => t.includes('kitab') || t.includes('oxu') || t.includes('read') || t.includes('book') || t.includes('mütaliə')).length;

    let habitInsights = '';
    if (codingCount > 0) {
      habitInsights += isAz 
        ? `- Tez-tez proqramlaşdırma və texnoloji tapşırıqlar planlaşdırır (ümumi ${codingCount} tapşırıq).\n`
        : `- Frequently schedules coding & tech tasks (${codingCount} scheduled).\n`;
    }
    if (fitnessCount > 0) {
      habitInsights += isAz
        ? `- İdman, sağlamlıq və aktiv həyat vərdişlərinə diqqət yetirir (ümumi ${fitnessCount} tapşırıq).\n`
        : `- Focuses on fitness, health, and active life habits (${fitnessCount} scheduled).\n`;
    }
    if (readingCount > 0) {
      habitInsights += isAz
        ? `- Mütaliə və şəxsi inkişaf tapşırıqlarına üstünlük verir (ümumi ${readingCount} tapşırıq).\n`
        : `- Prioritizes reading and self-improvement tasks (${readingCount} scheduled).\n`;
    }
    
    if (missed > 0) {
      habitInsights += isAz
        ? `- Tarixçədə ${missed} buraxılmış tapşırıq var. Məqsədləri daha kiçik hissələrə bölməyə və davamlılığı qorumağa kömək edin.\n`
        : `- Has ${missed} missed tasks in history. Help guide them with smaller steps and consistent pacing.\n`;
    }

    if (completedRate >= 80) {
      habitInsights += isAz
        ? `- Əla nəticə göstərir: tapşırıqların icra dərəcəsi ${completedRate}%-dir.\n`
        : `- Outstanding performance pattern: task completion rate is ${completedRate}%.\n`;
    } else if (completedRate >= 50) {
      habitInsights += isAz
        ? `- Stabil templə irəliləyir, lakin inkişafa yer var: tapşırıqların icra dərəcəsi ${completedRate}%-dir.\n`
        : `- Steady progress but has room to grow: task completion rate is ${completedRate}%.\n`;
    } else {
      habitInsights += isAz
        ? `- Tapşırıq icra dərəcəsi aşağıdır (${completedRate}%). Tapşırıqların çətinliyindən yorulmuş ola bilər, daha sadə addımlar təklif edin.\n`
        : `- Low task completion rate (${completedRate}%). May be overwhelmed; propose simpler, hyper-actionable steps.\n`;
    }

    // 2. Fallback Response in case API key is missing or invalid
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      const defaultData: StructuredResponse = {
        title: isAz ? "🎯 React & Məhsuldarlıq Planı" : "🎯 React & Productivity Development",
        planSteps: isAz ? [
          "Vite və React quraşdırılmasını sınaqdan keçirin (15 dəqiqə)",
          "Əsas JSX qaydalarını və strukturunu oxuyun (15 dəqiqə)",
          "Sadə komponent yaradaraq props ötürülməsini tətbiq edin (20 dəqiqə)"
        ] : [
          "Configure Vite and initialize a React build (15 mins)",
          "Study basic JSX guidelines and nesting rules (15 mins)",
          "Practice simple state hooks or props transmission (20 mins)"
        ],
        todayTask: isAz 
          ? "İlk xüsusi React komponentini yazmaq və brauzerdə işə salmaq." 
          : "Write your first custom React component and render it on the browser.",
        recommendation: isAz
          ? "Kiçik və davamlı addımlarla başlamaq uğurun açarıdır. Hər gün yalnız 1 kiçik addım atın!"
          : "Consistency always wins over intensity. Take just one tiny bite-sized action today!",
        suggestedTasks: [
          {
            title: isAz ? "İlk React komponentini yazmaq" : "Write first React component",
            description: isAz ? "Sadə bir komponent yazın və props istifadəsini sınaqdan keçirin." : "Write a basic custom component and test props sharing.",
            date: "2026-07-01"
          }
        ]
      };

      const serialized = JSON.stringify({
        title: defaultData.title,
        planSteps: defaultData.planSteps,
        todayTask: defaultData.todayTask,
        recommendation: defaultData.recommendation
      });

      ServerDB.addChatMessage(userId, 'model', serialized);
      return { text: serialized, suggestedTasks: defaultData.suggestedTasks };
    }

    // 3. Initialize Gemini SDK
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // 4. Retrieve chat history for memory context (last 15 messages)
    const fullHistory = ServerDB.getChatHistory(userId).slice(-15);

    // Build rich, structured system instructions for the coach
    const systemInstruction = `You are "Mentor AI", an elite, premium personal productivity coach and task planner.
The user's name is "${userName}". Address them naturally.
The current date is "2026-07-01" (Wednesday).

Your core mission is to act as a supportive, highly intelligent Mentor AI. Help the user optimize their habits, learn complex skills step-by-step, and stay motivated.
Always tailor your suggestions to the user's specific context, history, and current performance metrics.

CRITICAL INSTRUCTIONS FOR PERSONALISED RESPONSE:
- Analyze the user's progress and habits provided below. Reference or adapt your style based on their completion rates or interests if relevant (but keep it brief).
- Be supportive, expert, and direct. Avoid generic filler words or robotic greetings.
- Keep the steps and goals realistic.

You MUST respond in ${isAz ? 'Azerbaijani' : 'English'}.

You MUST strictly output your response as a valid JSON object matching the requested schema. Do not write any markdown outside the JSON.

User Progress & Habit Context:
- Total tasks scheduled in Orvian: ${total}
- Completed tasks: ${completed}
- Missed tasks: ${missed}
- Current pending tasks: ${pending}
- Performance/Habit Insights:
${habitInsights}
`;

    const contents = [
      ...fullHistory.map((m) => {
        // Prepare chat history
        let textToSend = m.text;
        // If stored text is serialized JSON, try to extract the user friendly title or recommendation for history
        try {
          const parsed = JSON.parse(m.text);
          textToSend = `[Coaching Report] Title: ${parsed.title}. Recommendation: ${parsed.recommendation}`;
        } catch {
          // keep as is
        }

        return {
          role: m.role === 'model' ? ('model' as const) : ('user' as const),
          parts: [{ text: textToSend }],
        };
      }),
      {
        role: 'user' as const,
        parts: [{ text: message.trim() }],
      }
    ];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'A brief, highly motivating, personal, and customized title for this coaching response.'
              },
              planSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'A 2-4 step actionable sequence or plan directly addressing their query and incorporating productivity principles.'
              },
              todayTask: {
                type: Type.STRING,
                description: 'The single most critical and small task they should complete today to make progress.'
              },
              recommendation: {
                type: Type.STRING,
                description: 'A brief, impactful, personalized tip or recommendation based on their habits and statistics.'
              },
              suggestedTasks: {
                type: Type.ARRAY,
                description: 'Tasks that the user can add to their task list. Max 1-2 items. Always specify date as "2026-07-01".',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Short task title (max 4-5 words)' },
                    description: { type: Type.STRING, description: 'Brief description of what to do' },
                    date: { type: Type.STRING, description: 'YYYY-MM-DD format (use "2026-07-01")' }
                  },
                  required: ['title', 'description', 'date']
                }
              }
            },
            required: ['title', 'planSteps', 'todayTask', 'recommendation']
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        
        const textToSave = JSON.stringify({
          title: parsed.title,
          planSteps: parsed.planSteps,
          todayTask: parsed.todayTask,
          recommendation: parsed.recommendation
        });

        // Add to db
        ServerDB.addChatMessage(userId, 'model', textToSave);

        return {
          text: textToSave,
          suggestedTasks: parsed.suggestedTasks || []
        };
      }
    } catch (err) {
      console.error('Error generating coaching response from Gemini SDK:', err);
    }

    // Robust text-based or error fallback that matches JSON format
    const fallbackData: StructuredResponse = {
      title: isAz ? "🎯 Məhsuldarlıq və Konsentrasiya" : "🎯 Staying Focused Today",
      planSteps: isAz ? [
        "Siyahınızdakı ən vacib 1 tapşırığı seçin",
        "Bütün diqqətdağıdıcı amilləri uzaqlaşdırın (məsələn, telefonu səssizə alın)",
        "25 dəqiqəlik fasiləsiz iş rejimi qurun"
      ] : [
        "Pick the absolute single most important task on your list.",
        "Remove all notifications and side distractions.",
        "Commit to a single 25-minute undistracted work interval."
      ],
      todayTask: isAz 
        ? "Günün əsas məqsədini təyin etmək və ona fokuslanmaq."
        : "Define your core objective for today and tackle it first.",
      recommendation: isAz
        ? "Hər bir böyük uğur kiçik addımların cəmindən ibarətdir. İndi başlayın!"
        : "A mountain is climbed one step at a time. Do your first step now!",
      suggestedTasks: []
    };

    const fallbackSerialized = JSON.stringify({
      title: fallbackData.title,
      planSteps: fallbackData.planSteps,
      todayTask: fallbackData.todayTask,
      recommendation: fallbackData.recommendation
    });

    ServerDB.addChatMessage(userId, 'model', fallbackSerialized);
    return { text: fallbackSerialized, suggestedTasks: [] };
  }
};
