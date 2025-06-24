// src/app/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Brain, Loader2, TrendingUp, Trophy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Changed to false initially
  const router = useRouter();
  const supabase = createClient();

  const checkUser = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        // User not authenticated, redirect to login
        router.push("/login");
        return;
      }

      // Get user data from our database
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (error || !userData) {
        console.error("Error fetching user data:", error);
        router.push("/login");
        return;
      }

      setUser(userData);

      // Check if user has selected a league
      const { data: userLeagues } = await supabase
        .from('user_leagues')
        .select('*')
        .eq('user_id', userData.id)
        .eq('is_active', true);

      if (!userLeagues || userLeagues.length === 0) {
        // No active leagues, redirect to league selection
        router.push("/select-league");
        return;
      }

      // User has leagues, redirect to dashboard
      router.push("/dashboard");

    } catch (error) {
      console.error("Authentication check failed:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    checkUser();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <h1 className="text-5xl font-bold text-gray-900">
            Fantasy Football <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your intelligent fantasy football assistant. Get AI-powered trade analysis,
            waiver wire recommendations, and lineup optimization.
          </p>
          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Trade Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI-powered trade evaluation using real-time player values and projections
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Waiver Wire</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Smart pickup recommendations based on your team needs and player availability
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Trophy className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle>Lineup Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Weekly start/sit recommendations to maximize your scoring potential
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Brain className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Draft Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Real-time draft guidance and strategy recommendations for future drafts
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold">Connect Your League</h3>
                <p className="text-gray-600 text-sm">
                  Link your Sleeper account to import your team and league data
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold">Ask Your AI Assistant</h3>
                <p className="text-gray-600 text-sm">
                  Get personalized advice on trades, pickups, and lineup decisions
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h3 className="font-semibont">Dominate Your League</h3>
                <p className="text-gray-600 text-sm">
                  Make smarter decisions and climb the leaderboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}