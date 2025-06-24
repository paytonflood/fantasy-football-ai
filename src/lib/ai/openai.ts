// src/lib/ai/openai.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Use the same env vars as your script
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateTradeAnalysis(
    data: any,
    useGPT4: boolean = false
) {
    // Add input validation
    if (!data) {
        throw new Error('Data is required');
    }

    // Add API key validation
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
    }

    const { question, myRoster, allRosters, league, users } = data;

    // 1. Collect all unique player IDs
    const allPlayerIds = new Set([
      ...(myRoster?.players || []),
      ...allRosters.flatMap((r: any) => r.players || [])
    ]);

    // 2. Fetch player info from Supabase
    const { data: playerInfos, error } = await supabase
      .from('players')
      .select('player_id, full_name, position, team')
      .in('player_id', Array.from(allPlayerIds));

    if (error) throw new Error('Failed to fetch player info from DB');

    // 3. Build a lookup map
    const playerMap: { [key: string]: string } = {};
    for (const p of playerInfos) {
      playerMap[p.player_id] = `${p.full_name} (${p.position}, ${p.team})`;
    }

    // 4. Replace player IDs with names in rosters
    interface PlayerInfo {
      player_id: string;
      full_name: string;
      position: string;
      team: string;
    }

    interface Roster {
      players?: string[];
      starters?: string[];
      [key: string]: any;
    }

    interface RosterWithNames extends Roster {
      players: string[];
      starters: string[];
    }

    function mapRosterPlayers(roster: Roster): RosterWithNames {
      return {
        ...roster,
        players: roster.players?.map((pid: string) => playerMap[pid] || pid) || [],
        starters: roster.starters?.map((pid: string) => playerMap[pid] || pid) || [],
      };
    }

    const myRosterWithNames = mapRosterPlayers(myRoster);
    const allRostersWithNames = allRosters.map(mapRosterPlayers);

    // 5. Build prompt with names, not IDs
    const model = useGPT4 ? 'gpt-4' : 'gpt-3.5-turbo';

    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content:
                        `You are a fantasy football expert. You are given a league, users, all rosters, my roster, and a question. Player names, positions, and teams are provided. Use only the data provided.`
                },
                {
                    role: 'user',
                    content:
                        `League Info: ${JSON.stringify(league)}
                            Users: ${JSON.stringify(users)}
                            All Rosters: ${JSON.stringify(allRostersWithNames)}
                            My Roster: ${JSON.stringify(myRosterWithNames)}
                            Question: ${question}`
                }
            ],
            max_tokens: 700,
            temperature: 0.7,
        });

        // Add response validation
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response from OpenAI');
        }

        return response.choices[0].message.content;
    } catch (error: any) {
        console.error('OpenAI API Error:', error)
        
        // Handle specific OpenAI errors
        if (error.status === 401) {
            throw new Error('Invalid OpenAI API key')
        } else if (error.status === 429) {
            throw new Error('OpenAI rate limit exceeded')
        } else if (error.status === 400) {
            throw new Error(`OpenAI API error: ${error.message}`)
        }
        
        throw error;
    }
}