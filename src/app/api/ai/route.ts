// api/ai/route.ts
import { generateTradeAnalysis } from "@/lib/ai/openai";
import { NextRequest, NextResponse } from "next/server";

function pruneData({ question, myRoster, allRosters, league, users }: {
  question: any,
  myRoster: any,
  allRosters: any[],
  league: any,
  users: any
}) {

  // Prune rosters
  const prunedRosters = allRosters.map((r: any) => ({
    roster_id: r.roster_id,
    owner_id: r.owner_id,
    starters: r.starters,
    players: r.players,
    settings: {
      wins: r.settings.wins,
      losses: r.settings.losses,
      fpts: r.settings.fpts,
    },
  }));

  // Prune users
  const prunedUsers: any = {};
  for (const uid in users) {
    const u = users[uid];
    prunedUsers[uid] = {
      user_id: u.user_id,
      display_name: u.display_name,
      username: u.username,
    };
  }

  // Prune league
  const prunedLeague = {
    name: league.name,
    season: league.season,
    scoring_settings: league.scoring_settings,
    roster_positions: league.roster_positions,
    settings: {
      playoff_teams: league.settings?.playoff_teams,
      type: league.settings?.type,
      waiver_type: league.settings?.waiver_type,
      trade_deadline: league.settings?.trade_deadline,
      playoff_week_start: league.settings?.playoff_week_start,
      max_keepers: league.settings?.max_keepers,
    },
  };

  return {
    question,
    myRoster,
    allRosters: prunedRosters,
    league: prunedLeague,
    users: prunedUsers,
  };
}

export async function POST(req: NextRequest) {
    try {
        console.log('AI API route called')
        
        // Add content type validation
        const contentType = req.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
            return NextResponse.json(
                { error: "Content-Type must be application/json" },
                { status: 400 }
            )
        }

        const body = await req.json()
        console.log('Request body:', body)
        
        const { question, myRoster, allRosters, league, users, useGPT4 } = body

        // Add input validation
        if (!question || !myRoster || !allRosters || !league || !users) {
            return NextResponse.json(
                { error: "Missing required data for AI analysis" },
                { status: 400 }
            )
        }

        const pruned = pruneData({ question, myRoster, allRosters, league, users });
        const result = await generateTradeAnalysis(pruned, useGPT4);
        
        console.log('AI result:', result)
        
        return NextResponse.json({ result })
        
    } catch (error: any) {
        console.error('API Route Error:', error)
        
        // More detailed error response
        return NextResponse.json(
            { 
                error: "AI analysis failed", 
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        )
    }
}