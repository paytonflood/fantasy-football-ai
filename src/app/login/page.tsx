// src/app/login/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Trophy, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sleeperUsername, setSleeperUsername] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [showLeagues, setShowLeagues] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowLeagues(false);
    setLeagues([]);

    try {
      // Get user data from Sleeper using username
      const response = await fetch(`https://api.sleeper.app/v1/user/${sleeperUsername}`);
      
      if (!response.ok) {
        toast.error("Username not found. Please check your Sleeper username and try again.");
        return;
      }

      const user = await response.json();
      
      if (!user || !user.user_id) {
        toast.error("Invalid user data received from Sleeper.");
        return;
      }

      setUserData(user);

      // Get current season
      const currentSeason = getCurrentYear();
      
      // Fetch user's leagues for the current season
      const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/${currentSeason}`);
      
      if (!leaguesResponse.ok) {
        toast.error("Failed to fetch leagues. Please try again.");
        return;
      }

      const userLeagues = await leaguesResponse.json();
      
      if (!userLeagues || userLeagues.length === 0) {
        toast.error("No leagues found for this user in the current season.");
        return;
      }

      setLeagues(userLeagues);
      setShowLeagues(true);
      toast.success(`Found ${userLeagues.length} league${userLeagues.length > 1 ? 's' : ''}! Select one to continue.`);

    } catch (error) {
      console.error("Username lookup error:", error);
      toast.error("Failed to lookup username. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueSelect = async (league: League) => {
    setSelectedLeague(league);
    setIsLoading(true);

    try {
      // Store user and league data in the database
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          sleeper_user_id: userData.user_id,
          sleeper_username: userData.username || sleeperUsername,
          display_name: userData.display_name || userData.username || sleeperUsername,
          current_league_id: league.league_id,
          current_league_name: league.name,
        }, {
          onConflict: 'sleeper_user_id'
        });

      if (upsertError) {
        console.error("Database error:", upsertError);
        toast.error("Failed to save user data: " + upsertError.message);
        return;
      }

      toast.success(`Welcome to ${league.name}!`);
      
      // Redirect to league dashboard
      router.push(`/dashboard?leagueId=${league.league_id}&userId=${userData.user_id}`);

    } catch (error) {
      console.error("League selection error:", error);
      toast.error("Failed to select league. Please try again.");
    } finally {
      setIsLoading(false);
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
        return 'Active';
      case 'post_season':
        return 'Playoffs';
      case 'complete':
        return 'Finished';
      case 'pre_draft':
        return 'Pre-Draft';
      default:
        return status;
    }
  };

  const getCurrentYear = () => {
    const date = new Date();
    return date.getFullYear().toString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Fantasy Football AI</h1>
          <p className="text-gray-600">Your AI-powered fantasy football assistant</p>
        </div>

        {/* Username Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Enter Your Sleeper Username
            </CardTitle>
            <CardDescription>
              We'll find all your leagues and let you choose which one to manage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your Sleeper username"
                value={sleeperUsername}
                onChange={(e) => setSleeperUsername(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !sleeperUsername.trim()}
              >
                {isLoading ? "Finding Leagues..." : "Find My Leagues"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* League Selection Card */}
        {showLeagues && leagues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Select Your League
              </CardTitle>
              <CardDescription>
                Choose which league you want to manage with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leagues.map((league) => (
                  <div
                    key={league.league_id}
                    onClick={() => handleLeagueSelect(league)}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                            {league.name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeagueStatusColor(league.status)}`}>
                            {getLeagueStatusText(league.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{league.total_rosters} teams</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{league.season} Season</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-blue-600 group-hover:text-blue-700">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <div className="text-center space-y-2 text-sm text-gray-600">
          <p>
            <strong>Need help finding your username?</strong>
          </p>
          <p>
            Your Sleeper username is displayed in your profile or can be found in your profile URL
          </p>
        </div>
      </div>
    </div>
  );
}