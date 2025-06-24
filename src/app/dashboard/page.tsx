"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
    ArrowLeft,
    BarChart3,
    Brain,
    Calendar,
    Crown,
    Eye,
    Settings,
    Star,
    Target,
    Trophy,
    User,
    UserCheck,
    Users,
    X
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface League {
  league_id: string;
  name: string;
  total_rosters: number;
  status: string;
  season: string;
  scoring_settings: any;
  roster_positions: string[];
  settings: any;
  sport: string;
  season_type: string;
  draft_id: string;
}

interface Roster {
  roster_id: number;
  owner_id: string;
  users: any[];
  starters: string[];
  players: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_against: number;
  };
}

interface User {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
}

interface Player {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  age: number;
  years_exp: number;
  injury_status?: string;
}

interface PlayerStats {
  [key: string]: any;
}

type TabType = 'overview' | 'fantasy-ai' | 'my-team';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [users, setUsers] = useState<{[key: string]: User}>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myRoster, setMyRoster] = useState<Roster | null>(null);
  const [allPlayers, setAllPlayers] = useState<{[key: string]: Player}>({});
  const [playerStats, setPlayerStats] = useState<{[key: string]: PlayerStats}>({});
  const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const leagueId = searchParams.get('leagueId');
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (leagueId) {
      fetchLeagueData();
      fetchPlayerData();
    }
  }, [leagueId]);

  const fetchPlayerData = async () => {
    try {
      // Fetch all NFL players (this is cached data, updated weekly)
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        setAllPlayers(playersData);
      }
    } catch (error) {
      console.error("Failed to fetch player data:", error);
    }
  };

  const fetchLeagueData = async () => {
    setIsLoading(true);
    
    try {
      // Get current user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('sleeper_user_id', userId)
        .single();
      
      if (userError || !userData) {
        console.error("User query error:", userError);
        toast.error("Failed to get user data. Please login again.");
        return;
      }

      setCurrentUser(userData);

      // Fetch league details
      const leagueResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
      if (!leagueResponse.ok) {
        toast.error("Failed to fetch league details.");
        return;
      }
      const leagueData = await leagueResponse.json();
      setLeague(leagueData);

      // Fetch rosters
      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
      if (!rostersResponse.ok) {
        toast.error("Failed to fetch league rosters.");
        return;
      }
      const rostersData = await rostersResponse.json();
      setRosters(rostersData);

      // Find current user's roster
      const userRoster = rostersData.find((roster: Roster) => roster.owner_id === userId);
      setMyRoster(userRoster || null);

      // Fetch users for the league
      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`);
      if (!usersResponse.ok) {
        toast.error("Failed to fetch league users.");
        return;
      }
      const usersData = await usersResponse.json();
      
      // Convert users array to object for easy lookup
      const usersMap = usersData.reduce((acc: any, user: User) => {
        acc[user.user_id] = user;
        return acc;
      }, {});
      setUsers(usersMap);

    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load league data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayerInfo = (playerId: string): Player | null => {
    return allPlayers[playerId] || null;
  };

  const getRosterPlayers = (roster: Roster) => {
    if (!roster.players) return [];

    // Map players to objects
    const players = roster.players.map(playerId => {
        const player = getPlayerInfo(playerId);
        return {
        playerId,
        player,
        isStarter: roster.starters?.includes(playerId) || false
        };
    }).filter(p => p.player); // Filter out players we don't have data for

    // Sort starters by position order, leave bench as is
    const positionOrder = { QB: 1, RB: 2, WR: 3, TE: 4 };
    const starters = players
        .filter(p => p.isStarter)
        .sort((a, b) => {
        const aOrder = positionOrder[a.player?.position as keyof typeof positionOrder] || 99;
        const bOrder = positionOrder[b.player?.position as keyof typeof positionOrder] || 99;
        return aOrder - bOrder;
        });
    const bench = players.filter(p => !p.isStarter);

    // Return starters first, then bench
    return [...starters, ...bench];
  };

  const getPositionColor = (position?: string) => {
    switch (position) {
      case 'QB': return 'bg-red-100 text-red-800';
      case 'RB': return 'bg-green-100 text-green-800';
      case 'WR': return 'bg-blue-100 text-blue-800';
      case 'TE': return 'bg-purple-100 text-purple-800';
      case 'K': return 'bg-yellow-100 text-yellow-800';
      case 'DEF': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeagueStatusColor = (status: string) => {
    switch (status) {
      case 'in_season':
        return 'text-green-600 bg-green-50';
      case 'post_season':
        return 'text-blue-600 bg-blue-50';
      case 'finished':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-orange-600 bg-orange-50';
    }
  };

  const getLeagueStatusText = (status: string) => {
    switch (status) {
      case 'in_season':
        return 'Active Season';
      case 'post_season':
        return 'Playoffs';
      case 'finished':
        return 'Season Complete';
      case 'pre_draft':
        return 'Pre-Draft';
      default:
        return status;
    }
  };

  const getRosterWithUser = (roster: Roster) => {
    const user = users[roster.owner_id];
    return {
      ...roster,
      user: user || { display_name: 'Unknown User', username: 'unknown' }
    };
  };

  const getSortedRosters = () => {
    return rosters
      .map(getRosterWithUser)
      .sort((a, b) => {
        // Sort by wins first, then by points for
        if (a.settings.wins !== b.settings.wins) {
          return b.settings.wins - a.settings.wins;
        }
        return b.settings.fpts - a.settings.fpts;
      });
  };

  const TabButton = ({ tab, icon: Icon, label }: { tab: TabType; icon: any; label: string }) => (
    <Button
      variant={activeTab === tab ? "default" : "ghost"}
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 ${
        activeTab === tab ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );

  const RosterModal = ({ roster, onClose }: { roster: Roster; onClose: () => void }) => {
    const rosterPlayers = getRosterPlayers(roster);
    const user = users[roster.owner_id];
    
    const starters = rosterPlayers.filter(p => p.isStarter);
    const bench = rosterPlayers.filter(p => !p.isStarter);

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{user?.display_name || user?.username}'s Roster</h2>
                <p className="text-gray-600">
                  {roster.settings.wins}-{roster.settings.losses} • {roster.settings.fpts.toFixed(1)} PF
                </p>
              </div>
              <Button variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Starters */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Starting Lineup ({starters.length})
              </h3>
              <div className="space-y-2">
                {starters.map(({ playerId, player }) => (
                  <div key={playerId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionColor(player?.position)}`}>
                        {player?.position}
                      </span>
                      <div>
                        <p className="font-medium">{player?.full_name}</p>
                        <p className="text-sm text-gray-600">{player?.team} • {player?.years_exp} years exp</p>
                      </div>
                    </div>
                    {player?.injury_status && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                        {player?.injury_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bench */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Bench ({bench.length})
              </h3>
              <div className="space-y-2">
                {bench.map(({ playerId, player }) => (
                  <div key={playerId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionColor(player?.position)}`}>
                        {player?.position}
                      </span>
                      <div>
                        <p className="font-medium">{player?.full_name}</p>
                        <p className="text-sm text-gray-600">{player?.team} • {player?.years_exp} years exp</p>
                      </div>
                    </div>
                    {player?.injury_status && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                        {player?.injury_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <>
      {/* League Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Teams</p>
                <p className="text-xl font-bold">{league?.total_rosters}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Season</p>
                <p className="text-xl font-bold">{league?.season}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Playoff Teams</p>
                <p className="text-xl font-bold">{league?.settings?.playoff_teams || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-xl font-bold">{league?.settings?.type === 2 ? 'Dynasty' : 'Redraft'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* League Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            League Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-medium">Scoring Type</p>
              <p className="text-lg">{league?.scoring_settings?.rec ? 'PPR' : 'Standard'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Roster Positions</p>
              <p className="text-lg">{league?.roster_positions?.length || 0} positions</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Waiver Type</p>
              <p className="text-lg">{league?.settings?.waiver_type === 2 ? 'FAAB' : 'Rolling'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Trade Deadline</p>
              <p className="text-lg">Week {league?.settings?.trade_deadline || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Playoff Week Start</p>
              <p className="text-lg">Week {league?.settings?.playoff_week_start || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Max Keepers</p>
              <p className="text-lg">{league?.settings?.max_keepers || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standings with Roster View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Current Standings
          </CardTitle>
          <CardDescription>
            Teams ranked by wins, then by total points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getSortedRosters().map((roster, index) => (
              <div
                key={roster.roster_id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {index < 3 && (
                      <Crown className={`h-4 w-4 ${
                        index === 0 ? 'text-yellow-500' : 
                        index === 1 ? 'text-gray-400' : 
                        'text-amber-600'
                      }`} />
                    )}
                    <span className="font-semibold text-gray-500 w-6">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {roster.user.display_name || roster.user.username}
                      </p>
                      <p className="text-sm text-gray-600">
                        @{roster.user.username || 'unknown'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">
                        {roster.settings.wins}-{roster.settings.losses}
                      </p>
                      <p className="text-gray-600">W-L</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">
                        {roster.settings.fpts.toFixed(1)}
                      </p>
                      <p className="text-gray-600">PF</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRoster(roster);
                      setShowRosterModal(true);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View Roster
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          myRoster,
          allRosters: rosters,
          league,
          users
        }),
      });
      const data = await res.json();
      setAnswer(data.result);
    } catch (err) {
      setAnswer("Sorry, there was an error getting a response.");
    }
    setLoading(false);
  };

  const renderFantasyAITab = () => (
  <div className="space-y-6">
    {/* AI Assistant Header */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Fantasy AI Assistant
        </CardTitle>
        <CardDescription>
          Get personalized insights and advice for your fantasy football team
        </CardDescription>
      </CardHeader>
    </Card>

    {/* Quick Action Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setQuestion("Analyze my starting lineup for this week")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Star className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Lineup Analysis</p>
              <p className="text-sm text-gray-600">Get advice on your starters</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setQuestion("What trades should I consider?")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Trade Suggestions</p>
              <p className="text-sm text-gray-600">Find beneficial trades</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setQuestion("Who should I pick up from waivers?")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Target className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium">Waiver Wire</p>
              <p className="text-sm text-gray-600">Find hidden gems</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* AI Chat Interface */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Ask Your Question
        </CardTitle>
        <CardDescription>
          Ask about lineup decisions, trades, waivers, or any fantasy football strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <label htmlFor="ai-question" className="text-sm font-medium text-gray-700">
            What would you like to know about your team?
          </label>
          <textarea
            id="ai-question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Examples: 'Should I start player X or Y?', 'What positions do I need to improve?', 'How does my team compare to others?'"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Brain className="h-4 w-4" />
            <span>AI will analyze your league data</span>
          </div>
          <Button 
            onClick={handleAskAI} 
            disabled={loading || !question.trim()}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Thinking...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Ask AI
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* AI Response */}
    {answer && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-600" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {answer}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAnswer(null);
                setQuestion("");
              }}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Response
            </Button>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Sample Questions */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Sample Questions
        </CardTitle>
        <CardDescription>
          Not sure what to ask? Try these examples
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "How does my team stack up against the competition?",
            "Which of my bench players should I consider starting?",
            "What are my team's biggest weaknesses?",
            "Should I prioritize RB or WR in trades?",
            "Who are some good buy-low candidates?",
            "What's my playoff outlook based on current performance?"
          ].map((sampleQuestion, index) => (
            <Button
              key={index}
              variant="ghost"
              className="justify-start h-auto p-3 text-left hover:bg-blue-50"
              onClick={() => setQuestion(sampleQuestion)}
            >
              <div className="text-sm text-gray-700">
                "{sampleQuestion}"
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

  const renderMyTeamTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            My Team
          </CardTitle>
          <CardDescription>
            Your current roster and team performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myRoster ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{myRoster.settings.wins}</p>
                    <p className="text-sm text-gray-600">Wins</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{myRoster.settings.losses}</p>
                    <p className="text-sm text-gray-600">Losses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{myRoster.settings.fpts.toFixed(1)}</p>
                    <p className="text-sm text-gray-600">Points For</p>
                  </CardContent>
                </Card>
              </div>

              {/* Full Roster Display */}
              <div className="space-y-4">
                {/* Starting Lineup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Starting Lineup
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {getRosterPlayers(myRoster)
                        .filter(p => p.isStarter)
                        .map(({ playerId, player }) => (
                          <div key={playerId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionColor(player?.position)}`}>
                                {player?.position}
                              </span>
                              <div>
                                <p className="font-medium">{player?.full_name}</p>
                                <p className="text-sm text-gray-600">{player?.team} • {player?.years_exp} years exp</p>
                              </div>
                            </div>
                            {player?.injury_status && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                {player?.injury_status}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Bench */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-500" />
                      Bench
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {getRosterPlayers(myRoster)
                        .filter(p => !p.isStarter)
                        .map(({ playerId, player }) => (
                          <div key={playerId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionColor(player?.position)}`}>
                                {player?.position}
                              </span>
                              <div>
                                <p className="font-medium">{player?.full_name}</p>
                                <p className="text-sm text-gray-600">{player?.team} • {player?.years_exp} years exp</p>
                              </div>
                            </div>
                            {player?.injury_status && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                {player?.injury_status}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No roster found for your team.</p>
              <p className="text-sm text-gray-500 mt-2">
                Make sure you're a member of this league.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading league data...</p>
        </div>
      </div>
    );
  }


  if (!league) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-gray-600 mb-4">League not found or failed to load.</p>
            <Button onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Login
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{league.name}</h1>
            <p className="text-gray-600">Welcome back, {currentUser?.display_name || currentUser?.sleeper_username}!</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLeagueStatusColor(league.status)}`}>
              {getLeagueStatusText(league.status)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 pb-4">
          <TabButton tab="overview" icon={BarChart3} label="Overview" />
          <TabButton tab="fantasy-ai" icon={Brain} label="Fantasy AI" />
          <TabButton tab="my-team" icon={UserCheck} label="My Team" />
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'fantasy-ai' && renderFantasyAITab()}
          {activeTab === 'my-team' && renderMyTeamTab()}

        {/* Roster Modal */}
        {showRosterModal && selectedRoster && (
            <RosterModal
            roster={selectedRoster}
            onClose={() => setShowRosterModal(false)}
            />
        )}
        </div>
      </div>
    </div>
  );
}